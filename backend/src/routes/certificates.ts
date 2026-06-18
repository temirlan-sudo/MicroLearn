import { Router, Request, Response } from "express"
import path from "path"
import fs from "fs"
import { CertificateStatus, Plan, Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { verifyAccess, requireRole } from "../middleware/auth"
import { generateCertificatePdf, issueCertificate } from "../services/certificate.service"
import { courseProgressPercent } from "../services/progress.service"
import { env } from "../lib/env"
import { writeAuditLog } from "../services/audit-log.service"

const router = Router()

router.get(
  "/my",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const certs = await prisma.certificate.findMany({
      where: { userId: req.user!.id },
      orderBy: { issuedAt: "desc" },
      include: { course: { select: { id: true, title: true, coverUrl: true } } },
    })
    res.json({ data: certs })
  }),
)

router.get(
  "/verify/:code",
  asyncHandler(async (req: Request, res: Response) => {
    const cert = await prisma.certificate.findUnique({
      where: { verificationCode: req.params.code },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, title: true, teacher: { select: { name: true } } } },
        revokedBy: { select: { id: true, name: true, email: true } },
      },
    })
    if (!cert) throw new HttpError(404, "Certificate not found")

    res.json({
      data: {
        id: cert.id,
        verificationCode: cert.verificationCode,
        status: cert.status,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt,
        student: cert.user,
        course: cert.course,
        revokedBy: cert.revokedBy,
      },
    })
  }),
)

router.get(
  "/:id/download",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } })
    if (!cert) throw new HttpError(404, "Certificate not found")
    if (cert.userId !== req.user!.id) throw new HttpError(403, "Not your certificate")
    if (cert.status === CertificateStatus.REVOKED) throw new HttpError(403, "Certificate revoked")

    const [user, course] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: cert.userId } }),
      prisma.course.findUniqueOrThrow({
        where: { id: cert.courseId },
        include: { teacher: true },
      }),
    ])
    const { fileUrl } = await generateCertificatePdf({
      userName: user.name,
      courseTitle: course.title,
      teacherName: course.teacher.name,
      issuedAt: cert.issuedAt,
      verificationCode: cert.verificationCode,
    })
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { fileUrl },
    })
    const rel = fileUrl.replace(/^\/uploads\//, "")
    const abs = path.resolve(env.UPLOAD_DIR, rel)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${cert.id}.pdf"`)
    fs.createReadStream(abs).pipe(res)
  }),
)

router.post(
  "/generate/:courseId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })
    if (user.plan !== Plan.PREMIUM) {
      throw new HttpError(403, "Certificates are a PREMIUM feature")
    }
    const percent = await courseProgressPercent(user.id, req.params.courseId)
    if (percent < 100) throw new HttpError(400, "Course not fully completed yet")

    const fileUrl = await issueCertificate(user.id, req.params.courseId)
    await writeAuditLog({
      req,
      action: "certificate.generated",
      entityType: "Certificate",
      entityId: req.params.courseId,
      metadata: { courseId: req.params.courseId },
    })
    res.status(201).json({ data: { fileUrl } })
  }),
)

router.patch(
  "/:id/revoke",
  verifyAccess,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const cert = await prisma.certificate.update({
      where: { id: req.params.id },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: req.user!.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    })
    await writeAuditLog({
      req,
      action: "certificate.revoked",
      entityType: "Certificate",
      entityId: cert.id,
      metadata: { verificationCode: cert.verificationCode, userId: cert.userId },
    })
    res.json({ data: cert })
  }),
)

export default router

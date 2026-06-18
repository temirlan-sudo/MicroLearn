import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { writeAuditLog } from "../services/audit-log.service"

const router = Router()

const createReportSchema = z.object({
  reason: z.string().min(3).max(160),
  details: z.string().min(10).max(2000),
  courseId: z.string().min(1).nullable().optional(),
})

const reportInclude = {
  reporter: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true, status: true } },
} as const

router.get(
  "/my",
  verifyAccess,
  requireRole(Role.STUDENT, Role.TEACHER, Role.USER),
  asyncHandler(async (req: Request, res: Response) => {
    const reports = await prisma.moderationReport.findMany({
      where: { reporterId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: reportInclude,
    })
    res.json({ data: reports })
  }),
)

router.get(
  "/:id",
  verifyAccess,
  requireRole(Role.STUDENT, Role.TEACHER, Role.USER),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await prisma.moderationReport.findUnique({
      where: { id: req.params.id },
      include: reportInclude,
    })
    if (!report) throw new HttpError(404, "Report not found")
    if (report.reporterId !== req.user!.id) throw new HttpError(403, "Forbidden")
    res.json({ data: report })
  }),
)

router.post(
  "/",
  verifyAccess,
  requireRole(Role.STUDENT, Role.TEACHER, Role.USER),
  validate(createReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const courseId = req.body.courseId ?? null
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      })
      if (!course) throw new HttpError(404, "Course not found")
    }

    const report = await prisma.moderationReport.create({
      data: {
        reporterId: req.user!.id,
        courseId,
        reason: req.body.reason.trim(),
        details: req.body.details.trim(),
      },
      include: reportInclude,
    })

    await writeAuditLog({
      req,
      action: "report.created",
      entityType: "ModerationReport",
      entityId: report.id,
      metadata: { status: report.status, courseId },
    })

    res.status(201).json({ data: report })
  }),
)

export default router

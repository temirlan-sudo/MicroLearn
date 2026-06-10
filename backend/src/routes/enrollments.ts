import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { assertCanEnroll, planFor } from "../services/plan.service"
import { courseProgressPercent } from "../services/progress.service"
import { sendEnrollment } from "../services/email.service"
import { emitToUser } from "../socket"
import { writeAuditLog } from "../services/audit-log.service"

const router = Router()

const enrollSchema = z.object({
  courseId: z.string().min(1),
})

router.post(
  "/",
  verifyAccess,
  requireRole(Role.STUDENT, Role.USER),
  validate(enrollSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { courseId } = req.body

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (existing) throw new HttpError(409, "Already enrolled")

    await assertCanEnroll(userId, courseId)

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId },
      include: { course: { select: { id: true, title: true, teacherId: true } } },
    })

    const [user, teacherNotifs] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.notification.create({
        data: {
          userId: enrollment.course.teacherId,
          type: "ENROLLMENT",
          title: "New enrollment",
          body: `A new student enrolled in "${enrollment.course.title}".`,
        },
      }),
    ])

    sendEnrollment(user.email, user.name, enrollment.course.title).catch(() => undefined)
    emitToUser(enrollment.course.teacherId, "notification:new", teacherNotifs)
    await writeAuditLog({
      req,
      action: "course.enrolled",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: { courseId },
    })

    res.status(201).json({ data: enrollment })
  }),
)

router.delete(
  "/:courseId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { courseId } = req.params

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (!existing) throw new HttpError(404, "Not enrolled")

    await prisma.enrollment.delete({ where: { id: existing.id } })
    await writeAuditLog({
      req,
      action: "course.unenrolled",
      entityType: "Enrollment",
      entityId: existing.id,
      metadata: { courseId },
    })
    res.status(204).end()
  }),
)

router.get(
  "/my",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, name: true, avatarUrl: true } },
            _count: { select: { modules: true } },
          },
        },
      },
    })

    const withProgress = await Promise.all(
      enrollments.map(async (e) => ({
        ...e,
        progressPercent: await courseProgressPercent(userId, e.courseId),
      })),
    )

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const plan = planFor(user.plan)

    res.json({ data: withProgress, meta: { adBanner: plan.adBanner } })
  }),
)

export default router

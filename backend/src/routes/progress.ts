import { Router, Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { verifyAccess } from "../middleware/auth"
import { courseProgressDetailed, markLessonComplete } from "../services/progress.service"
import { writeAuditLog } from "../services/audit-log.service"

const router = Router()

router.post(
  "/lesson/:lessonId/complete",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: { module: { select: { courseId: true } } },
    })
    if (!lesson) throw new HttpError(404, "Lesson not found")

    const enr = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: lesson.module.courseId } },
    })
    if (!enr) throw new HttpError(403, "Enroll in the course to track progress")

    const result = await markLessonComplete(req.user!.id, req.params.lessonId)
    await writeAuditLog({
      req,
      action: "lesson.completed",
      entityType: "Lesson",
      entityId: req.params.lessonId,
      metadata: { courseId: lesson.module.courseId, percent: result.percent },
    })
    res.json({ data: result })
  }),
)

router.get(
  "/course/:courseId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const detail = await courseProgressDetailed(req.user!.id, req.params.courseId)
    res.json({ data: detail })
  }),
)

export default router

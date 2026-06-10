import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import {
  answerAdaptiveReview,
  assertCanManageAdaptiveCourse,
  cardSelect,
  getDailyChallenge,
  getStudentWeakTopics,
  getTeacherAdaptiveInsights,
} from "../services/adaptive.service"

export const adaptiveRouter = Router()
export const teacherAdaptiveRouter = Router()

const answerSchema = z.object({
  correct: z.boolean(),
})

const cardSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1).nullable().optional(),
  topic: z.string().min(2).max(80),
  front: z.string().min(3).max(600),
  back: z.string().min(3).max(1200),
  hint: z.string().max(600).nullable().optional(),
})

const cardUpdateSchema = cardSchema.partial().omit({ courseId: true })

async function assertLessonBelongsToCourse(lessonId: string | null | undefined, courseId: string) {
  if (!lessonId) return
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  })
  if (!lesson) throw new HttpError(404, "Lesson not found")
  if (lesson.module.courseId !== courseId) throw new HttpError(400, "Lesson is not in this course")
}

adaptiveRouter.get(
  "/weak-topics",
  verifyAccess,
  requireRole(Role.STUDENT),
  asyncHandler(async (req: Request, res: Response) => {
    const topics = await getStudentWeakTopics(req.user!.id)
    res.json({ data: topics })
  }),
)

adaptiveRouter.get(
  "/daily-challenge",
  verifyAccess,
  requireRole(Role.STUDENT),
  asyncHandler(async (req: Request, res: Response) => {
    const challenge = await getDailyChallenge(req.user!.id)
    res.json({ data: challenge })
  }),
)

adaptiveRouter.post(
  "/review/:id/answer",
  verifyAccess,
  requireRole(Role.STUDENT),
  validate(answerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const review = await answerAdaptiveReview({
      req,
      studentId: req.user!.id,
      reviewId: req.params.id,
      correct: req.body.correct,
    })
    res.json({ data: review })
  }),
)

adaptiveRouter.get(
  "/cards",
  verifyAccess,
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const courseId = String(req.query.courseId ?? "")
    if (!courseId) throw new HttpError(400, "courseId is required")
    await assertCanManageAdaptiveCourse(courseId, req.user!)
    const cards = await prisma.microlearningCard.findMany({
      where: { courseId },
      orderBy: [{ topic: "asc" }, { createdAt: "desc" }],
      select: cardSelect(),
    })
    res.json({ data: cards })
  }),
)

adaptiveRouter.post(
  "/cards",
  verifyAccess,
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(cardSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await assertCanManageAdaptiveCourse(req.body.courseId, req.user!)
    await assertLessonBelongsToCourse(req.body.lessonId, req.body.courseId)
    const card = await prisma.microlearningCard.create({
      data: {
        courseId: req.body.courseId,
        lessonId: req.body.lessonId ?? null,
        topic: req.body.topic.trim(),
        front: req.body.front.trim(),
        back: req.body.back.trim(),
        hint: req.body.hint?.trim() || null,
        createdById: req.user!.id,
      },
      select: cardSelect(),
    })
    res.status(201).json({ data: card })
  }),
)

adaptiveRouter.patch(
  "/cards/:id",
  verifyAccess,
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(cardUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.microlearningCard.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new HttpError(404, "Card not found")
    await assertCanManageAdaptiveCourse(existing.courseId, req.user!)
    await assertLessonBelongsToCourse(req.body.lessonId, existing.courseId)
    const card = await prisma.microlearningCard.update({
      where: { id: req.params.id },
      data: {
        lessonId: req.body.lessonId === undefined ? undefined : req.body.lessonId,
        topic: req.body.topic?.trim(),
        front: req.body.front?.trim(),
        back: req.body.back?.trim(),
        hint: req.body.hint === undefined ? undefined : req.body.hint?.trim() || null,
      },
      select: cardSelect(),
    })
    res.json({ data: card })
  }),
)

adaptiveRouter.delete(
  "/cards/:id",
  verifyAccess,
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.microlearningCard.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new HttpError(404, "Card not found")
    await assertCanManageAdaptiveCourse(existing.courseId, req.user!)
    await prisma.microlearningCard.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)

teacherAdaptiveRouter.get(
  "/course/:courseId/insights",
  verifyAccess,
  requireRole(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const insights = await getTeacherAdaptiveInsights(req.params.courseId, req.user!)
    res.json({ data: insights })
  }),
)

export default adaptiveRouter

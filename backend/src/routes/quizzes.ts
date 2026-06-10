import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { assertCanStudyLesson } from "../services/learning-access.service"
import { gradeQuizAttempt, QuizAnswer } from "../services/quiz.service"
import { writeAuditLog } from "../services/audit-log.service"
import { processQuizAttemptForAdaptive } from "../services/adaptive.service"

const router = Router()

const attemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.union([z.string(), z.array(z.string()).min(1)]),
    }),
  ),
})

router.get(
  "/lesson/:lessonId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await assertCanStudyLesson(req.params.lessonId, req.user!.id, req.user!.role)
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: req.params.lessonId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            text: true,
            topic: true,
            options: true,
            points: true,
            order: true,
          },
        },
        attempts: {
          where: req.user!.role === Role.STUDENT ? { userId: req.user!.id } : undefined,
          orderBy: { createdAt: "desc" },
          take: req.user!.role === Role.STUDENT ? 3 : 10,
        },
      },
    })
    res.json({ data: quiz })
  }),
)

router.post(
  "/:id/attempts",
  verifyAccess,
  requireRole(Role.STUDENT),
  validate(attemptSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { order: "asc" } },
        lesson: { include: { module: { select: { courseId: true } } } },
      },
    })
    if (!quiz) throw new HttpError(404, "Quiz not found")
    await assertCanStudyLesson(quiz.lessonId, req.user!.id, req.user!.role)

    const answers = req.body.answers as QuizAnswer[]
    const graded = gradeQuizAttempt(quiz.questions, answers)
    const percent = graded.maxScore ? Math.round((graded.score / graded.maxScore) * 100) : 0
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: req.user!.id,
        answers,
        score: graded.score,
        maxScore: graded.maxScore,
        passed: percent >= quiz.passingScore,
      },
    })

    await writeAuditLog({
      req,
      action: "quiz.attempted",
      entityType: "QuizAttempt",
      entityId: attempt.id,
      metadata: { quizId: quiz.id, score: attempt.score, passed: attempt.passed },
    })

    await processQuizAttemptForAdaptive({
      req,
      studentId: req.user!.id,
      quiz,
      results: graded.results,
    })

    res.status(201).json({ data: { ...attempt, percent, results: graded.results } })
  }),
)

export default router

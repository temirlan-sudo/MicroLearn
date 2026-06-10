import { Router, Request, Response } from "express"
import { z } from "zod"
import { AssignmentStatus, Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { assertCanStudyLesson, assertTeacherOwnsLesson } from "../services/learning-access.service"
import { writeAuditLog } from "../services/audit-log.service"

const router = Router()

const submitSchema = z.object({
  content: z.string().min(10).max(8000),
})

const reviewSchema = z.object({
  status: z.nativeEnum(AssignmentStatus),
  score: z.number().int().min(0).max(100).optional(),
  feedback: z.string().min(3).max(4000),
})

router.get(
  "/lesson/:lessonId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await assertCanStudyLesson(req.params.lessonId, req.user!.id, req.user!.role)
    const assignment = await prisma.assignment.findUnique({
      where: { lessonId: req.params.lessonId },
      include: {
        submissions: {
          where: req.user!.role === Role.STUDENT ? { userId: req.user!.id } : undefined,
          orderBy: { submittedAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            reviewer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
    res.json({ data: assignment })
  }),
)

router.post(
  "/:id/submissions",
  verifyAccess,
  requireRole(Role.STUDENT),
  validate(submitSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { lesson: true },
    })
    if (!assignment) throw new HttpError(404, "Assignment not found")
    await assertCanStudyLesson(assignment.lessonId, req.user!.id, req.user!.role)

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId: req.user!.id } },
      create: {
        assignmentId: assignment.id,
        userId: req.user!.id,
        content: req.body.content,
      },
      update: {
        content: req.body.content,
        status: AssignmentStatus.SUBMITTED,
        score: null,
        feedback: null,
        reviewerId: null,
        reviewedAt: null,
        submittedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    })

    await writeAuditLog({
      req,
      action: "assignment.submitted",
      entityType: "AssignmentSubmission",
      entityId: submission.id,
      metadata: { assignmentId: assignment.id },
    })

    res.status(201).json({ data: submission })
  }),
)

router.get(
  "/:id/submissions",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } })
    if (!assignment) throw new HttpError(404, "Assignment not found")
    await assertTeacherOwnsLesson(assignment.lessonId, req.user!.id)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    })
    res.json({ data: submissions })
  }),
)

router.patch(
  "/submissions/:id/review",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(reviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const current = await prisma.assignmentSubmission.findUnique({
      where: { id: req.params.id },
      include: { assignment: true },
    })
    if (!current) throw new HttpError(404, "Submission not found")
    await assertTeacherOwnsLesson(current.assignment.lessonId, req.user!.id)

    const submission = await prisma.assignmentSubmission.update({
      where: { id: current.id },
      data: {
        status: req.body.status,
        score: req.body.status === AssignmentStatus.REVIEWED ? req.body.score : null,
        feedback: req.body.feedback,
        reviewerId: req.user!.id,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    })

    await writeAuditLog({
      req,
      action: "assignment.reviewed",
      entityType: "AssignmentSubmission",
      entityId: submission.id,
      metadata: { status: submission.status, score: submission.score },
    })

    res.json({ data: submission })
  }),
)

export default router

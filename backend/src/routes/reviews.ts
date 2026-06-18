import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"

const router = Router()

const createSchema = z.object({
  courseId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

const updateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
})

router.post(
  "/",
  verifyAccess,
  requireRole(Role.STUDENT, Role.USER),
  validate(createSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { courseId, rating, comment } = req.body

    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (!enrolled) throw new HttpError(403, "Must be enrolled to review")

    const existing = await prisma.review.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (existing) throw new HttpError(409, "You already reviewed this course")

    const review = await prisma.review.create({
      data: { userId, courseId, rating, comment },
    })
    res.status(201).json({ data: review })
  }),
)

router.patch(
  "/:id",
  verifyAccess,
  validate(updateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, "Review not found")
    if (review.userId !== req.user!.id) throw new HttpError(403, "Not your review")

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: req.body,
    })
    res.json({ data: updated })
  }),
)

router.delete(
  "/:id",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, "Review not found")
    if (review.userId !== req.user!.id) throw new HttpError(403, "Not your review")

    await prisma.review.delete({ where: { id: review.id } })
    res.status(204).end()
  }),
)

router.get(
  "/course/:courseId",
  asyncHandler(async (req: Request, res: Response) => {
    const reviews = await prisma.review.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    res.json({ data: reviews })
  }),
)

export default router

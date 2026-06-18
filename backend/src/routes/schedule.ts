import { Router, Request, Response } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess } from "../middleware/auth"

const router = Router()

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(timeRegex, "Время в формате HH:MM"),
  title: z.string().min(1).max(200),
  courseId: z.string().min(1).optional().nullable(),
})

const updateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  time: z.string().regex(timeRegex, "Время в формате HH:MM").optional(),
  title: z.string().min(1).max(200).optional(),
  courseId: z.string().min(1).optional().nullable(),
})

router.get(
  "/my",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const items = await prisma.scheduleItem.findMany({
      where: { userId: req.user!.id },
      include: { course: { select: { id: true, title: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
    })
    res.json({ data: items })
  }),
)

router.post(
  "/",
  verifyAccess,
  validate(createSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { dayOfWeek, time, title, courseId } = req.body

    if (courseId) {
      const enrolled = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      })
      if (!enrolled) throw new HttpError(403, "Курс не входит в ваши enrollments")
    }

    const item = await prisma.scheduleItem.create({
      data: { userId, dayOfWeek, time, title, courseId: courseId ?? null },
      include: { course: { select: { id: true, title: true } } },
    })
    res.status(201).json({ data: item })
  }),
)

router.patch(
  "/:id",
  verifyAccess,
  validate(updateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const existing = await prisma.scheduleItem.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== userId) throw new HttpError(404, "Не найдено")

    const item = await prisma.scheduleItem.update({
      where: { id: req.params.id },
      data: req.body,
      include: { course: { select: { id: true, title: true } } },
    })
    res.json({ data: item })
  }),
)

router.delete(
  "/:id",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const existing = await prisma.scheduleItem.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== userId) throw new HttpError(404, "Не найдено")

    await prisma.scheduleItem.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)

export default router
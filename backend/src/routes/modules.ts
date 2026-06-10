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
  title: z.string().min(2).max(150),
  order: z.number().int().min(0),
})

const updateSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  order: z.number().int().min(0).optional(),
})

async function assertOwnsCourse(courseId: string, userId: string) {
  const c = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
  if (!c) throw new HttpError(404, "Course not found")
  if (c.teacherId !== userId) throw new HttpError(403, "Not your course")
}

router.post(
  "/",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(createSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await assertOwnsCourse(req.body.courseId, req.user!.id)
    const module = await prisma.module.create({ data: req.body })
    res.status(201).json({ data: module })
  }),
)

router.patch(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(updateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const mod = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: { course: { select: { teacherId: true } } },
    })
    if (!mod) throw new HttpError(404, "Module not found")
    if (mod.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your module")

    const updated = await prisma.module.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ data: updated })
  }),
)

router.delete(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    const mod = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: { course: { select: { teacherId: true } } },
    })
    if (!mod) throw new HttpError(404, "Module not found")
    if (mod.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your module")

    await prisma.lessonProgress.deleteMany({ where: { lesson: { moduleId: mod.id } } })
    await prisma.module.delete({ where: { id: mod.id } })
    res.status(204).end()
  }),
)

export default router

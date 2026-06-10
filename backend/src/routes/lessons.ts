import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role, LessonType } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { uploadAny, publicUrl } from "../middleware/upload"

const router = Router()

const createSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(2).max(200),
  type: z.nativeEnum(LessonType),
  order: z.number().int().min(0),
  content: z.string().max(10000).optional(),
  duration: z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  type: z.nativeEnum(LessonType).optional(),
  order: z.number().int().min(0).optional(),
  content: z.string().max(10000).optional(),
  duration: z.number().int().min(0).nullable().optional(),
})

async function getLessonWithCourse(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { id: true, teacherId: true } } } } },
  })
  if (!lesson) throw new HttpError(404, "Lesson not found")
  return lesson
}

router.post(
  "/",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(createSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const mod = await prisma.module.findUnique({
      where: { id: req.body.moduleId },
      include: { course: { select: { teacherId: true } } },
    })
    if (!mod) throw new HttpError(404, "Module not found")
    if (mod.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your module")
    const lesson = await prisma.lesson.create({ data: req.body })
    res.status(201).json({ data: lesson })
  }),
)

router.patch(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(updateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const lesson = await getLessonWithCourse(req.params.id)
    if (lesson.module.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your lesson")
    const updated = await prisma.lesson.update({ where: { id: lesson.id }, data: req.body })
    res.json({ data: updated })
  }),
)

router.post(
  "/:id/upload",
  verifyAccess,
  requireRole(Role.TEACHER),
  uploadAny.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new HttpError(400, "No file uploaded")
    const lesson = await getLessonWithCourse(req.params.id)
    if (lesson.module.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your lesson")
    const url = publicUrl(req.file.filename)
    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: { content: url },
    })
    res.json({ data: updated })
  }),
)

router.delete(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    const lesson = await getLessonWithCourse(req.params.id)
    if (lesson.module.course.teacherId !== req.user!.id) throw new HttpError(403, "Not your lesson")
    await prisma.lessonProgress.deleteMany({ where: { lessonId: lesson.id } })
    await prisma.lesson.delete({ where: { id: lesson.id } })
    res.status(204).end()
  }),
)

router.get(
  "/:id/content",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const lesson = await getLessonWithCourse(req.params.id)
    const userId = req.user!.id
    const isTeacher = lesson.module.course.teacherId === userId
    if (!isTeacher) {
      const enr = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.module.course.id } },
      })
      if (!enr) throw new HttpError(403, "Enroll in the course to view this lesson")
    }
    res.json({
      data: {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        order: lesson.order,
        duration: lesson.duration,
        content: lesson.content,
        moduleId: lesson.moduleId,
      },
    })
  }),
)

export default router

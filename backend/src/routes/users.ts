import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess } from "../middleware/auth"
import { uploadImage, publicUrl } from "../middleware/upload"

const router = Router()

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  plan: true,
  avatarUrl: true,
  age: true,
  country: true,
  education: true,
  learningGoal: true,
  bio: true,
  createdAt: true,
}

const updateMeSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  age: z.number().int().min(5).max(120).optional(),
  country: z.string().max(80).optional(),
  education: z.string().max(120).optional(),
  learningGoal: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
})

// List all teachers
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
      select: {
        ...publicUserSelect,
        taughtCourses: {
          where: { status: "PUBLISHED" },
          select: { id: true, reviews: { select: { rating: true } } },
        },
      },
    })

    const data = teachers.map((t) => {
      const courses = t.taughtCourses
      const allRatings = courses.flatMap((c) => c.reviews.map((r) => r.rating))
      const avgRating =
        allRatings.length > 0
          ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
          : 0
      const { taughtCourses: _c, ...rest } = t
      return { ...rest, courseCount: courses.length, avgRating }
    })

    res.json({ data })
  }),
)

router.patch(
  "/me",
  verifyAccess,
  validate(updateMeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: publicUserSelect,
    })
    res.json({ data: user })
  }),
)

router.post(
  "/me/avatar",
  verifyAccess,
  uploadImage.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new HttpError(400, "No file uploaded")
    const avatarUrl = publicUrl(req.file.filename)
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: publicUserSelect,
    })
    res.json({ data: user })
  }),
)

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: publicUserSelect,
    })
    if (!user) throw new HttpError(404, "User not found")

    if (user.role === Role.TEACHER) {
      const courses = await prisma.course.findMany({
        where: { teacherId: user.id, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          price: true,
          isFree: true,
          coverUrl: true,
          reviews: { select: { rating: true } },
          _count: { select: { enrollments: true } },
        },
      })
      const allRatings = courses.flatMap((c) => c.reviews.map((r) => r.rating))
      const avgRating =
        allRatings.length > 0
          ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
          : 0
      res.json({ data: { ...user, courses, avgRating } })
      return
    }

    if (user.role === Role.STUDENT) {
      const [enrollments, completed] = await Promise.all([
        prisma.enrollment.count({ where: { userId: user.id } }),
        prisma.lessonProgress.count({ where: { userId: user.id, completed: true } }),
      ])
      res.json({
        data: {
          ...user,
          stats: { enrollments, lessonsCompleted: completed },
        },
      })
      return
    }

    res.json({ data: user })
  }),
)

export default router

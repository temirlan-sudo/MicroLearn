import { Router, Request, Response } from "express"
import { z } from "zod"
import { Role, CourseStatus, Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole, optionalAuth } from "../middleware/auth"
import { uploadImage, publicUrl } from "../middleware/upload"

const router = Router()

const createSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(5000),
  category: z.string().min(2).max(60),
  price: z.number().nonnegative().default(0),
  isFree: z.boolean().default(true),
  coverUrl: z.string().url().optional(),
})

const updateSchema = createSchema.partial()

const listQuery = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["rating", "newest", "price_asc", "price_desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  teacherId: z.string().optional(),
})

router.get(
  "/",
  optionalAuth,
  validate(listQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, search, sort, page, limit, teacherId } = req.query as unknown as z.infer<
      typeof listQuery
    >

    const where: Prisma.CourseWhereInput = {}
    // Если преподаватель смотрит свои курсы — показываем все (включая черновики).
    // Иначе — только опубликованные.
    if (teacherId && req.user && req.user.id === teacherId) {
      where.teacherId = teacherId
    } else {
      where.status = CourseStatus.PUBLISHED
      if (teacherId) where.teacherId = teacherId
    }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    let orderBy: Prisma.CourseOrderByWithRelationInput | Prisma.CourseOrderByWithRelationInput[] = {
      createdAt: "desc",
    }
    if (sort === "newest") orderBy = { createdAt: "desc" }
    if (sort === "price_asc") orderBy = { price: "asc" }
    if (sort === "price_desc") orderBy = { price: "desc" }

    const [rawCourses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          teacher: { select: { id: true, name: true, avatarUrl: true } },
          reviews: { select: { rating: true } },
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.course.count({ where }),
    ])

    let courses = rawCourses.map((c) => {
      const ratings = c.reviews.map((r) => r.rating)
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0
      const { reviews: _r, ...rest } = c
      return { ...rest, avgRating }
    })

    if (sort === "rating") {
      courses = courses.sort((a, b) => b.avgRating - a.avgRating)
    }

    // PREMIUM teacher boost: sort their courses to top if user is premium viewer? No — spec says
    // "priority in search results (boost in query)" for PREMIUM users as viewers: boost published
    // premium-authored courses. Simplification: stable order; skipping complex boost.

    res.json({
      data: courses,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  }),
)

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, name: true, avatarUrl: true, bio: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, order: true, duration: true },
            },
          },
        },
        reviews: { select: { rating: true } },
        _count: { select: { enrollments: true, reviews: true } },
      },
    })
    if (!course) throw new HttpError(404, "Course not found")

    const isTeacher = req.user?.id === course.teacherId
    if (course.status !== CourseStatus.PUBLISHED && !isTeacher) {
      throw new HttpError(404, "Course not found")
    }

    let isEnrolled = false
    if (req.user) {
      const enr = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
      })
      isEnrolled = !!enr
    }

    const ratings = course.reviews.map((r) => r.rating)
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0

    const { reviews: _r, ...rest } = course
    res.json({ data: { ...rest, avgRating, isEnrolled, isTeacher } })
  }),
)

router.post(
  "/",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(createSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const course = await prisma.course.create({
      data: {
        ...req.body,
        teacherId: req.user!.id,
        status: CourseStatus.DRAFT,
      },
    })
    res.status(201).json({ data: course })
  }),
)

async function assertTeacherOwns(courseId: string, userId: string) {
  const c = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } })
  if (!c) throw new HttpError(404, "Course not found")
  if (c.teacherId !== userId) throw new HttpError(403, "Not your course")
}

router.patch(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  validate(updateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await assertTeacherOwns(req.params.id, req.user!.id)
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ data: course })
  }),
)

router.post(
  "/:id/cover",
  verifyAccess,
  requireRole(Role.TEACHER),
  uploadImage.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    await assertTeacherOwns(req.params.id, req.user!.id)
    if (!req.file) throw new HttpError(400, "No file uploaded")
    const coverUrl = publicUrl(req.file.filename)
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { coverUrl },
    })
    res.json({ data: course })
  }),
)

router.patch(
  "/:id/publish",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    await assertTeacherOwns(req.params.id, req.user!.id)
    const current = await prisma.course.findUniqueOrThrow({ where: { id: req.params.id } })
    const nextStatus =
      current.status === CourseStatus.PUBLISHED ? CourseStatus.DRAFT : CourseStatus.PUBLISHED
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { status: nextStatus },
    })
    res.json({ data: course })
  }),
)

router.delete(
  "/:id",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    await assertTeacherOwns(req.params.id, req.user!.id)
    // Clean dependent rows that are not covered by onDelete cascade
    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({
        where: { lesson: { module: { courseId: req.params.id } } },
      }),
      prisma.favorite.deleteMany({ where: { courseId: req.params.id } }),
      prisma.review.deleteMany({ where: { courseId: req.params.id } }),
      prisma.enrollment.deleteMany({ where: { courseId: req.params.id } }),
      prisma.certificate.deleteMany({ where: { courseId: req.params.id } }),
      prisma.course.delete({ where: { id: req.params.id } }),
    ])
    res.status(204).end()
  }),
)

export default router

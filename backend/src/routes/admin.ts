import { Router, Request, Response } from "express"
import { z } from "zod"
import { CourseStatus, ReportStatus, Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"

const router = Router()

router.use(verifyAccess, requireRole(Role.ADMIN))

router.get(
  "/overview",
  asyncHandler(async (_req: Request, res: Response) => {
    const [users, courses, enrollments, completedLessons, reports, recentReports, popularCourses] =
      await Promise.all([
        prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        prisma.course.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.enrollment.count(),
        prisma.lessonProgress.count({ where: { completed: true } }),
        prisma.moderationReport.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.moderationReport.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            reporter: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
          },
        }),
        prisma.course.findMany({
          orderBy: { enrollments: { _count: "desc" } },
          take: 5,
          include: {
            teacher: { select: { id: true, name: true } },
            _count: { select: { enrollments: true, reviews: true } },
          },
        }),
      ])

    res.json({
      data: {
        usersByRole: users.map((item) => ({ role: item.role, count: item._count._all })),
        coursesByStatus: courses.map((item) => ({ status: item.status, count: item._count._all })),
        reportsByStatus: reports.map((item) => ({ status: item.status, count: item._count._all })),
        totals: {
          users: users.reduce((sum, item) => sum + item._count._all, 0),
          courses: courses.reduce((sum, item) => sum + item._count._all, 0),
          enrollments,
          completedLessons,
          reports: reports.reduce((sum, item) => sum + item._count._all, 0),
        },
        recentReports,
        popularCourses,
      },
    })
  }),
)

const usersQuery = z.object({
  q: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
})

router.get(
  "/users",
  validate(usersQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, role } = req.query as unknown as z.infer<typeof usersQuery>
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
        _count: {
          select: { enrollments: true, taughtCourses: true, reviews: true, certificates: true },
        },
      },
    })
    res.json({ data: users })
  }),
)

const coursesQuery = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(CourseStatus).optional(),
})

router.get(
  "/courses",
  validate(coursesQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, status } = req.query as unknown as z.infer<typeof coursesQuery>
    const courses = await prisma.course.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { modules: true, enrollments: true, reviews: true, reports: true } },
      },
    })
    res.json({ data: courses })
  }),
)

router.get(
  "/certificates",
  asyncHandler(async (_req: Request, res: Response) => {
    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        revokedBy: { select: { id: true, name: true, email: true } },
      },
    })
    res.json({ data: certificates })
  }),
)

const reportsQuery = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
})

router.get(
  "/reports",
  validate(reportsQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query as unknown as z.infer<typeof reportsQuery>
    const reports = await prisma.moderationReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, status: true } },
      },
    })
    res.json({ data: reports })
  }),
)

const auditQuery = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  actor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

router.get(
  "/audit-logs",
  validate(auditQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { action, entityType, actor, limit } = req.query as unknown as z.infer<typeof auditQuery>
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(entityType ? { entityType } : {}),
        ...(actor
          ? {
              OR: [
                { actorEmail: { contains: actor, mode: "insensitive" } },
                { actor: { name: { contains: actor, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    })
    res.json({ data: logs })
  }),
)

const updateReportSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  resolution: z.string().max(1000).optional(),
})

router.patch(
  "/reports/:id",
  validate(updateReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await prisma.moderationReport.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        resolution: req.body.resolution,
        assignedToId: req.user!.id,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, status: true } },
      },
    })
    res.json({ data: report })
  }),
)

export default router

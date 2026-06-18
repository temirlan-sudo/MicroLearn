import { Router, Request, Response } from "express"
import { z } from "zod"
import { CourseStatus, ReportStatus, Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { validate } from "../middleware/validate"
import { verifyAccess, requireRole } from "../middleware/auth"
import { writeAuditLog } from "../services/audit-log.service"
import { emitToUser } from "../socket"

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

const reportInclude = {
  reporter: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true, status: true } },
} as const

router.get(
  "/reports",
  validate(reportsQuery, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query as unknown as z.infer<typeof reportsQuery>
    const reports = await prisma.moderationReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: reportInclude,
    })
    res.json({ data: reports })
  }),
)

router.get(
  "/reports/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const report = await prisma.moderationReport.findUnique({
      where: { id: req.params.id },
      include: reportInclude,
    })
    if (!report) {
      res.status(404).json({ error: "Report not found" })
      return
    }
    res.json({ data: report })
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
  status: z.nativeEnum(ReportStatus).optional(),
  resolution: z.string().max(1000).nullable().optional(),
})

router.patch(
  "/reports/:id",
  validate(updateReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const current = await prisma.moderationReport.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, reporterId: true, resolution: true },
    })
    if (!current) {
      res.status(404).json({ error: "Report not found" })
      return
    }

    const nextStatus = req.body.status ?? current.status
    const nextResolution =
      req.body.resolution === undefined ? current.resolution : req.body.resolution?.trim() || null

    const report = await prisma.moderationReport.update({
      where: { id: req.params.id },
      data: {
        status: nextStatus,
        resolution: nextResolution,
        assignedToId: req.user!.id,
      },
      include: reportInclude,
    })

    const statusChanged = current.status !== report.status
    const resolutionChanged = current.resolution !== report.resolution

    if (current.reporterId && (statusChanged || resolutionChanged)) {
      const notif = await prisma.notification.create({
        data: {
          userId: current.reporterId,
          type: "SYSTEM",
          title: "Обращение обновлено",
          body: report.resolution
            ? `Статус: ${report.status}. Ответ администратора: ${report.resolution}`
            : `Статус обращения изменён на ${report.status}.`,
        },
      })
      emitToUser(current.reporterId, "notification:new", notif)
    }

    await writeAuditLog({
      req,
      action:
        report.status === ReportStatus.RESOLVED
          ? "report.resolved"
          : report.status === ReportStatus.DISMISSED
            ? "report.dismissed"
            : resolutionChanged
              ? "report.responded"
              : "report.status_changed",
      entityType: "ModerationReport",
      entityId: report.id,
      metadata: {
        previousStatus: current.status,
        status: report.status,
        resolutionChanged,
      },
    })

    res.json({ data: report })
  }),
)

export default router

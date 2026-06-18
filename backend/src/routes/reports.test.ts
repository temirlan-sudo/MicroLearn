import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { ReportStatus, Role } from "@prisma/client"

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
  process.env.JWT_ACCESS_SECRET = "test-access-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  process.env.ACCESS_TOKEN_EXPIRES = "15m"
  process.env.REFRESH_TOKEN_EXPIRES = "7d"
})

const studentId = "student-1"
const teacherId = "teacher-1"
const adminId = "admin-1"

const prismaMock = vi.hoisted(() => ({
  moderationReport: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  user: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  enrollment: {
    count: vi.fn(),
  },
  lessonProgress: {
    count: vi.fn(),
  },
}))

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("../socket", () => ({ emitToUser: vi.fn() }))

describe("report routes", () => {
  let app: express.Express
  let signAccessToken: typeof import("../services/token.service").signAccessToken

  beforeAll(async () => {
    signAccessToken = (await import("../services/token.service")).signAccessToken
    const { default: reportRoutes } = await import("./reports")
    const { default: adminRoutes } = await import("./admin")

    app = express()
    app.use(express.json())
    app.use("/reports", reportRoutes)
    app.use("/admin", adminRoutes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.status ?? 500).json({ error: err.message, details: err.details })
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" })
    prismaMock.notification.create.mockResolvedValue({ id: "notification-1", type: "SYSTEM" })
  })

  function token(role: Role, sub = role === Role.STUDENT ? studentId : teacherId) {
    return signAccessToken({ sub, email: `${sub}@example.com`, role })
  }

  it("lets a student create a report", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ id: "course-1" })
    prismaMock.moderationReport.create.mockResolvedValue({
      id: "report-1",
      reporterId: studentId,
      courseId: "course-1",
      reason: "Нужна помощь",
      details: "Не открывается материал урока.",
      status: ReportStatus.OPEN,
    })

    const res = await request(app)
      .post("/reports")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({
        reason: "Нужна помощь",
        details: "Не открывается материал урока.",
        courseId: "course-1",
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ id: "report-1", status: ReportStatus.OPEN })
    expect(prismaMock.moderationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporterId: studentId, reason: "Нужна помощь" }),
      }),
    )
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "report.created",
          entityType: "ModerationReport",
          entityId: "report-1",
        }),
      }),
    )
  })

  it("lets a teacher create a report", async () => {
    prismaMock.moderationReport.create.mockResolvedValue({
      id: "report-teacher",
      reporterId: teacherId,
      courseId: null,
      reason: "Вопрос по модерации",
      details: "Нужно уточнить причину проверки курса.",
      status: ReportStatus.OPEN,
    })

    const res = await request(app)
      .post("/reports")
      .set("Authorization", `Bearer ${token(Role.TEACHER, teacherId)}`)
      .send({
        reason: "Вопрос по модерации",
        details: "Нужно уточнить причину проверки курса.",
      })

    expect(res.status).toBe(201)
    expect(res.body.data.reporterId).toBe(teacherId)
  })

  it("lets admin list reports", async () => {
    prismaMock.moderationReport.findMany.mockResolvedValue([
      {
        id: "report-1",
        reason: "Нужна помощь",
        status: ReportStatus.OPEN,
        reporter: {
          id: studentId,
          name: "Student",
          email: "student@example.com",
          role: Role.STUDENT,
        },
      },
    ])

    const res = await request(app)
      .get("/admin/reports")
      .set("Authorization", `Bearer ${token(Role.ADMIN, adminId)}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].reporter.role).toBe(Role.STUDENT)
  })

  it("lets admin respond and resolve a report", async () => {
    prismaMock.moderationReport.findUnique.mockResolvedValue({
      id: "report-1",
      status: ReportStatus.OPEN,
      reporterId: studentId,
      resolution: null,
    })
    prismaMock.moderationReport.update.mockResolvedValue({
      id: "report-1",
      status: ReportStatus.RESOLVED,
      reporterId: studentId,
      resolution: "Мы исправили материал урока.",
    })

    const res = await request(app)
      .patch("/admin/reports/report-1")
      .set("Authorization", `Bearer ${token(Role.ADMIN, adminId)}`)
      .send({ status: ReportStatus.RESOLVED, resolution: "Мы исправили материал урока." })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      status: ReportStatus.RESOLVED,
      resolution: "Мы исправили материал урока.",
    })
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: studentId }) }),
    )
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "report.resolved" }),
      }),
    )
  })

  it("blocks non-admin from resolving reports", async () => {
    const res = await request(app)
      .patch("/admin/reports/report-1")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ status: ReportStatus.RESOLVED, resolution: "Nope" })

    expect(res.status).toBe(403)
    expect(prismaMock.moderationReport.update).not.toHaveBeenCalled()
  })

  it("prevents a user from reading another user's report", async () => {
    prismaMock.moderationReport.findUnique.mockResolvedValue({
      id: "report-2",
      reporterId: "another-user",
      reason: "Private",
      status: ReportStatus.OPEN,
    })

    const res = await request(app)
      .get("/reports/report-2")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)

    expect(res.status).toBe(403)
  })
})

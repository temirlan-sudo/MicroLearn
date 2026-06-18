import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { AssignmentStatus, CertificateStatus, QuizQuestionType, Role } from "@prisma/client"

const state = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
  process.env.JWT_ACCESS_SECRET = "test-access-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  process.env.ACCESS_TOKEN_EXPIRES = "15m"
  process.env.REFRESH_TOKEN_EXPIRES = "7d"

  return {
    auditCount: 0,
  }
})

const teacherId = "teacher-1"
const studentId = "student-1"
const adminId = "admin-1"

const prismaMock = vi.hoisted(() => ({
  assignment: {
    findUnique: vi.fn(),
  },
  assignmentSubmission: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
  },
  quiz: {
    findUnique: vi.fn(),
  },
  quizAttempt: {
    create: vi.fn(),
  },
  certificate: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  course: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  moderationReport: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  lessonProgress: {
    count: vi.fn(),
  },
}))

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }))

function lessonAccess() {
  prismaMock.lesson.findUnique.mockResolvedValue({
    id: "lesson-1",
    module: { course: { id: "course-1", title: "Demo course", teacherId } },
  })
}

function enrolled() {
  prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enrollment-1" })
}

describe("LMS feature routes", () => {
  let app: express.Express
  let signAccessToken: typeof import("../services/token.service").signAccessToken

  beforeAll(async () => {
    signAccessToken = (await import("../services/token.service")).signAccessToken
    const { default: assignmentRoutes } = await import("./assignments")
    const { default: quizRoutes } = await import("./quizzes")
    const { default: certificateRoutes } = await import("./certificates")
    const { default: adminRoutes } = await import("./admin")

    app = express()
    app.use(express.json())
    app.use("/assignments", assignmentRoutes)
    app.use("/quizzes", quizRoutes)
    app.use("/certificates", certificateRoutes)
    app.use("/admin", adminRoutes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.status ?? 500).json({ error: err.message })
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    state.auditCount = 0
    prismaMock.auditLog.create.mockImplementation(async () => {
      state.auditCount += 1
      return { id: `audit-${state.auditCount}` }
    })
  })

  function token(role: Role, sub = role === Role.STUDENT ? studentId : teacherId) {
    return signAccessToken({ sub, email: `${sub}@example.com`, role })
  }

  it("lets a student submit homework and a teacher review it", async () => {
    lessonAccess()
    enrolled()
    prismaMock.assignment.findUnique.mockResolvedValue({ id: "assignment-1", lessonId: "lesson-1" })
    prismaMock.assignmentSubmission.upsert.mockResolvedValue({
      id: "submission-1",
      assignmentId: "assignment-1",
      userId: studentId,
      content: "My practical homework with enough detail.",
      status: AssignmentStatus.SUBMITTED,
    })

    const submitted = await request(app)
      .post("/assignments/assignment-1/submissions")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ content: "My practical homework with enough detail." })

    expect(submitted.status).toBe(201)
    expect(submitted.body.data.status).toBe(AssignmentStatus.SUBMITTED)

    prismaMock.assignmentSubmission.findUnique.mockResolvedValue({
      id: "submission-1",
      assignment: { lessonId: "lesson-1" },
    })
    prismaMock.assignmentSubmission.update.mockResolvedValue({
      id: "submission-1",
      status: AssignmentStatus.REVIEWED,
      score: 88,
      feedback: "Good work",
    })

    const reviewed = await request(app)
      .patch("/assignments/submissions/submission-1/review")
      .set("Authorization", `Bearer ${token(Role.TEACHER, teacherId)}`)
      .send({ status: AssignmentStatus.REVIEWED, score: 88, feedback: "Good work" })

    expect(reviewed.status).toBe(200)
    expect(reviewed.body.data).toMatchObject({ status: AssignmentStatus.REVIEWED, score: 88 })
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(2)
  })

  it("autogrades quiz attempts and blocks teacher-only assignment review for students", async () => {
    lessonAccess()
    enrolled()
    prismaMock.quiz.findUnique.mockResolvedValue({
      id: "quiz-1",
      lessonId: "lesson-1",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          type: QuizQuestionType.SINGLE_CHOICE,
          text: "Question",
          options: ["A", "B"],
          correctAnswers: ["A"],
          points: 1,
          order: 1,
        },
      ],
      lesson: { id: "lesson-1" },
    })
    prismaMock.quizAttempt.create.mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      userId: studentId,
      score: 1,
      maxScore: 1,
      passed: true,
    })

    const attempt = await request(app)
      .post("/quizzes/quiz-1/attempts")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ answers: [{ questionId: "q1", answer: "A" }] })

    expect(attempt.status).toBe(201)
    expect(attempt.body.data).toMatchObject({ score: 1, maxScore: 1, passed: true })

    const blocked = await request(app)
      .patch("/assignments/submissions/submission-1/review")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ status: AssignmentStatus.REVIEWED, score: 90, feedback: "Nope" })

    expect(blocked.status).toBe(403)
  })

  it("verifies and revokes certificates and protects admin audit logs", async () => {
    prismaMock.certificate.findUnique.mockResolvedValue({
      id: "cert-1",
      verificationCode: "ML-DEMO-2026",
      status: CertificateStatus.VALID,
      issuedAt: new Date("2026-01-01T00:00:00.000Z"),
      revokedAt: null,
      user: { id: studentId, name: "Student" },
      course: { id: "course-1", title: "Course", teacher: { name: "Teacher" } },
      revokedBy: null,
    })

    const verified = await request(app).get("/certificates/verify/ML-DEMO-2026")
    expect(verified.status).toBe(200)
    expect(verified.body.data.status).toBe(CertificateStatus.VALID)

    prismaMock.certificate.update.mockResolvedValue({
      id: "cert-1",
      userId: studentId,
      courseId: "course-1",
      verificationCode: "ML-DEMO-2026",
      status: CertificateStatus.REVOKED,
      user: { id: studentId, name: "Student", email: "student@example.com" },
      course: { id: "course-1", title: "Course" },
    })

    const revoked = await request(app)
      .patch("/certificates/cert-1/revoke")
      .set("Authorization", `Bearer ${token(Role.ADMIN, adminId)}`)

    expect(revoked.status).toBe(200)
    expect(revoked.body.data.status).toBe(CertificateStatus.REVOKED)

    const forbiddenAudit = await request(app)
      .get("/admin/audit-logs")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
    expect(forbiddenAudit.status).toBe(403)

    prismaMock.auditLog.findMany.mockResolvedValue([
      { id: "audit-1", action: "certificate.revoked", entityType: "Certificate" },
    ])
    const audit = await request(app)
      .get("/admin/audit-logs")
      .set("Authorization", `Bearer ${token(Role.ADMIN, adminId)}`)
    expect(audit.status).toBe(200)
    expect(audit.body.data[0].action).toBe("certificate.revoked")
  })
})

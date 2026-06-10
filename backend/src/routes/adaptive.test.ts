import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { AdaptiveReviewStatus, QuizQuestionType, Role } from "@prisma/client"

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
  process.env.JWT_ACCESS_SECRET = "test-access-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  process.env.ACCESS_TOKEN_EXPIRES = "15m"
  process.env.REFRESH_TOKEN_EXPIRES = "7d"
})

const teacherId = "teacher-1"
const otherTeacherId = "teacher-2"
const studentId = "student-1"

const prismaMock = vi.hoisted(() => ({
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
  auditLog: {
    create: vi.fn(),
  },
  studentWeakTopic: {
    upsert: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  microlearningCard: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  adaptiveReview: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
  },
}))

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }))

function lessonAccess() {
  prismaMock.lesson.findUnique.mockResolvedValue({
    id: "lesson-1",
    module: { course: { id: "course-1", title: "Demo course", teacherId } },
  })
  prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enrollment-1" })
}

describe("adaptive microlearning routes", () => {
  let app: express.Express
  let signAccessToken: typeof import("../services/token.service").signAccessToken

  beforeAll(async () => {
    signAccessToken = (await import("../services/token.service")).signAccessToken
    const { default: quizRoutes } = await import("./quizzes")
    const { adaptiveRouter, teacherAdaptiveRouter } = await import("./adaptive")

    app = express()
    app.use(express.json())
    app.use("/quizzes", quizRoutes)
    app.use("/adaptive", adaptiveRouter)
    app.use("/teacher/adaptive", teacherAdaptiveRouter)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.status ?? 500).json({ error: err.message, details: err.details })
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" })
    prismaMock.studentWeakTopic.upsert.mockResolvedValue({
      id: "weak-1",
      studentId,
      courseId: "course-1",
      topic: "React Hooks",
      mistakesCount: 1,
      attemptsCount: 2,
      strengthScore: 50,
    })
    prismaMock.studentWeakTopic.update.mockResolvedValue({ id: "weak-1", strengthScore: 50 })
  })

  function token(role: Role, sub = role === Role.STUDENT ? studentId : teacherId) {
    return signAccessToken({ sub, email: `${sub}@example.com`, role })
  }

  it("rejects unauthenticated adaptive requests", async () => {
    const res = await request(app).get("/adaptive/weak-topics")

    expect(res.status).toBe(401)
    expect(prismaMock.studentWeakTopic.findMany).not.toHaveBeenCalled()
  })

  it("creates weak topics and review items when a quiz answer is wrong", async () => {
    lessonAccess()
    prismaMock.quiz.findUnique.mockResolvedValue({
      id: "quiz-1",
      lessonId: "lesson-1",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          type: QuizQuestionType.SINGLE_CHOICE,
          topic: "React Hooks",
          text: "What does useEffect do?",
          options: ["Effects", "Styles"],
          correctAnswers: ["Effects"],
          points: 1,
          order: 1,
        },
      ],
      lesson: { id: "lesson-1", module: { courseId: "course-1" } },
    })
    prismaMock.quizAttempt.create.mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      userId: studentId,
      score: 0,
      maxScore: 1,
      passed: false,
    })
    prismaMock.studentWeakTopic.upsert.mockResolvedValue({
      id: "weak-1",
      studentId,
      courseId: "course-1",
      topic: "React Hooks",
      mistakesCount: 1,
      attemptsCount: 1,
      strengthScore: 100,
    })
    prismaMock.studentWeakTopic.update.mockResolvedValue({ id: "weak-1", strengthScore: 0 })
    prismaMock.microlearningCard.findMany.mockResolvedValue([
      { id: "card-1", courseId: "course-1", topic: "React Hooks" },
      { id: "card-2", courseId: "course-1", topic: "React Hooks" },
    ])
    prismaMock.adaptiveReview.upsert.mockImplementation(async ({ create }: any) => ({
      id: `review-${create.cardId}`,
      ...create,
    }))

    const res = await request(app)
      .post("/quizzes/quiz-1/attempts")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ answers: [{ questionId: "q1", answer: "Styles" }] })

    expect(res.status).toBe(201)
    expect(res.body.data.passed).toBe(false)
    expect(prismaMock.studentWeakTopic.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_courseId_topic: { studentId, courseId: "course-1", topic: "React Hooks" },
        },
      }),
    )
    expect(prismaMock.adaptiveReview.upsert).toHaveBeenCalledTimes(2)
    expect(prismaMock.adaptiveReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: AdaptiveReviewStatus.DUE,
          nextReviewAt: expect.any(Date),
        }),
      }),
    )
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ADAPTIVE_WEAK_TOPIC_DETECTED" }),
      }),
    )
  })

  it("does not crash when a weak topic has no matching cards", async () => {
    lessonAccess()
    prismaMock.quiz.findUnique.mockResolvedValue({
      id: "quiz-1",
      lessonId: "lesson-1",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          type: QuizQuestionType.SINGLE_CHOICE,
          topic: "No Cards Topic",
          text: "Question with no cards",
          options: ["A", "B"],
          correctAnswers: ["A"],
          points: 1,
          order: 1,
        },
      ],
      lesson: { id: "lesson-1", module: { courseId: "course-1" } },
    })
    prismaMock.quizAttempt.create.mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      userId: studentId,
      score: 0,
      maxScore: 1,
      passed: false,
    })
    prismaMock.studentWeakTopic.upsert.mockResolvedValue({
      id: "weak-1",
      studentId,
      courseId: "course-1",
      topic: "No Cards Topic",
      mistakesCount: 1,
      attemptsCount: 1,
      strengthScore: 0,
    })
    prismaMock.microlearningCard.findMany.mockResolvedValue([])

    const res = await request(app)
      .post("/quizzes/quiz-1/attempts")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ answers: [{ questionId: "q1", answer: "B" }] })

    expect(res.status).toBe(201)
    expect(prismaMock.studentWeakTopic.upsert).toHaveBeenCalled()
    expect(prismaMock.adaptiveReview.upsert).not.toHaveBeenCalled()
  })

  it("updates review schedule for correct and incorrect answers", async () => {
    const base = {
      id: "review-1",
      studentId,
      cardId: "card-1",
      courseId: "course-1",
      topic: "React Hooks",
      correctStreak: 0,
      wrongCount: 1,
      nextReviewAt: new Date(),
      card: { id: "card-1", front: "Q", back: "A" },
    }
    prismaMock.adaptiveReview.findUnique.mockResolvedValue(base)
    prismaMock.adaptiveReview.update.mockImplementation(async ({ data }: any) => ({
      ...base,
      ...data,
      course: { id: "course-1", title: "Course" },
      card: base.card,
    }))

    const correct = await request(app)
      .post("/adaptive/review/review-1/answer")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ correct: true })

    expect(correct.status).toBe(200)
    expect(prismaMock.adaptiveReview.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correctStreak: 1,
          status: AdaptiveReviewStatus.SCHEDULED,
        }),
      }),
    )
    expect(prismaMock.studentWeakTopic.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          attemptsCount: { increment: 1 },
          mistakesCount: { increment: 0 },
        }),
      }),
    )

    prismaMock.adaptiveReview.findUnique.mockResolvedValue({ ...base, correctStreak: 2 })
    const incorrect = await request(app)
      .post("/adaptive/review/review-1/answer")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ correct: false })

    expect(incorrect.status).toBe(200)
    expect(prismaMock.adaptiveReview.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correctStreak: 0,
          wrongCount: 2,
          status: AdaptiveReviewStatus.DUE,
        }),
      }),
    )
    expect(prismaMock.studentWeakTopic.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          attemptsCount: { increment: 1 },
          mistakesCount: { increment: 1 },
          lastMistakeAt: expect.any(Date),
        }),
      }),
    )
  })

  it("returns only the current student's weak topics", async () => {
    prismaMock.studentWeakTopic.findMany.mockResolvedValue([
      {
        id: "weak-1",
        studentId,
        courseId: "course-1",
        topic: "React Hooks",
        mistakesCount: 2,
        attemptsCount: 4,
        strengthScore: 50,
        course: { id: "course-1", title: "Course" },
      },
    ])

    const res = await request(app)
      .get("/adaptive/weak-topics")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)

    expect(res.status).toBe(200)
    expect(prismaMock.studentWeakTopic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId } }),
    )
    expect(res.body.data[0].studentId).toBe(studentId)
  })

  it("lets a teacher see only their own course insights", async () => {
    prismaMock.course.findUnique.mockResolvedValueOnce({
      id: "course-1",
      title: "Course",
      teacherId,
    })
    prismaMock.studentWeakTopic.findMany.mockResolvedValue([
      {
        id: "weak-1",
        studentId,
        courseId: "course-1",
        topic: "React Hooks",
        mistakesCount: 3,
        attemptsCount: 5,
        strengthScore: 40,
        student: { id: studentId, name: "Student", email: "s@example.com" },
      },
    ])
    prismaMock.microlearningCard.findMany.mockResolvedValue([
      { id: "card-1", topic: "React Hooks", courseId: "course-1" },
    ])

    const ok = await request(app)
      .get("/teacher/adaptive/course/course-1/insights")
      .set("Authorization", `Bearer ${token(Role.TEACHER, teacherId)}`)

    expect(ok.status).toBe(200)
    expect(ok.body.data.topics[0]).toMatchObject({
      topic: "React Hooks",
      mistakesCount: 3,
      studentsCount: 1,
    })

    prismaMock.course.findUnique.mockResolvedValueOnce({
      id: "course-1",
      title: "Course",
      teacherId,
    })
    const forbidden = await request(app)
      .get("/teacher/adaptive/course/course-1/insights")
      .set("Authorization", `Bearer ${token(Role.TEACHER, otherTeacherId)}`)

    expect(forbidden.status).toBe(403)
  })

  it("blocks students from creating flashcards", async () => {
    const res = await request(app)
      .post("/adaptive/cards")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({
        courseId: "course-1",
        topic: "React Hooks",
        front: "Question",
        back: "Answer",
      })

    expect(res.status).toBe(403)
    expect(prismaMock.microlearningCard.create).not.toHaveBeenCalled()
  })

  it("blocks students from editing or deleting flashcards", async () => {
    const update = await request(app)
      .patch("/adaptive/cards/card-1")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)
      .send({ front: "Edited", back: "Edited" })

    const remove = await request(app)
      .delete("/adaptive/cards/card-1")
      .set("Authorization", `Bearer ${token(Role.STUDENT)}`)

    expect(update.status).toBe(403)
    expect(remove.status).toBe(403)
    expect(prismaMock.microlearningCard.update).not.toHaveBeenCalled()
    expect(prismaMock.microlearningCard.delete).not.toHaveBeenCalled()
  })
})

import { Request } from "express"
import { AdaptiveReviewStatus, Prisma, Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { HttpError } from "../lib/httpError"
import { writeAuditLog } from "./audit-log.service"

export type GradedQuizResult = {
  questionId: string
  correct: boolean
  earned: number
  points: number
}

type AdaptiveQuiz = {
  id: string
  lessonId: string
  questions: { id: string; topic: string; points: number }[]
  lesson: { module?: { courseId: string } | null }
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function strengthScore(mistakesCount: number, attemptsCount: number) {
  if (attemptsCount <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(100 - (mistakesCount / attemptsCount) * 100)))
}

export function riskLevel(score: number) {
  if (score < 45) return "high"
  if (score < 75) return "medium"
  return "low"
}

function nextReviewDate(correct: boolean, currentStreak: number) {
  if (!correct) return addDays(new Date(), 1)
  const nextStreak = currentStreak + 1
  if (nextStreak <= 1) return addDays(new Date(), 3)
  if (nextStreak === 2) return addDays(new Date(), 7)
  return addDays(new Date(), 14)
}

async function updateWeakTopicFromReview(input: {
  studentId: string
  courseId: string
  topic: string
  correct: boolean
}) {
  const attemptsDelta = 1
  const mistakesDelta = input.correct ? 0 : 1
  const weakTopic = await prisma.studentWeakTopic.upsert({
    where: {
      studentId_courseId_topic: {
        studentId: input.studentId,
        courseId: input.courseId,
        topic: input.topic,
      },
    },
    create: {
      studentId: input.studentId,
      courseId: input.courseId,
      topic: input.topic,
      attemptsCount: attemptsDelta,
      mistakesCount: mistakesDelta,
      lastMistakeAt: input.correct ? null : new Date(),
      strengthScore: strengthScore(mistakesDelta, attemptsDelta),
    },
    update: {
      attemptsCount: { increment: attemptsDelta },
      mistakesCount: { increment: mistakesDelta },
      ...(input.correct ? {} : { lastMistakeAt: new Date() }),
    },
  })

  const nextScore = strengthScore(weakTopic.mistakesCount, weakTopic.attemptsCount)
  if (nextScore !== weakTopic.strengthScore) {
    await prisma.studentWeakTopic.update({
      where: { id: weakTopic.id },
      data: { strengthScore: nextScore },
    })
  }
}

export async function assertCanManageAdaptiveCourse(courseId: string, user: Express.UserPayload) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, teacherId: true },
  })
  if (!course) throw new HttpError(404, "Course not found")
  if (user.role !== Role.ADMIN && course.teacherId !== user.id) {
    throw new HttpError(403, "Not your course")
  }
  return course
}

export async function processQuizAttemptForAdaptive(input: {
  req: Request
  studentId: string
  quiz: AdaptiveQuiz
  results: GradedQuizResult[]
}) {
  const courseId = input.quiz.lesson.module?.courseId
  if (!courseId) return

  const questionById = new Map(input.quiz.questions.map((question) => [question.id, question]))
  const topicStats = new Map<string, { attempts: number; mistakes: number }>()

  for (const result of input.results) {
    const question = questionById.get(result.questionId)
    const topic = question?.topic?.trim()
    if (!topic || topic === "General") continue
    const current = topicStats.get(topic) ?? { attempts: 0, mistakes: 0 }
    current.attempts += 1
    if (!result.correct) current.mistakes += 1
    topicStats.set(topic, current)
  }

  const weakTopics = [...topicStats.entries()].filter(([, stats]) => stats.mistakes > 0)
  if (weakTopics.length === 0) return

  for (const [topic, stats] of weakTopics) {
    const weakTopic = await prisma.studentWeakTopic.upsert({
      where: {
        studentId_courseId_topic: {
          studentId: input.studentId,
          courseId,
          topic,
        },
      },
      create: {
        studentId: input.studentId,
        courseId,
        topic,
        attemptsCount: stats.attempts,
        mistakesCount: stats.mistakes,
        lastMistakeAt: new Date(),
        strengthScore: strengthScore(stats.mistakes, stats.attempts),
      },
      update: {
        attemptsCount: { increment: stats.attempts },
        mistakesCount: { increment: stats.mistakes },
        lastMistakeAt: new Date(),
      },
    })

    const updatedScore = strengthScore(weakTopic.mistakesCount, weakTopic.attemptsCount)
    if (updatedScore !== weakTopic.strengthScore) {
      await prisma.studentWeakTopic.update({
        where: { id: weakTopic.id },
        data: { strengthScore: updatedScore },
      })
    }

    await writeAuditLog({
      req: input.req,
      action: "ADAPTIVE_WEAK_TOPIC_DETECTED",
      entityType: "StudentWeakTopic",
      entityId: weakTopic.id,
      metadata: { quizId: input.quiz.id, courseId, topic, mistakes: stats.mistakes },
    })

    const cards = await prisma.microlearningCard.findMany({
      where: { courseId, topic },
      orderBy: { createdAt: "asc" },
      take: 6,
    })

    for (const card of cards) {
      const review = await prisma.adaptiveReview.upsert({
        where: {
          studentId_cardId: {
            studentId: input.studentId,
            cardId: card.id,
          },
        },
        create: {
          studentId: input.studentId,
          cardId: card.id,
          courseId,
          topic,
          status: AdaptiveReviewStatus.DUE,
          correctStreak: 0,
          wrongCount: 1,
          nextReviewAt: new Date(),
        },
        update: {
          status: AdaptiveReviewStatus.DUE,
          correctStreak: 0,
          wrongCount: { increment: 1 },
          nextReviewAt: new Date(),
        },
      })

      await writeAuditLog({
        req: input.req,
        action: "ADAPTIVE_REVIEW_CREATED",
        entityType: "AdaptiveReview",
        entityId: review.id,
        metadata: { cardId: card.id, courseId, topic },
      })
    }
  }
}

export async function getStudentWeakTopics(studentId: string) {
  const topics = await prisma.studentWeakTopic.findMany({
    where: { studentId },
    orderBy: [{ strengthScore: "asc" }, { lastMistakeAt: "desc" }],
    include: { course: { select: { id: true, title: true } } },
  })
  return topics.map((topic) => ({ ...topic, riskLevel: riskLevel(topic.strengthScore) }))
}

export async function getDailyChallenge(studentId: string) {
  const items = await prisma.adaptiveReview.findMany({
    where: {
      studentId,
      nextReviewAt: { lte: endOfToday() },
      status: { in: [AdaptiveReviewStatus.DUE, AdaptiveReviewStatus.SCHEDULED] },
    },
    orderBy: [{ nextReviewAt: "asc" }, { wrongCount: "desc" }],
    take: 12,
    include: {
      card: true,
      course: { select: { id: true, title: true } },
    },
  })

  const topics = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.topic] = (acc[item.topic] ?? 0) + 1
    return acc
  }, {})

  return {
    total: items.length,
    topics: Object.entries(topics).map(([topic, count]) => ({ topic, count })),
    items,
  }
}

export async function answerAdaptiveReview(input: {
  req: Request
  studentId: string
  reviewId: string
  correct: boolean
}) {
  const current = await prisma.adaptiveReview.findUnique({
    where: { id: input.reviewId },
    include: { card: true },
  })
  if (!current || current.studentId !== input.studentId) {
    throw new HttpError(404, "Review item not found")
  }

  const nextStreak = input.correct ? current.correctStreak + 1 : 0
  const updated = await prisma.adaptiveReview.update({
    where: { id: current.id },
    data: {
      correctStreak: nextStreak,
      wrongCount: input.correct ? current.wrongCount : current.wrongCount + 1,
      status: input.correct ? AdaptiveReviewStatus.SCHEDULED : AdaptiveReviewStatus.DUE,
      nextReviewAt: nextReviewDate(input.correct, current.correctStreak),
      lastReviewedAt: new Date(),
    },
    include: {
      card: true,
      course: { select: { id: true, title: true } },
    },
  })

  await updateWeakTopicFromReview({
    studentId: input.studentId,
    courseId: updated.courseId,
    topic: updated.topic,
    correct: input.correct,
  })

  await writeAuditLog({
    req: input.req,
    action: "ADAPTIVE_REVIEW_COMPLETED",
    entityType: "AdaptiveReview",
    entityId: updated.id,
    metadata: {
      cardId: updated.cardId,
      topic: updated.topic,
      correct: input.correct,
      nextReviewAt: updated.nextReviewAt.toISOString(),
    },
  })

  return updated
}

export async function getTeacherAdaptiveInsights(courseId: string, user: Express.UserPayload) {
  await assertCanManageAdaptiveCourse(courseId, user)

  const weakTopics = await prisma.studentWeakTopic.findMany({
    where: { courseId },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: [{ mistakesCount: "desc" }, { strengthScore: "asc" }],
  })

  const cards = await prisma.microlearningCard.findMany({
    where: { courseId },
    orderBy: [{ topic: "asc" }, { createdAt: "asc" }],
  })

  const byTopic = new Map<
    string,
    {
      topic: string
      mistakesCount: number
      attemptsCount: number
      students: Set<string>
      avgStrengthScore: number
    }
  >()
  for (const item of weakTopics) {
    const current = byTopic.get(item.topic) ?? {
      topic: item.topic,
      mistakesCount: 0,
      attemptsCount: 0,
      students: new Set<string>(),
      avgStrengthScore: 0,
    }
    current.mistakesCount += item.mistakesCount
    current.attemptsCount += item.attemptsCount
    current.students.add(item.studentId)
    current.avgStrengthScore += item.strengthScore
    byTopic.set(item.topic, current)
  }

  const topics = [...byTopic.values()]
    .map((item) => ({
      topic: item.topic,
      mistakesCount: item.mistakesCount,
      attemptsCount: item.attemptsCount,
      studentsCount: item.students.size,
      avgStrengthScore: Math.round(item.avgStrengthScore / Math.max(1, item.students.size)),
      cardsCount: cards.filter((card) => card.topic === item.topic).length,
    }))
    .sort((a, b) => b.mistakesCount - a.mistakesCount)

  return {
    courseId,
    topics,
    cards,
    weakTopics,
  }
}

export function cardSelect() {
  return {
    id: true,
    courseId: true,
    lessonId: true,
    topic: true,
    front: true,
    back: true,
    hint: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.MicrolearningCardSelect
}

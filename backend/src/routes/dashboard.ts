import { Router, Request, Response } from "express"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { verifyAccess, requireRole } from "../middleware/auth"

const router = Router()

router.get(
  "/teacher",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.id

    const [courses, enrollments, reviews, recentReviews] = await Promise.all([
      prisma.course.findMany({
        where: { teacherId },
        select: { id: true, title: true },
      }),
      prisma.enrollment.findMany({
        where: { course: { teacherId } },
        select: { userId: true, enrolledAt: true, courseId: true },
      }),
      prisma.review.findMany({
        where: { course: { teacherId } },
        select: { rating: true },
      }),
      prisma.review.findMany({
        where: { course: { teacherId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          course: { select: { id: true, title: true } },
        },
      }),
    ])

    const uniqueStudents = new Set(enrollments.map((e) => e.userId))
    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) * 10) / 10
        : 0

    // weekly enrollments — last 7 days, grouped by day
    const now = new Date()
    const weekly: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(now.getDate() - i)
      const key = day.toISOString().slice(0, 10)
      const count = enrollments.filter(
        (e) => e.enrolledAt.toISOString().slice(0, 10) === key,
      ).length
      weekly.push({ date: key, count })
    }

    res.json({
      data: {
        totalStudents: uniqueStudents.size,
        totalCourses: courses.length,
        avgRating,
        totalViews: enrollments.length, // enrollments as proxy for views
        weeklyEnrollments: weekly,
        recentReviews,
      },
    })
  }),
)

router.get(
  "/teacher/students",
  verifyAccess,
  requireRole(Role.TEACHER),
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.id
    const courses = await prisma.course.findMany({
      where: { teacherId },
      select: {
        id: true,
        title: true,
        modules: { select: { lessons: { select: { id: true } } } },
      },
    })
    const courseIds = courses.map((course) => course.id)
    const lessonIds = courses.flatMap((course) =>
      course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
    )
    const totalLessonsByCourse = new Map(
      courses.map((course) => [
        course.id,
        course.modules.reduce((sum, module) => sum + module.lessons.length, 0),
      ]),
    )

    const [enrollments, progressRows, attempts, submissions, certificates] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.lessonProgress.findMany({
        where: { completed: true, lessonId: { in: lessonIds } },
        include: { lesson: { select: { module: { select: { courseId: true } } } } },
      }),
      prisma.quizAttempt.findMany({
        where: { quiz: { lesson: { module: { courseId: { in: courseIds } } } } },
        include: {
          quiz: { select: { lesson: { select: { module: { select: { courseId: true } } } } } },
        },
      }),
      prisma.assignmentSubmission.findMany({
        where: { assignment: { lesson: { module: { courseId: { in: courseIds } } } } },
        include: {
          assignment: {
            select: { lesson: { select: { module: { select: { courseId: true } } } } },
          },
        },
      }),
      prisma.certificate.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true, userId: true, courseId: true, status: true, verificationCode: true },
      }),
    ])

    const progressByKey = new Map<string, { count: number; last: Date | null }>()
    for (const row of progressRows) {
      const courseId = row.lesson.module.courseId
      const key = `${row.userId}:${courseId}`
      const item = progressByKey.get(key) ?? { count: 0, last: null }
      item.count += 1
      if (row.completedAt && (!item.last || row.completedAt > item.last))
        item.last = row.completedAt
      progressByKey.set(key, item)
    }

    const quizByKey = new Map<string, { sum: number; count: number; last: Date | null }>()
    for (const attempt of attempts) {
      const courseId = attempt.quiz.lesson.module.courseId
      const key = `${attempt.userId}:${courseId}`
      const item = quizByKey.get(key) ?? { sum: 0, count: 0, last: null }
      item.sum += attempt.maxScore ? Math.round((attempt.score / attempt.maxScore) * 100) : 0
      item.count += 1
      if (!item.last || attempt.createdAt > item.last) item.last = attempt.createdAt
      quizByKey.set(key, item)
    }

    const assignmentsByKey = new Map<string, Record<string, number>>()
    for (const submission of submissions) {
      const courseId = submission.assignment.lesson.module.courseId
      const key = `${submission.userId}:${courseId}`
      const item = assignmentsByKey.get(key) ?? {
        SUBMITTED: 0,
        REVIEWED: 0,
        NEEDS_REVISION: 0,
      }
      item[submission.status] = (item[submission.status] ?? 0) + 1
      assignmentsByKey.set(key, item)
    }

    const certsByKey = new Map<string, typeof certificates>()
    for (const cert of certificates) {
      const key = `${cert.userId}:${cert.courseId}`
      certsByKey.set(key, [...(certsByKey.get(key) ?? []), cert])
    }

    const data = enrollments.map((enrollment) => {
      const key = `${enrollment.userId}:${enrollment.courseId}`
      const progress = progressByKey.get(key) ?? { count: 0, last: null }
      const quiz = quizByKey.get(key)
      const completedLessons = progress.count
      const totalLessons = totalLessonsByCourse.get(enrollment.courseId) ?? 0
      const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
      const lastActivity = [progress.last, quiz?.last ?? null, enrollment.enrolledAt]
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0]

      return {
        student: enrollment.user,
        course: enrollment.course,
        enrolledAt: enrollment.enrolledAt,
        completedLessons,
        totalLessons,
        progressPercent,
        quizAverage: quiz?.count ? Math.round(quiz.sum / quiz.count) : null,
        assignments: assignmentsByKey.get(key) ?? {
          SUBMITTED: 0,
          REVIEWED: 0,
          NEEDS_REVISION: 0,
        },
        certificates: certsByKey.get(key) ?? [],
        lastActivity,
      }
    })

    res.json({ data })
  }),
)

router.get(
  "/student",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            modules: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    })

    const progressRows = await prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true, completedAt: true },
    })
    const completedLessonIds = new Set(progressRows.map((p) => p.lessonId))

    let inProgress = 0
    let completed = 0
    for (const e of enrollments) {
      const lessons = e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
      if (lessons.length === 0) {
        inProgress++
        continue
      }
      const done = lessons.filter((id) => completedLessonIds.has(id)).length
      if (done === lessons.length) completed++
      else inProgress++
    }

    // streak: consecutive days with at least one lesson completion, ending today
    const daysWithActivity = new Set(
      progressRows
        .map((p) => p.completedAt?.toISOString().slice(0, 10))
        .filter(Boolean) as string[],
    )
    let streak = 0
    const d = new Date()
    while (true) {
      const key = d.toISOString().slice(0, 10)
      if (daysWithActivity.has(key)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }

    const recentActivity = await prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { course: { select: { id: true, title: true } } } },
          },
        },
      },
    })

    res.json({
      data: {
        coursesInProgress: inProgress,
        coursesCompleted: completed,
        totalLessonsCompleted: progressRows.length,
        currentStreak: streak,
        recentActivity: recentActivity.map((a) => ({
          lessonId: a.lessonId,
          lessonTitle: a.lesson.title,
          courseId: a.lesson.module.course.id,
          courseTitle: a.lesson.module.course.title,
          completedAt: a.completedAt,
        })),
      },
    })
  }),
)

export default router

import { prisma } from "../lib/prisma"
import { Plan } from "@prisma/client"
import { issueCertificate } from "./certificate.service"
import { emitToUser } from "../socket"
import { HttpError } from "../lib/httpError"

export async function courseProgressPercent(userId: string, courseId: string): Promise<number> {
  const modules = await prisma.module.findMany({
    where: { courseId },
    select: { lessons: { select: { id: true } } },
  })
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id))
  if (lessonIds.length === 0) return 0

  const completed = await prisma.lessonProgress.count({
    where: { userId, lessonId: { in: lessonIds }, completed: true },
  })

  return Math.round((completed / lessonIds.length) * 100)
}

export async function courseProgressDetailed(userId: string, courseId: string) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
    },
  })
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id))
  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, completed: true, completedAt: true },
  })
  const map = new Map(progress.map((p) => [p.lessonId, p]))
  const completedCount = progress.filter((p) => p.completed).length
  const percent = lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0

  return {
    percent,
    totalLessons: lessonIds.length,
    completedLessons: completedCount,
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        completed: map.get(l.id)?.completed ?? false,
        completedAt: map.get(l.id)?.completedAt ?? null,
      })),
    })),
  }
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      module: { select: { courseId: true } },
      assignment: { select: { id: true } },
      quiz: { select: { id: true } },
    },
  })
  const courseId = lesson.module.courseId

  // Гейт: если у урока есть задание — должна быть отправлена работа.
  if (lesson.assignment) {
    const submission = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: lesson.assignment.id, userId },
      select: { id: true },
    })
    if (!submission) {
      throw new HttpError(400, "Сначала отправьте ответ на задание этого урока.")
    }
  }

  // Гейт: если у урока есть тест — должна быть успешная попытка (passed=true).
  if (lesson.quiz) {
    const passed = await prisma.quizAttempt.findFirst({
      where: { quizId: lesson.quiz.id, userId, passed: true },
      select: { id: true },
    })
    if (!passed) {
      throw new HttpError(
        400,
        "Сначала пройдите тест этого урока на проходной балл.",
      )
    }
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  })

  const percent = await courseProgressPercent(userId, courseId)

  emitToUser(userId, "lesson:progress_update", { courseId, progressPercent: percent })

  if (percent === 100) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.plan === Plan.PREMIUM) {
      const fileUrl = await issueCertificate(userId, courseId)
      const notif = await prisma.notification.create({
        data: {
          userId,
          type: "PROGRESS",
          title: "Certificate ready 🎉",
          body: `You've completed a course. Your certificate is ready to download.`,
        },
      })
      emitToUser(userId, "notification:new", notif)
      return { percent, certificateUrl: fileUrl }
    }
    const notif = await prisma.notification.create({
      data: {
        userId,
        type: "PROGRESS",
        title: "Course complete",
        body: "Congrats on finishing the course! Upgrade to PREMIUM to unlock certificates.",
      },
    })
    emitToUser(userId, "notification:new", notif)
  }

  return { percent }
}

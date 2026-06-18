import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { HttpError } from "../lib/httpError"

export async function getLessonCourseAccess(lessonId: string, userId: string, role?: Role) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { select: { id: true, title: true, teacherId: true } },
        },
      },
    },
  })
  if (!lesson) throw new HttpError(404, "Lesson not found")

  const course = lesson.module.course
  const isTeacher = course.teacherId === userId
  const isAdmin = role === Role.ADMIN
  const enrollment = isTeacher
    ? null
    : await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      })

  return {
    lesson,
    course,
    isTeacher,
    isAdmin,
    isEnrolled: !!enrollment,
    canStudy: isTeacher || isAdmin || !!enrollment,
  }
}

export async function assertCanStudyLesson(lessonId: string, userId: string, role?: Role) {
  const access = await getLessonCourseAccess(lessonId, userId, role)
  if (!access.canStudy) throw new HttpError(403, "Enroll in the course to open this activity")
  return access
}

export async function assertTeacherOwnsLesson(lessonId: string, userId: string) {
  const access = await getLessonCourseAccess(lessonId, userId, Role.TEACHER)
  if (!access.isTeacher) throw new HttpError(403, "Not your lesson")
  return access
}

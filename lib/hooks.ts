"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

// -------- Generic SWR-lite --------

type State<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T>(
  path: string | null,
  deps: unknown[] = [],
): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!path) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await api.get<{ data: T }>(path)
      if (mounted.current) setState({ data: res.data, loading: false, error: null })
    } catch (err) {
      if (!mounted.current) return
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Ошибка запроса"
      setState({ data: null, loading: false, error: msg })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

function useProtectedFetch<T>(path: string | null): State<T> & { reload: () => void } {
  const { user, loading } = useAuth()
  return useFetch<T>(!loading && user ? path : null, [loading, user?.id ?? ""])
}

// -------- Типы ответов --------

export type AuthRole = "USER" | "STUDENT" | "TEACHER" | "ADMIN"
export type Plan = "FREE" | "PRO" | "PREMIUM"
export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED"

export type TeacherPublic = {
  id: string
  name: string
  email: string
  role: AuthRole
  avatarUrl?: string | null
  bio?: string | null
  country?: string | null
  courseCount: number
  avgRating: number
}

export type CourseListItem = {
  id: string
  title: string
  description: string
  category: string
  price: number
  isFree: boolean
  coverUrl?: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  createdAt: string
  teacherId: string
  teacher: { id: string; name: string; avatarUrl?: string | null }
  avgRating: number
  _count: { enrollments: number; reviews: number }
}

export type CourseDetail = CourseListItem & {
  modules: {
    id: string
    title: string
    order: number
    lessons: { id: string; title: string; type: string; order: number; duration?: number | null }[]
  }[]
  isEnrolled: boolean
  isTeacher: boolean
  teacher: { id: string; name: string; avatarUrl?: string | null; bio?: string | null }
}

export type CourseProgressDetail = {
  percent: number
  totalLessons: number
  completedLessons: number
  modules: {
    id: string
    title: string
    order: number
    lessons: {
      id: string
      title: string
      order: number
      completed: boolean
      completedAt: string | null
    }[]
  }[]
}

export type EnrollmentItem = {
  id: string
  userId: string
  courseId: string
  enrolledAt: string
  progressPercent: number
  course: CourseListItem & { _count: { modules: number } }
}

export type FavoriteItem = {
  id: string
  courseId: string
  course: CourseListItem
}

export type CertificateItem = {
  id: string
  fileUrl: string
  verificationCode: string
  status: "VALID" | "REVOKED"
  issuedAt: string
  course: { id: string; title: string; coverUrl?: string | null }
}

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type PlanDef = {
  id: Plan
  name: string
  priceUSD: number
  features: string[]
  maxEnrollments: number
  maxCoursePrice: number
  certificates: boolean
  searchBoost: boolean
  adBanner: boolean
}

export type StudentDashboard = {
  coursesInProgress: number
  coursesCompleted: number
  totalLessonsCompleted: number
  currentStreak: number
  recentActivity: {
    lessonId: string
    lessonTitle: string
    courseId: string
    courseTitle: string
    completedAt: string
  }[]
}

export type TeacherDashboard = {
  totalStudents: number
  totalCourses: number
  avgRating: number
  totalViews: number
  weeklyEnrollments: { date: string; count: number }[]
  recentReviews: {
    id: string
    rating: number
    comment?: string | null
    createdAt: string
    user: { id: string; name: string; avatarUrl?: string | null }
    course: { id: string; title: string }
  }[]
}

export type AssignmentStatus = "SUBMITTED" | "REVIEWED" | "NEEDS_REVISION"

export type AssignmentSubmission = {
  id: string
  content: string
  status: AssignmentStatus
  score?: number | null
  feedback?: string | null
  submittedAt: string
  reviewedAt?: string | null
  user: { id: string; name: string; email: string }
  reviewer?: { id: string; name: string; email: string } | null
}

export type LessonAssignment = {
  id: string
  lessonId: string
  title: string
  instructions: string
  maxScore: number
  submissions: AssignmentSubmission[]
}

export type LessonQuiz = {
  id: string
  lessonId: string
  title: string
  passingScore: number
  questions: {
    id: string
    type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE"
    text: string
    topic: string
    options: string[]
    points: number
    order: number
  }[]
  attempts: {
    id: string
    score: number
    maxScore: number
    passed: boolean
    createdAt: string
  }[]
}

export type TeacherStudentAnalytics = {
  student: { id: string; name: string; email: string }
  course: { id: string; title: string }
  enrolledAt: string
  completedLessons: number
  totalLessons: number
  progressPercent: number
  quizAverage: number | null
  assignments: Record<AssignmentStatus, number>
  certificates: { id: string; status: "VALID" | "REVOKED"; verificationCode: string }[]
  lastActivity: string
}

export type AdminOverview = {
  usersByRole: { role: AuthRole; count: number }[]
  coursesByStatus: { status: string; count: number }[]
  reportsByStatus: { status: ReportStatus; count: number }[]
  totals: {
    users: number
    courses: number
    enrollments: number
    completedLessons: number
    reports: number
  }
  recentReports: AdminReport[]
  popularCourses: (CourseListItem & { _count: { enrollments: number; reviews: number } })[]
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: AuthRole
  plan: Plan
  createdAt: string
  _count: { enrollments: number; taughtCourses: number; reviews: number; certificates: number }
}

export type AdminCourse = CourseListItem & {
  teacher: { id: string; name: string; email: string }
  updatedAt: string
  _count: { modules: number; enrollments: number; reviews: number; reports: number }
}

export type AdminReport = {
  id: string
  reason: string
  details?: string | null
  status: ReportStatus
  resolution?: string | null
  createdAt: string
  updatedAt: string
  reporter?: { id: string; name: string; email: string; role?: AuthRole } | null
  assignedTo?: { id: string; name: string; email: string } | null
  course?: { id: string; title: string; status: string } | null
}

export type UserReport = AdminReport & {
  reporter?: { id: string; name: string; email: string; role: AuthRole } | null
}

export type AdminAuditLog = {
  id: string
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: unknown
  createdAt: string
  actor?: { id: string; name: string; email: string; role: AuthRole } | null
}

export type AdminCertificate = {
  id: string
  verificationCode: string
  status: "VALID" | "REVOKED"
  issuedAt: string
  revokedAt?: string | null
  user: { id: string; name: string; email: string }
  course: { id: string; title: string }
  revokedBy?: { id: string; name: string; email: string } | null
}

export type MicrolearningCard = {
  id: string
  courseId: string
  lessonId?: string | null
  topic: string
  front: string
  back: string
  hint?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export type AdaptiveReviewItem = {
  id: string
  studentId: string
  cardId: string
  courseId: string
  topic: string
  status: "DUE" | "SCHEDULED" | "MASTERED"
  correctStreak: number
  wrongCount: number
  nextReviewAt: string
  lastReviewedAt?: string | null
  card: MicrolearningCard
  course: { id: string; title: string }
}

export type AdaptiveDailyChallenge = {
  total: number
  topics: { topic: string; count: number }[]
  items: AdaptiveReviewItem[]
}

export type StudentWeakTopic = {
  id: string
  studentId: string
  courseId: string
  topic: string
  mistakesCount: number
  attemptsCount: number
  lastMistakeAt?: string | null
  strengthScore: number
  riskLevel: "low" | "medium" | "high"
  course: { id: string; title: string }
}

export type TeacherAdaptiveInsights = {
  courseId: string
  topics: {
    topic: string
    mistakesCount: number
    attemptsCount: number
    studentsCount: number
    avgStrengthScore: number
    cardsCount: number
  }[]
  cards: MicrolearningCard[]
  weakTopics: (StudentWeakTopic & { student: { id: string; name: string; email: string } })[]
}

// -------- Именованные хуки --------

export const useStudentDashboard = () => useProtectedFetch<StudentDashboard>("/dashboard/student")
export const useTeacherDashboard = () => useProtectedFetch<TeacherDashboard>("/dashboard/teacher")
export const useTeacherStudentAnalytics = () =>
  useProtectedFetch<TeacherStudentAnalytics[]>("/dashboard/teacher/students")
export const useAdminOverview = () => useProtectedFetch<AdminOverview>("/admin/overview")
export const useAdminUsers = (qs = "") => useProtectedFetch<AdminUser[]>(`/admin/users${qs}`)
export const useAdminCourses = (qs = "") => useProtectedFetch<AdminCourse[]>(`/admin/courses${qs}`)
export const useAdminReports = (qs = "") => useProtectedFetch<AdminReport[]>(`/admin/reports${qs}`)
export const useAdminAuditLogs = (qs = "") =>
  useProtectedFetch<AdminAuditLog[]>(`/admin/audit-logs${qs}`)
export const useAdminCertificates = () =>
  useProtectedFetch<AdminCertificate[]>("/admin/certificates")
export const useMyReports = () => useProtectedFetch<UserReport[]>("/reports/my")
export const useMyEnrollments = () => useProtectedFetch<EnrollmentItem[]>("/enrollments/my")
export const useMyFavorites = () => useProtectedFetch<FavoriteItem[]>("/favorites/my")
export const useMyCertificates = () => useProtectedFetch<CertificateItem[]>("/certificates/my")
export const useMyNotifications = () => useProtectedFetch<NotificationItem[]>("/notifications/my")
export const useAdaptiveDailyChallenge = () =>
  useProtectedFetch<AdaptiveDailyChallenge>("/adaptive/daily-challenge")
export const useStudentWeakTopics = () =>
  useProtectedFetch<StudentWeakTopic[]>("/adaptive/weak-topics")
export const useTeacherAdaptiveInsights = (courseId?: string | null) =>
  useProtectedFetch<TeacherAdaptiveInsights>(
    courseId ? `/teacher/adaptive/course/${courseId}/insights` : null,
  )
export const useAdaptiveCards = (courseId?: string | null) =>
  useProtectedFetch<MicrolearningCard[]>(
    courseId ? `/adaptive/cards?courseId=${encodeURIComponent(courseId)}` : null,
  )

export const usePlans = () => useFetch<PlanDef[]>("/plans")

export const useTeachers = () => useFetch<TeacherPublic[]>("/users")

export function useCourses(
  params?: {
    category?: string
    search?: string
    sort?: "rating" | "newest" | "price_asc" | "price_desc"
    page?: number
    limit?: number
    teacherId?: string
  } | null,
) {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : ""
  return useFetch<CourseListItem[]>(params === null ? null : `/courses${qs}`, [
    params === null ? "disabled" : qs,
  ])
}

export const useCourse = (id?: string | null) =>
  useFetch<CourseDetail>(id ? `/courses/${id}` : null, [id ?? ""])

export const useCourseProgress = (id?: string | null) =>
  useProtectedFetch<CourseProgressDetail>(id ? `/progress/course/${id}` : null)

export const useUser = (id?: string | null) =>
  useFetch<unknown>(id ? `/users/${id}` : null, [id ?? ""])

export type ScheduleItem = {
  id: string
  userId: string
  dayOfWeek: number
  time: string
  title: string
  courseId?: string | null
  course?: { id: string; title: string } | null
  createdAt: string
  updatedAt: string
}

export const useMySchedule = () => useProtectedFetch<ScheduleItem[]>("/schedule/my")

export async function createScheduleItem(input: {
  dayOfWeek: number
  time: string
  title: string
  courseId?: string | null
}) {
  return api.post<{ data: ScheduleItem }>("/schedule", input)
}

export async function updateScheduleItem(
  id: string,
  input: Partial<{ dayOfWeek: number; time: string; title: string; courseId?: string | null }>,
) {
  return api.patch<{ data: ScheduleItem }>(`/schedule/${id}`, input)
}

export async function deleteScheduleItem(id: string) {
  return api.delete(`/schedule/${id}`)
}
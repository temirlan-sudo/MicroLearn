"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, PlayCircle, XCircle } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  useCourse,
  useCourseProgress,
  type AssignmentStatus,
  type LessonAssignment,
  type LessonQuiz,
} from "@/lib/hooks"

type LessonContent = {
  id: string
  title: string
  type: string
  order: number
  duration?: number | null
  content?: string | null
  moduleId: string
}

type QuizResult = {
  questionId: string
  correct: boolean
  earned: number
  points: number
}

function isVideo(url?: string | null) {
  return !!url && /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

export function LessonReader({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { data: course } = useCourse(courseId)
  const { data: progress, reload: reloadProgress } = useCourseProgress(courseId)
  const [lesson, setLesson] = useState<LessonContent | null>(null)
  const [assignment, setAssignment] = useState<LessonAssignment | null>(null)
  const [quiz, setQuiz] = useState<LessonQuiz | null>(null)
  const [assignmentText, setAssignmentText] = useState("")
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | string[]>>({})
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({})
  const [quizFeedback, setQuizFeedback] = useState<"passed" | "failed" | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"complete" | "assignment" | "quiz" | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activityMessage, setActivityMessage] = useState<string | null>(null)

  const lessons = useMemo(
    () =>
      course?.modules.flatMap((module, moduleIndex) =>
        module.lessons.map((item, lessonIndex) => ({
          ...item,
          moduleIndex,
          lessonIndex,
          moduleTitle: module.title,
        })),
      ) ?? [],
    [course?.modules],
  )
  const currentIndex = lessons.findIndex((item) => item.id === lessonId)
  const currentMeta = currentIndex >= 0 ? lessons[currentIndex] : null
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : null
  const completed =
    progress?.modules.some((module) =>
      module.lessons.some((item) => item.id === lessonId && item.completed),
    ) ?? false

  // Гейты завершения урока: задание должно быть отправлено, тест — пройден.
  const assignmentDone = !assignment || (assignment.submissions?.length ?? 0) > 0
  const quizDone = !quiz || (quiz.attempts ?? []).some((attempt) => attempt.passed)
  const canComplete = assignmentDone && quizDone
  const completeBlockers: string[] = []
  if (!assignmentDone) completeBlockers.push("отправьте ответ на задание")
  if (!quizDone) completeBlockers.push("пройдите тест на проходной балл")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (authLoading) return
      if (!user) {
        setError("Войдите или зарегистрируйтесь, чтобы открыть урок.")
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [lessonRes, assignmentRes, quizRes] = await Promise.all([
          api.get<{ data: LessonContent }>(`/lessons/${lessonId}/content`),
          api
            .get<{ data: LessonAssignment | null }>(`/assignments/lesson/${lessonId}`)
            .catch(() => ({ data: null })),
          api.get<{ data: LessonQuiz | null }>(`/quizzes/lesson/${lessonId}`).catch(() => ({
            data: null,
          })),
        ])
        if (!cancelled) {
          setLesson(lessonRes.data)
          setAssignment(assignmentRes.data)
          setQuiz(quizRes.data)
          setAssignmentText(assignmentRes.data?.submissions?.[0]?.content ?? "")
          setQuizResults({})
          setQuizFeedback(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Не удалось открыть урок")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, lessonId, user])

  async function completeLesson() {
    setBusy("complete")
    setError(null)
    try {
      await api.post(`/progress/lesson/${lessonId}/complete`)
      await reloadProgress()
      const target = nextLesson
        ? `/courses/${courseId}?next=${nextLesson.id}#program`
        : `/courses/${courseId}?completed=1#program`
      router.push(target)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось завершить урок")
    } finally {
      setBusy(null)
    }
  }

  async function submitAssignment() {
    if (!assignment) return
    setBusy("assignment")
    setError(null)
    setActivityMessage(null)
    setQuizFeedback(null)
    try {
      const res = await api.post<{ data: LessonAssignment["submissions"][number] }>(
        `/assignments/${assignment.id}/submissions`,
        { content: assignmentText },
      )
      setAssignment({
        ...assignment,
        submissions: [
          res.data,
          ...assignment.submissions.filter((item) => item.id !== res.data.id),
        ],
      })
      setActivityMessage("Работа отправлена преподавателю.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить работу")
    } finally {
      setBusy(null)
    }
  }

  async function reviewSubmission(id: string, status: AssignmentStatus, score?: number) {
    if (!assignment) return
    setBusy(id)
    setError(null)
    setActivityMessage(null)
    setQuizFeedback(null)
    try {
      const res = await api.patch<{ data: LessonAssignment["submissions"][number] }>(
        `/assignments/submissions/${id}/review`,
        {
          status,
          score,
          feedback:
            status === "REVIEWED"
              ? "Проверено: работа засчитана для demo-сценария."
              : "Нужно доработать ответ и добавить конкретный пример из урока.",
        },
      )
      setAssignment({
        ...assignment,
        submissions: assignment.submissions.map((item) => (item.id === id ? res.data : item)),
      })
      setActivityMessage("Рецензия сохранена.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось проверить работу")
    } finally {
      setBusy(null)
    }
  }

  function setQuizAnswer(questionId: string, value: string, multiple: boolean) {
    setQuizResults({})
    setQuizFeedback(null)
    setQuizAnswers((current) => {
      if (!multiple) return { ...current, [questionId]: value }
      const existing = Array.isArray(current[questionId]) ? (current[questionId] as string[]) : []
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value]
      return { ...current, [questionId]: next }
    })
  }

  async function submitQuiz() {
    if (!quiz) return
    setBusy("quiz")
    setError(null)
    setActivityMessage(null)
    setQuizFeedback(null)
    try {
      const answers = quiz.questions.map((question) => ({
        questionId: question.id,
        answer: quizAnswers[question.id] ?? (question.type === "MULTIPLE_CHOICE" ? [] : ""),
      }))
      const res = await api.post<{
        data: LessonQuiz["attempts"][number] & { percent: number; results?: QuizResult[] }
      }>(`/quizzes/${quiz.id}/attempts`, { answers })
      setQuizResults(
        Object.fromEntries((res.data.results ?? []).map((result) => [result.questionId, result])),
      )
      setQuizFeedback(res.data.passed ? "passed" : "failed")
      setQuiz({ ...quiz, attempts: [res.data, ...quiz.attempts] })
      setActivityMessage(
        res.data.passed
          ? `Тест пройден: ${res.data.score}/${res.data.maxScore}.`
          : `Нужно повторить: ${res.data.score}/${res.data.maxScore}.`,
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить тест")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6 py-10 md:py-14">
          <aside className="col-span-12 md:col-span-3">
            <Link
              href={`/courses/${courseId}#program`}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 decoration-accent hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />К программе
            </Link>
            <div className="mt-8 border border-rule bg-panel p-4">
              <div className="mono-label text-muted">Прогресс</div>
              <div className="mt-3 font-display text-[40px] leading-none tracking-[-0.02em]">
                {progress?.percent ?? 0}%
              </div>
              <div className="mt-3 text-[12px] leading-[1.5] text-muted">
                {progress
                  ? `${progress.completedLessons} из ${progress.totalLessons} уроков завершено`
                  : "Загрузка прогресса"}
              </div>
            </div>
          </aside>

          <article className="col-span-12 md:col-span-9">
            <div className="mono-label text-accent">
              {currentMeta
                ? `${currentMeta.moduleIndex + 1}.${currentMeta.lessonIndex + 1}`
                : "Урок"}
            </div>
            <h1 className="mt-4 font-display text-[44px] leading-[0.98] tracking-[-0.025em] md:text-[72px]">
              {lesson?.title ?? currentMeta?.title ?? "Открываем урок"}
            </h1>
            {course && (
              <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.65] text-muted">
                {course.title} · {currentMeta?.moduleTitle ?? "модуль"}
              </p>
            )}

            {loading ? (
              <div className="mt-10 inline-flex items-center gap-2 text-[14px] text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Загружаем материалы…
              </div>
            ) : error ? (
              <div
                className="mt-10 border border-accent/60 bg-accent/10 px-4 py-3 text-[14px] text-accent"
                role="alert"
              >
                {error}
              </div>
            ) : lesson ? (
              <div className="mt-10 border-t border-rule pt-8">
                {lesson.type === "VIDEO" && isVideo(lesson.content) ? (
                  <div className="border border-rule bg-panel p-3">
                    <video
                      src={lesson.content ?? undefined}
                      controls
                      preload="metadata"
                      className="aspect-video w-full bg-background object-cover"
                    />
                    <p className="mt-3 text-[13px] leading-[1.55] text-muted">
                      Посмотрите видео и отметьте урок завершенным. После этого MicroLearn вернет
                      вас к программе и подсветит следующий шаг.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-[76ch] whitespace-pre-line text-[16px] leading-[1.75]">
                    {lesson.content || "Материалы урока пока не добавлены."}
                  </div>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {completed ? (
                    <Link
                      href={`/courses/${courseId}?next=${nextLesson?.id ?? lessonId}#program`}
                      className="inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:bg-accent hover:border-accent"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Вернуться к программе
                    </Link>
                  ) : (
                    <button
                      onClick={completeLesson}
                      disabled={busy === "complete" || !canComplete}
                      title={
                        !canComplete && completeBlockers.length > 0
                          ? `Чтобы завершить урок: ${completeBlockers.join(", ")}.`
                          : undefined
                      }
                      className="inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:bg-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy === "complete" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <PlayCircle className="h-4 w-4" aria-hidden />
                      )}
                      Завершить урок
                    </button>
                  )}
                  {nextLesson && (
                    <Link
                      href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                      className="h-11 border border-rule px-5 text-[12px] uppercase tracking-[0.14em] inline-flex items-center hover:border-foreground"
                    >
                      Следующий урок
                    </Link>
                  )}
                </div>

                {!completed && !canComplete && completeBlockers.length > 0 && (
                  <div
                    className="mt-4 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted"
                    role="status"
                  >
                    Чтобы завершить урок, {completeBlockers.join(" и ")}.
                  </div>
                )}

                {activityMessage && (
                  <div className="mt-6 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55]">
                    {activityMessage}
                  </div>
                )}

                {(assignment || quiz) && (
                  <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {assignment && (
                      <section className="border border-rule bg-panel p-5">
                        <div className="mono-label text-muted">Практическая работа</div>
                        <h2 className="mt-3 font-display text-[26px] leading-[1.05] tracking-[-0.01em]">
                          {assignment.title}
                        </h2>
                        <p className="mt-4 text-[14px] leading-[1.6] text-muted">
                          {assignment.instructions}
                        </p>

                        {user?.role === "TEACHER" ? (
                          <ul className="mt-6 border-t border-rule">
                            {assignment.submissions.length === 0 ? (
                              <li className="py-5 text-[13px] text-muted">Сдач пока нет.</li>
                            ) : (
                              assignment.submissions.map((submission) => (
                                <li key={submission.id} className="border-b border-rule py-5">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="font-display text-[18px] leading-tight">
                                        {submission.user.name}
                                      </div>
                                      <div className="mt-1 mono-label text-muted">
                                        {submission.status}
                                        {submission.score != null ? ` · ${submission.score}` : ""}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          reviewSubmission(submission.id, "REVIEWED", 90)
                                        }
                                        disabled={busy === submission.id}
                                        className="border border-foreground bg-foreground px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-background disabled:opacity-50"
                                      >
                                        Зачесть
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          reviewSubmission(submission.id, "NEEDS_REVISION")
                                        }
                                        disabled={busy === submission.id}
                                        className="border border-rule px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-50"
                                      >
                                        Доработать
                                      </button>
                                    </div>
                                  </div>
                                  <p className="mt-4 text-[14px] leading-[1.6]">
                                    {submission.content}
                                  </p>
                                  {submission.feedback && (
                                    <p className="mt-3 text-[13px] leading-[1.55] text-muted">
                                      Отзыв: {submission.feedback}
                                    </p>
                                  )}
                                </li>
                              ))
                            )}
                          </ul>
                        ) : (
                          <div className="mt-6">
                            {assignment.submissions[0] && (
                              <div className="mb-4 border border-rule bg-background px-4 py-3 text-[13px] leading-[1.55]">
                                Статус: {assignment.submissions[0].status}
                                {assignment.submissions[0].score != null
                                  ? ` · ${assignment.submissions[0].score}/${assignment.maxScore}`
                                  : ""}
                                {assignment.submissions[0].feedback
                                  ? ` · ${assignment.submissions[0].feedback}`
                                  : ""}
                              </div>
                            )}
                            <textarea
                              value={assignmentText}
                              onChange={(event) => setAssignmentText(event.target.value)}
                              rows={5}
                              className="w-full resize-none border border-rule bg-background p-3 text-[14px] leading-[1.55] outline-none focus:border-foreground"
                              placeholder="Напишите ответ по заданию"
                            />
                            <button
                              type="button"
                              onClick={submitAssignment}
                              disabled={busy === "assignment" || assignmentText.trim().length < 10}
                              className="mt-3 inline-flex h-10 items-center gap-2 border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-50"
                            >
                              <ClipboardCheck className="h-4 w-4" aria-hidden />
                              Отправить работу
                            </button>
                          </div>
                        )}
                      </section>
                    )}

                    {quiz && (
                      <section className="border border-rule bg-panel p-5">
                        <div className="mono-label text-muted">Тест</div>
                        <h2 className="mt-3 font-display text-[26px] leading-[1.05] tracking-[-0.01em]">
                          {quiz.title}
                        </h2>
                        <p className="mt-4 text-[14px] leading-[1.6] text-muted">
                          Проходной балл: {quiz.passingScore}%. Последняя попытка:{" "}
                          {quiz.attempts[0]
                            ? `${quiz.attempts[0].score}/${quiz.attempts[0].maxScore}`
                            : "пока нет"}
                          .
                        </p>
                        <div className="mt-6 space-y-5">
                          {quiz.questions.map((question) => (
                            <fieldset key={question.id} className="border-t border-rule pt-4">
                              <legend className="text-[14px] leading-[1.45]">
                                {question.order}. {question.text}
                              </legend>
                              <div className="mt-3 grid gap-2">
                                {question.options.map((option) => {
                                  const current = quizAnswers[question.id]
                                  const result = quizResults[question.id]
                                  const checked =
                                    question.type === "MULTIPLE_CHOICE"
                                      ? Array.isArray(current) && current.includes(option)
                                      : current === option
                                  const optionState =
                                    result && checked
                                      ? result.correct
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                                        : "border-red-500 bg-red-50 text-red-950"
                                      : checked
                                        ? "border-foreground bg-surface"
                                        : "border-rule bg-background hover:border-foreground"
                                  return (
                                    <label
                                      key={option}
                                      className={[
                                        "flex cursor-pointer items-center gap-3 border px-3 py-2 text-[13px] transition-colors",
                                        optionState,
                                      ].join(" ")}
                                    >
                                      <input
                                        type={
                                          question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"
                                        }
                                        name={question.id}
                                        checked={checked}
                                        onChange={() =>
                                          setQuizAnswer(
                                            question.id,
                                            option,
                                            question.type === "MULTIPLE_CHOICE",
                                          )
                                        }
                                      />
                                      <span>{option}</span>
                                    </label>
                                  )
                                })}
                              </div>
                              {quizResults[question.id] && (
                                <div
                                  className={[
                                    "mt-3 flex items-center justify-between gap-3 border px-3 py-2 text-[12px] leading-[1.45]",
                                    quizResults[question.id].correct
                                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                      : "border-red-500 bg-red-50 text-red-900",
                                  ].join(" ")}
                                  role="status"
                                  aria-live="polite"
                                >
                                  <span className="inline-flex items-center gap-2 font-medium">
                                    {quizResults[question.id].correct ? (
                                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                                    ) : (
                                      <XCircle className="h-4 w-4" aria-hidden />
                                    )}
                                    {quizResults[question.id].correct ? "Верно" : "Неверно"}
                                  </span>
                                  <span className="tnum">
                                    {quizResults[question.id].earned}/
                                    {quizResults[question.id].points} балл.
                                  </span>
                                </div>
                              )}
                            </fieldset>
                          ))}
                        </div>
                        {user?.role === "STUDENT" && (
                          <button
                            type="button"
                            onClick={submitQuiz}
                            disabled={busy === "quiz"}
                            className="mt-5 inline-flex h-10 items-center border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-50"
                          >
                            Отправить тест
                          </button>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  )
}

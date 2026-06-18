"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Heart, Loader2, Star, CheckCircle2, PlayCircle, Lock, CircleDot } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCourse, useCourseProgress, useFetch, useMyFavorites } from "@/lib/hooks"
import { formatKZT } from "@/lib/format"

type Review = {
  id: string
  rating: number
  comment?: string | null
  createdAt: string
  user: { id: string; name: string; avatarUrl?: string | null }
}

const lastLessonKey = (courseId: string) => `ml:last-lesson:${courseId}`

export function CourseDetail({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { data: course, loading, error, reload } = useCourse(id)
  const isEnrolled = course?.isEnrolled ?? false
  const canTrackProgress = !!course && (isEnrolled || course.isTeacher)
  const { data: progress, reload: reloadProgress } = useCourseProgress(canTrackProgress ? id : null)
  const { data: favs, reload: reloadFavs } = useMyFavorites()
  const { data: reviews, reload: reloadReviews } = useFetch<Review[]>(`/reviews/course/${id}`, [id])

  const isFavorited = !!favs?.find((f) => f.courseId === id)
  const canEnrollAsStudent = !user || user.role === "STUDENT" || user.role === "USER"

  const [busy, setBusy] = useState<"enroll" | "unenroll" | "favorite" | "review" | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")

  const allLessons = useMemo(
    () =>
      course?.modules.flatMap((module, moduleIndex) =>
        module.lessons.map((lesson, lessonIndex) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleIndex,
          lessonIndex,
        })),
      ) ?? [],
    [course?.modules],
  )

  const completedLessonIds = new Set(
    progress?.modules.flatMap((module) =>
      module.lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.id),
    ) ?? [],
  )
  const selectedLesson = allLessons.find((lesson) => lesson.id === selectedLessonId) ?? null
  const nextHighlightId = searchParams.get("next")
  const justCompleted = searchParams.get("completed") === "1"
  const nextLesson =
    allLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? allLessons[0] ?? null

  useEffect(() => {
    if (!course || selectedLessonId || allLessons.length === 0) return
    const saved =
      typeof window !== "undefined" ? window.localStorage.getItem(lastLessonKey(id)) : null
    const exists = saved ? allLessons.some((lesson) => lesson.id === saved) : false
    setSelectedLessonId(exists ? saved : allLessons[0].id)
  }, [allLessons, course, id, selectedLessonId])

  async function enroll() {
    if (!user) {
      router.push("/register#register")
      return
    }
    setBusy("enroll")
    setOpError(null)
    try {
      await api.post("/enrollments", { courseId: id })
      await reload()
      await reloadProgress()
    } catch (err) {
      setOpError(
        err instanceof ApiError && err.status === 403
          ? "Запись на курс доступна только студенту. Для проверки обучения войдите под demo-студентом."
          : err instanceof ApiError
            ? err.message
            : "Не удалось записаться",
      )
    } finally {
      setBusy(null)
    }
  }

  async function unenroll() {
    if (!confirm("Отписаться от курса?")) return
    setBusy("unenroll")
    setOpError(null)
    try {
      await api.delete(`/enrollments/${id}`)
      await reload()
      await reloadProgress()
    } catch (err) {
      setOpError(err instanceof ApiError ? err.message : "Не удалось отписаться")
    } finally {
      setBusy(null)
    }
  }

  async function toggleFavorite() {
    if (!user) {
      router.push("/register#register")
      return
    }
    setBusy("favorite")
    setOpError(null)
    try {
      if (isFavorited) {
        await api.delete(`/favorites/${id}`)
      } else {
        await api.post("/favorites", { courseId: id })
      }
      await reloadFavs()
    } catch (err) {
      setOpError(err instanceof ApiError ? err.message : "Не удалось")
    } finally {
      setBusy(null)
    }
  }

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy("review")
    setOpError(null)
    try {
      await api.post("/reviews", {
        courseId: id,
        rating: reviewRating,
        comment: reviewText.trim() || undefined,
      })
      setReviewText("")
      await reloadReviews()
      await reload()
    } catch (err) {
      setOpError(err instanceof ApiError ? err.message : "Не удалось оставить отзыв")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10">
        <div className="text-[14px] text-muted">Загружаем курс…</div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10">
        <div className="text-[14px] text-accent">{error ?? "Курс не найден"}</div>
      </div>
    )
  }

  const priceKZT = course.isFree ? "Бесплатно" : formatKZT(Math.round(course.price * 500))
  const ownReview = reviews?.find((r) => r.user.id === user?.id)
  const percent = progress?.percent ?? 0
  const canOpenLessons = isEnrolled || course.isTeacher

  return (
    <>
      {/* Hero */}
      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid grid-cols-12 gap-6 py-12 md:py-16">
            <div className="col-span-12 lg:col-span-8">
              <div className="mono-label text-accent">{course.category}</div>
              <h1 className="mt-4 font-display text-[10vw] leading-[0.95] tracking-[-0.03em] md:text-[5vw]">
                {course.title}
              </h1>
              <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.6] whitespace-pre-line">
                {course.description}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-[14px]">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-foreground text-foreground" aria-hidden />
                  <span className="tnum">
                    {course.avgRating ? course.avgRating.toFixed(1) : "—"}
                  </span>
                  <span className="text-muted">· {course._count.reviews} отзыв(ов)</span>
                </div>
                <div className="mono-label text-muted">{course._count.enrollments} студент(ов)</div>
                <div className="mono-label text-muted">Автор · {course.teacher.name}</div>
              </div>
            </div>

            <aside className="col-span-12 lg:col-span-4 lg:border-l border-rule lg:pl-6">
              <div className="mono-label text-muted">Стоимость</div>
              <div className="mt-2 font-display text-[40px] lg:text-[56px] leading-none tracking-[-0.02em]">
                {priceKZT}
              </div>

              {opError && (
                <div
                  className="mt-4 border border-accent/60 bg-accent/10 px-3 py-2 text-[13px] text-accent"
                  role="alert"
                >
                  {opError}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {course.isTeacher ? (
                  <div className="border border-rule px-4 py-3 text-[13px] text-muted">
                    Это ваш курс — управление на вкладке «Мои курсы».
                  </div>
                ) : isEnrolled ? (
                  <button
                    onClick={unenroll}
                    disabled={busy === "unenroll"}
                    className="h-12 border border-foreground bg-foreground text-background text-[13px] uppercase tracking-[0.14em] hover:bg-accent hover:border-accent disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {busy === "unenroll" && (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    )}
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Вы записаны — отписаться
                  </button>
                ) : canEnrollAsStudent ? (
                  <button
                    onClick={enroll}
                    disabled={busy === "enroll"}
                    className="h-12 border border-foreground bg-foreground text-background text-[13px] uppercase tracking-[0.14em] hover:bg-accent hover:border-accent disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {busy === "enroll" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Записаться на курс
                  </button>
                ) : (
                  <div className="border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted">
                    Запись на курс доступна только студенту. Для демонстрации обучения войдите как
                    <span className="text-foreground"> temir@microlearn.io</span>.
                  </div>
                )}

                <button
                  onClick={toggleFavorite}
                  disabled={busy === "favorite"}
                  className="h-12 border border-rule text-[13px] uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  <Heart
                    className={["h-4 w-4", isFavorited ? "fill-accent text-accent" : ""].join(" ")}
                    aria-hidden
                  />
                  {isFavorited ? "В избранном" : "В избранное"}
                </button>

                {nextLesson && canOpenLessons && (
                  <Link
                    href={`/courses/${id}/lessons/${nextLesson.id}`}
                    className="h-12 border border-rule bg-panel text-[13px] uppercase tracking-[0.14em] hover:border-foreground inline-flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden />
                    Продолжить обучение
                  </Link>
                )}

                {nextLesson && !isEnrolled && !course.isTeacher && (
                  <div className="border border-rule bg-panel px-4 py-3 text-[12px] leading-[1.55] text-muted">
                    Уроки откроются после записи на курс. Используйте основную кнопку выше, чтобы
                    начать обучение.
                  </div>
                )}
              </div>

              <div className="mt-8 border border-rule bg-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="mono-label text-muted">Прогресс курса</div>
                  <div className="font-display text-[28px] leading-none tracking-[-0.02em]">
                    {percent}%
                  </div>
                </div>
                <div className="mt-4 h-2 border border-rule bg-background" aria-hidden>
                  <div
                    className="h-full bg-foreground transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-3 text-[12px] leading-[1.5] text-muted">
                  {progress
                    ? `${progress.completedLessons} из ${progress.totalLessons} уроков завершено.`
                    : user
                      ? "Прогресс появится после записи на курс."
                      : "Войдите, чтобы сохранять прогресс."}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Программа */}
      <section className="section-rule border-t border-rule" id="program">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <header className="grid grid-cols-12 gap-6 py-10">
            <div className="col-span-12 md:col-span-4">
              <div className="mono-label text-muted">02 / Программа</div>
              <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
                Модули и уроки
              </h2>
            </div>
            <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
              {course.modules.length} модулей ·{" "}
              {course.modules.reduce((a, m) => a + m.lessons.length, 0)} уроков. Нажмите на урок,
              чтобы перейти к видео, тексту или проверочному заданию. После завершения урока
              следующий шаг подсветится в программе.
            </p>
          </header>

          {justCompleted && (
            <div
              className="mb-6 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-foreground"
              role="status"
            >
              Курс завершен по текущей программе. Можно вернуться к любому уроку или открыть
              сертификаты в кабинете студента.
            </div>
          )}

          {course.modules.length === 0 ? (
            <div className="border-t border-rule py-10 text-[14px] text-muted">
              Программа пока не добавлена.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {course.modules.map((mod, mi) => (
                <li key={mod.id} className="border-b border-rule">
                  <div className="grid grid-cols-12 gap-4 bg-panel py-5">
                    <div className="col-span-1 mono-label text-muted self-center">
                      {String(mi + 1).padStart(2, "0")}
                    </div>
                    <div className="col-span-11 self-center font-display text-[20px] md:text-[24px] tracking-[-0.01em]">
                      {mod.title}
                    </div>
                  </div>
                  {mod.lessons.map((lesson, li) => {
                    const active = selectedLessonId === lesson.id
                    const highlighted = nextHighlightId === lesson.id
                    const completed = completedLessonIds.has(lesson.id)
                    const locked = !user || !canOpenLessons
                    const status = completed ? "завершен" : active ? "в процессе" : "не начат"
                    const lessonRowClass = [
                      "grid w-full grid-cols-12 gap-4 py-4 border-t border-rule text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active ? "bg-surface" : "hover:bg-panel",
                      highlighted ? "animate-pulse border-accent bg-accent/10" : "",
                    ].join(" ")
                    const lessonRowContent = (
                      <>
                        <div className="col-span-2 md:col-span-1 mono-label text-muted self-center">
                          {String(mi + 1).padStart(2, "0")}.{String(li + 1).padStart(2, "0")}
                        </div>
                        <div className="col-span-7 md:col-span-8 self-center flex items-center gap-3 text-[15px]">
                          {locked ? (
                            <Lock className="h-4 w-4 text-muted" aria-hidden />
                          ) : completed ? (
                            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
                          ) : active ? (
                            <CircleDot className="h-4 w-4 text-foreground" aria-hidden />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-muted" aria-hidden />
                          )}
                          <span className={active ? "text-foreground" : "text-foreground/90"}>
                            {lesson.title}
                          </span>
                        </div>
                        <div className="col-span-3 mono-label text-muted self-center text-right">
                          <span
                            className={completed ? "text-accent" : active ? "text-foreground" : ""}
                          >
                            {status}
                          </span>
                          <span className="hidden md:inline"> · {lesson.type.toLowerCase()}</span>
                          {lesson.duration ? (
                            <span className="hidden md:inline"> · {lesson.duration} мин</span>
                          ) : null}
                        </div>
                      </>
                    )

                    return canOpenLessons ? (
                      <Link
                        key={lesson.id}
                        href={`/courses/${id}/lessons/${lesson.id}`}
                        onClick={() => {
                          if (typeof window !== "undefined")
                            window.localStorage.setItem(lastLessonKey(id), lesson.id)
                        }}
                        className={lessonRowClass}
                      >
                        {lessonRowContent}
                      </Link>
                    ) : (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={lessonRowClass}
                      >
                        {lessonRowContent}
                      </button>
                    )
                  })}
                </li>
              ))}
            </ul>
          )}

          <div className="border-x border-b border-rule bg-background p-6 md:p-8">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-4">
                <div className="mono-label text-muted">Текущий урок</div>
                <h3 className="mt-3 font-display text-[24px] md:text-[32px] leading-[1.05] tracking-[-0.01em]">
                  {selectedLesson?.title ?? "Выберите урок"}
                </h3>
              </div>
              <div className="col-span-12 md:col-span-8">
                <div className="max-w-[62ch] text-[14px] leading-[1.65] text-muted">
                  {selectedLesson
                    ? "Откройте выбранный урок на отдельной странице: там доступны видео, текст, отметка завершения и переход к следующему материалу."
                    : "Выберите урок из программы. После завершения MicroLearn вернет вас сюда и подсветит следующий шаг."}
                </div>
                {selectedLesson && canOpenLessons && (
                  <Link
                    href={`/courses/${id}/lessons/${selectedLesson.id}`}
                    className="mt-5 inline-flex h-11 items-center border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent"
                  >
                    Открыть урок
                  </Link>
                )}
                {selectedLesson && !canOpenLessons && canEnrollAsStudent && (
                  <button
                    type="button"
                    onClick={enroll}
                    disabled={busy === "enroll"}
                    className="mt-5 inline-flex h-11 items-center border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-60"
                  >
                    {user ? "Записаться и открыть уроки" : "Войти и записаться"}
                  </button>
                )}
                {selectedLesson && !canOpenLessons && !canEnrollAsStudent && (
                  <div className="mt-5 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted">
                    Уроки открываются из роли студента. Для проверки обучения используйте
                    <span className="text-foreground"> temir@microlearn.io</span>.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Отзывы */}
      <section className="section-rule border-t border-rule">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10 py-12">
          <header className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <div className="mono-label text-muted">03 / Отзывы</div>
              <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
                Что говорят
              </h2>
            </div>
            <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
              Отзывы оставляют только записанные студенты.
            </p>
          </header>

          {/* Форма отзыва — только для записанных студентов, без собственного отзыва */}
          {isEnrolled && !ownReview && (
            <form onSubmit={submitReview} className="mt-10 border border-rule p-6 md:p-8">
              <div className="mono-label text-muted">Оставить отзыв</div>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    aria-label={`${n} из 5`}
                    className="text-foreground"
                  >
                    <Star
                      className={[
                        "h-6 w-6",
                        n <= reviewRating ? "fill-foreground" : "opacity-30",
                      ].join(" ")}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Необязательный комментарий"
                className="mt-4 w-full border border-border bg-background p-3 text-[14px] outline-none focus:border-foreground resize-none"
              />
              <button
                type="submit"
                disabled={busy === "review"}
                className="mt-4 h-10 border border-foreground bg-foreground text-background px-5 text-[12px] uppercase tracking-[0.14em] hover:bg-accent hover:border-accent disabled:opacity-60 inline-flex items-center gap-2"
              >
                {busy === "review" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Опубликовать
              </button>
            </form>
          )}

          {reviews && reviews.length > 0 ? (
            <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="border border-rule p-6">
                  <div className="mono-label text-accent">
                    {"★".repeat(r.rating)}
                    <span className="text-muted">
                      {" · "}
                      {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] leading-[1.5]">
                    {r.comment ? (
                      `«${r.comment}»`
                    ) : (
                      <span className="text-muted italic">(без комментария)</span>
                    )}
                  </p>
                  <div className="mt-4 mono-label text-muted">{r.user.name}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 text-[14px] text-muted">Отзывов пока нет.</div>
          )}
        </div>
      </section>
    </>
  )
}

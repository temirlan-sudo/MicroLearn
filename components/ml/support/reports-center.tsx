"use client"

import { useMemo, useState } from "react"
import { LifeBuoy, Loader2, Send } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCourses, useMyEnrollments, useMyReports, type ReportStatus } from "@/lib/hooks"

const statusLabels: Record<ReportStatus, string> = {
  OPEN: "Открыто",
  REVIEWING: "В работе",
  RESOLVED: "Решено",
  DISMISSED: "Отклонено",
}

type FormState = {
  reason: string
  details: string
  courseId: string
}

const emptyForm: FormState = { reason: "", details: "", courseId: "" }

export function ReportsCenter() {
  const { user } = useAuth()
  const { data: reports, loading, error, reload } = useMyReports()
  const { data: enrollments } = useMyEnrollments()
  const { data: teacherCourses } = useCourses(
    user?.role === "TEACHER" ? { teacherId: user.id, limit: 50 } : null,
  )
  const [form, setForm] = useState<FormState>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const courseOptions = useMemo(() => {
    if (user?.role === "TEACHER") {
      return (teacherCourses ?? []).map((course) => ({ id: course.id, title: course.title }))
    }
    return (enrollments ?? []).map((item) => ({ id: item.courseId, title: item.course.title }))
  }, [enrollments, teacherCourses, user?.role])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await api.post("/reports", {
        reason: form.reason.trim(),
        details: form.details.trim(),
        courseId: form.courseId || null,
      })
      setForm(emptyForm)
      await reload()
      setMessage("Обращение отправлено администратору.")
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Не удалось отправить обращение")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-t border-rule" id="reports">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">06 / Поддержка</div>
          <h2 className="mt-3 font-display text-[28px] leading-[1.05] tracking-[-0.01em] md:text-[36px]">
            Обращения
          </h2>
        </div>
        <p className="col-span-12 text-[15px] leading-[1.65] md:col-span-8">
          Здесь можно написать администратору о проблеме с курсом, уроком или модерацией. Ответ и
          статус появятся в этой же ленте.
        </p>
      </header>

      <div className="grid grid-cols-1 border-t border-rule lg:grid-cols-12">
        <form onSubmit={submit} className="lg:col-span-5 lg:border-r lg:border-rule">
          <div className="space-y-4 px-6 py-6 md:px-8">
            <label className="block text-[13px] text-muted">
              Тема
              <input
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Например: не открывается урок"
                className="mt-2 h-10 w-full border border-rule bg-background px-3 text-[14px] text-foreground outline-none focus:border-foreground"
                required
              />
            </label>
            <label className="block text-[13px] text-muted">
              Связанный курс
              <select
                value={form.courseId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, courseId: event.target.value }))
                }
                className="mt-2 h-10 w-full border border-rule bg-background px-3 text-[14px] text-foreground outline-none focus:border-foreground"
              >
                <option value="">Без привязки к курсу</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] text-muted">
              Сообщение
              <textarea
                value={form.details}
                onChange={(event) =>
                  setForm((current) => ({ ...current, details: event.target.value }))
                }
                rows={5}
                placeholder="Опишите, что произошло и какой результат ожидали."
                className="mt-2 w-full resize-none border border-rule bg-background p-3 text-[14px] text-foreground outline-none focus:border-foreground"
                required
              />
            </label>
            {message && (
              <div className="border border-rule bg-panel px-4 py-3 text-[13px]">{message}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              Отправить
            </button>
          </div>
        </form>

        <div className="border-t border-rule lg:col-span-7 lg:border-t-0">
          <div className="px-6 py-6 md:px-8">
            <div className="mono-label text-muted">Мои обращения</div>
          </div>
          {loading ? (
            <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
              Загружаем обращения…
            </div>
          ) : error ? (
            <div className="border-t border-rule px-6 py-8 text-[13px] text-accent md:px-8">
              {error}
            </div>
          ) : (reports ?? []).length === 0 ? (
            <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
              Обращений пока нет.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {(reports ?? []).map((report) => (
                <li key={report.id} className="border-b border-rule px-6 py-5 md:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mono-label text-accent">{statusLabels[report.status]}</div>
                      <h3 className="mt-2 font-display text-[22px] leading-[1.1]">
                        {report.reason}
                      </h3>
                    </div>
                    <div className="text-[12px] text-muted">
                      {new Date(report.updatedAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.6] text-muted">{report.details}</p>
                  <div className="mt-2 text-[12px] text-muted">
                    {report.course?.title ?? "курс не указан"}
                  </div>
                  {report.resolution && (
                    <div className="mt-4 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55]">
                      <div className="mb-1 inline-flex items-center gap-2 mono-label text-muted">
                        <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                        Ответ администратора
                      </div>
                      <div>{report.resolution}</div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

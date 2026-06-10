"use client"

import Link from "next/link"
import { Eye, PlayCircle, Star, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCourses } from "@/lib/hooks"
import { api, ApiError } from "@/lib/api"
import { useState } from "react"
import { formatKZT } from "@/lib/format"

type Status = "PUBLISHED" | "DRAFT" | "ARCHIVED"

const STATUS_LABEL: Record<Status, string> = {
  PUBLISHED: "Опубликован",
  DRAFT: "Черновик",
  ARCHIVED: "В архиве",
}

export function CoursesTable() {
  const { user } = useAuth()
  // Берём все курсы этого преподавателя (включая draft).
  // Для своих курсов бэкенд возвращает и PUBLISHED, и DRAFT.
  const { data, loading, error, reload } = useCourses(
    user?.id ? { teacherId: user.id, limit: 50 } : undefined,
  )
  const courses = data ?? []
  const [busyId, setBusyId] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  async function togglePublish(id: string) {
    setBusyId(id)
    setOpError(null)
    try {
      await api.patch(`/courses/${id}/publish`)
      await reload()
    } catch (e) {
      setOpError(e instanceof ApiError ? e.message : "Не удалось изменить статус")
    } finally {
      setBusyId(null)
    }
  }

  async function removeCourse(id: string) {
    if (!confirm("Удалить курс? Это действие необратимо.")) return
    setBusyId(id)
    setOpError(null)
    try {
      await api.delete(`/courses/${id}`)
      await reload()
    } catch (e) {
      setOpError(e instanceof ApiError ? e.message : "Не удалось удалить")
    } finally {
      setBusyId(null)
    }
  }

  const totalStudents = courses.reduce((a, c) => a + (c._count?.enrollments ?? 0), 0)
  const avgRating =
    courses.length > 0 ? courses.reduce((a, c) => a + (c.avgRating ?? 0), 0) / courses.length : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6 border-b border-rule/40 pb-4">
        <div>
          <h2 className="font-display text-[32px] leading-[1.05] tracking-[-0.02em]">Мои курсы</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {loading
              ? "Загружаем…"
              : `${courses.length} курс(ов) · ${totalStudents.toLocaleString("ru-RU")} студентов · средний балл ${avgRating ? avgRating.toFixed(2) : "—"}`}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/teacher/new"
            className="h-9 inline-flex items-center border border-foreground bg-foreground px-4 text-[12px] uppercase tracking-[0.14em] text-background hover:bg-accent hover:border-accent"
          >
            Новый курс
          </Link>
        </div>
      </div>

      {opError && (
        <div
          className="border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent"
          role="alert"
        >
          {opError}
        </div>
      )}

      {error && <div className="border border-rule px-4 py-6 text-[13px] text-accent">{error}</div>}

      {!loading && courses.length === 0 && !error && (
        <div className="border border-rule px-6 py-10 text-[14px] text-muted">
          У вас пока нет опубликованных курсов.{" "}
          <Link
            href="/teacher/new"
            className="text-foreground underline underline-offset-4 hover:text-accent"
          >
            Создать первый
          </Link>
          .
        </div>
      )}

      {courses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-rule text-left text-[10px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                <th className="w-10 py-3 pr-4 font-normal">№</th>
                <th className="py-3 pr-4 font-normal">Название</th>
                <th className="py-3 pr-4 font-normal">Статус</th>
                <th className="py-3 pr-4 text-right font-normal tnum">Студентов</th>
                <th className="py-3 pr-4 text-right font-normal tnum">Оценка</th>
                <th className="py-3 pr-4 text-right font-normal tnum">Обновлён</th>
                <th className="py-3 pr-4 text-right font-normal tnum">Цена</th>
                <th className="py-3 text-right font-normal" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} className="border-b border-rule/30 hover:bg-surface">
                  <td className="py-5 pr-4 text-[11px] tnum text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-5 pr-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-8 w-8 items-center justify-center border border-rule/40 bg-surface">
                        <PlayCircle className="h-4 w-4 text-foreground" aria-hidden />
                      </span>
                      <div>
                        <div className="font-display text-[17px] leading-tight tracking-[-0.01em] text-foreground">
                          {c.title}
                        </div>
                        <span className="text-[12px] text-muted-foreground">{c.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-5 pr-4 text-right text-[13px] tnum">
                    {(c._count?.enrollments ?? 0).toLocaleString("ru-RU")}
                  </td>
                  <td className="py-5 pr-4 text-right text-[13px] tnum">
                    {c.avgRating > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-foreground text-foreground" aria-hidden />
                        {c.avgRating.toFixed(1)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-5 pr-4 text-right text-[13px] tnum text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="py-5 pr-4 text-right font-display text-[15px] tnum">
                    {c.isFree ? "Бесплатно" : formatKZT(Math.round(c.price * 500))}
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePublish(c.id)}
                        disabled={busyId === c.id}
                        className="h-8 whitespace-nowrap border border-border px-3 text-[11px] uppercase tracking-[0.14em] text-foreground hover:border-foreground disabled:opacity-50"
                      >
                        {c.status === "PUBLISHED" ? "Снять" : "Опубл."}
                      </button>
                      <Link
                        href={`/teacher/courses`}
                        aria-label="Смотреть"
                        className="inline-flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Link>
                      <button
                        onClick={() => removeCourse(c.id)}
                        disabled={busyId === c.id}
                        aria-label={`Удалить курс ${c.title}`}
                        title="Удалить"
                        className="inline-flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    PUBLISHED: "border-foreground text-foreground",
    ARCHIVED: "border-accent text-accent",
    DRAFT: "border-border text-muted-foreground",
  }
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-[0.18em] tnum",
        styles[status],
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "h-1.5 w-1.5",
          status === "PUBLISHED"
            ? "bg-foreground"
            : status === "ARCHIVED"
              ? "bg-accent"
              : "bg-muted-foreground",
        ].join(" ")}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}

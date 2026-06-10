"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useMyEnrollments } from "@/lib/hooks"

/**
 * Активные курсы студента (подписки) с реальным процентом прогресса.
 * Данные: /api/enrollments/my
 */
export function ActiveCourses() {
  const { data, loading, error } = useMyEnrollments()
  const courses = useMemo(() => data ?? [], [data])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"all" | "active" | "completed">("all")

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((item) => {
      const progress = Math.round(item.progressPercent)
      const matchesStatus =
        status === "all" ||
        (status === "active" && progress < 100) ||
        (status === "completed" && progress >= 100)
      const matchesQuery =
        !q ||
        item.course.title.toLowerCase().includes(q) ||
        item.course.category.toLowerCase().includes(q) ||
        item.course.teacher.name.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [courses, query, status])

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Активно</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            В процессе
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Курсы, которые вы сейчас читаете. Дедлайны мягкие — редакция учитывает темп, а не жёсткие
          сроки. Но регулярность помогает удержать серию.
        </p>
      </header>

      {loading && (
        <div className="border-t border-rule px-6 py-10 text-[13px] text-muted md:px-8">
          Загружаем…
        </div>
      )}

      {error && (
        <div className="border-t border-rule px-6 py-10 text-[13px] text-accent md:px-8">
          {error}
        </div>
      )}

      {courses.length > 0 && (
        <div className="grid grid-cols-12 gap-4 border-t border-rule px-6 py-5 md:px-8">
          <div className="col-span-12 md:col-span-7">
            <label className="mono-label text-muted" htmlFor="student-course-search">
              Поиск
            </label>
            <input
              id="student-course-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Курс, категория или преподаватель"
              className="mt-2 h-11 w-full border border-rule bg-background px-4 text-[14px] outline-none focus:border-foreground"
            />
          </div>
          <div className="col-span-12 flex flex-wrap items-end gap-2 md:col-span-5 md:justify-end">
            {[
              ["all", "Все"],
              ["active", "В процессе"],
              ["completed", "Завершены"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value as "all" | "active" | "completed")}
                className={[
                  "h-10 border px-3 text-[11px] uppercase tracking-[0.14em]",
                  status === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-rule hover:border-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
          Пока нет записей. Выберите курс в{" "}
          <Link
            href="/#journal"
            className="text-foreground underline underline-offset-4 hover:text-accent"
          >
            журнале
          </Link>
          .
        </div>
      )}

      {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
        <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
          По этим фильтрам ничего не найдено. Попробуйте другой запрос или сбросьте статус.
        </div>
      )}

      {filteredCourses.length > 0 && (
        <ul className="border-t border-rule">
          {filteredCourses.map((e, i) => {
            const progress = Math.round(e.progressPercent)
            return (
              <li key={e.id} className="border-b border-rule">
                <div className="grid grid-cols-12 gap-4 px-6 py-7 md:px-8">
                  <div className="col-span-1 mono-label text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  <div className="col-span-11 md:col-span-7">
                    <div className="mono-label text-muted">{e.course.category}</div>
                    <h3 className="mt-2 font-display text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.01em]">
                      {e.course.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-muted">автор · {e.course.teacher.name}</p>

                    <div className="mt-5">
                      <div className="flex items-baseline justify-between">
                        <span className="mono-label text-muted">Прогресс</span>
                        <span className="font-display text-[18px] tracking-[-0.01em]">
                          {progress}%
                        </span>
                      </div>
                      <div className="mt-2 h-[2px] bg-rule relative">
                        <div
                          className="absolute inset-y-0 left-0 bg-accent"
                          style={{ width: `${progress}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:items-end justify-between md:pl-6 md:border-l border-rule pt-4 md:pt-0 border-t md:border-t-0">
                    <div className="md:text-right">
                      <div className="mono-label text-muted">Модулей</div>
                      <div className="mt-1 text-[14px] leading-[1.45]">
                        {e.course._count.modules}
                      </div>
                      <div className="mt-1 mono-label text-accent">
                        записан с {new Date(e.enrolledAt).toLocaleDateString("ru-RU")}
                      </div>
                      <div className="mt-4 border border-rule bg-panel px-3 py-2 text-[12px] leading-[1.45] text-muted">
                        {progress >= 100
                          ? "Курс завершен. Можно вернуться к материалам или скачать сертификат в архиве."
                          : progress > 0
                            ? "Следующий шаг: откройте курс и продолжите с последнего урока."
                            : "Следующий шаг: начните первый урок и зафиксируйте прогресс."}
                      </div>
                    </div>
                    <Link
                      href={`/courses/${e.courseId}`}
                      className="self-start md:self-end text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 decoration-accent hover:text-accent"
                    >
                      {progress > 0 ? "Продолжить →" : "Начать курс →"}
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

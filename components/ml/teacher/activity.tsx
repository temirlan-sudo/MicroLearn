"use client"

import { useTeacherDashboard } from "@/lib/hooks"

/**
 * Хроника активности преподавателя — из /api/dashboard/teacher.recentReviews + weeklyEnrollments.
 */
export function TeacherActivity() {
  const { data, loading, error } = useTeacherDashboard()

  // Составим единую ленту: отзывы + агрегированные записи.
  type Entry = { when: Date; title: string; meta: string; kind: string }
  const entries: Entry[] = []

  if (data?.recentReviews) {
    for (const r of data.recentReviews) {
      entries.push({
        when: new Date(r.createdAt),
        title: `${r.user.name} · ${r.rating} / 5`,
        meta: r.comment ? `«${r.comment}»` : `Курс «${r.course.title}»`,
        kind: "Отзыв",
      })
    }
  }
  if (data?.weeklyEnrollments) {
    for (const w of data.weeklyEnrollments) {
      if (w.count > 0) {
        entries.push({
          when: new Date(w.date),
          title: `+ ${w.count} новых студент(ов)`,
          meta: "Запись на курсы",
          kind: "Запись",
        })
      }
    }
  }
  entries.sort((a, b) => b.when.getTime() - a.when.getTime())
  const visible = entries.slice(0, 10)

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">04 / Хроника</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            Последние события
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Отзывы студентов и динамика записей по вашим курсам за последнюю неделю.
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

      {!loading && !error && visible.length === 0 && (
        <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
          Пока тихо — опубликуйте курс, чтобы студенты начали записываться.
        </div>
      )}

      {visible.length > 0 && (
        <ul className="border-t border-rule">
          {visible.map((item, i) => {
            const day = item.when.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
            const time = item.when.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })
            return (
              <li
                key={i}
                className="grid grid-cols-12 gap-4 px-6 py-5 md:px-8 border-b border-rule"
              >
                <div className="col-span-3 md:col-span-2 mono-label text-muted">
                  {day} · {time}
                </div>
                <div className="col-span-6 md:col-span-8">
                  <div className="text-[15px] md:text-[16px] leading-[1.45] text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[13px] text-muted">{item.meta}</div>
                </div>
                <div className="col-span-3 md:col-span-2 mono-label text-accent text-right self-start">
                  {item.kind}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

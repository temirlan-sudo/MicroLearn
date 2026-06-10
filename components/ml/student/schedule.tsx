"use client"

import { useMyEnrollments } from "@/lib/hooks"

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

/**
 * Недельное расписание — раскладываем активные enrollments по 7 дням
 * начиная с текущего понедельника (по одному напоминанию в день).
 */
export function Schedule() {
  const { data: enrollments } = useMyEnrollments()
  const active = (enrollments ?? []).filter((e) => e.progressPercent < 100)

  const today = new Date()
  const monday = new Date(today)
  const dow = (today.getDay() + 6) % 7 // 0 = пн
  monday.setDate(today.getDate() - dow)

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const e = active[i % Math.max(1, active.length)] ?? null
    return {
      day: WD[i],
      date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      items: active.length > 0 && e ? [{ time: "19:00", title: `${e.course.title}` }] : [],
    }
  })

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">03 / Календарь</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            На этой неделе
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Мягкие дедлайны и запланированные сессии вопросов-ответов. Всё, что отображается здесь,
          можно пропустить и наверстать позже.
        </p>
      </header>

      <div className="grid grid-cols-7 border-t border-rule">
        {week.map((day, i) => (
          <div
            key={day.date}
            className={[
              "min-h-[140px] px-3 md:px-4 py-5",
              i !== 0 ? "border-l border-rule" : "",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between">
              <span className="mono-label text-muted">{day.day}</span>
              <span className="text-[11px] text-muted">{day.date}</span>
            </div>
            <ul className="mt-4 space-y-3">
              {day.items.length === 0 ? (
                <li className="text-[12px] text-muted">—</li>
              ) : (
                day.items.map((item, j) => (
                  <li key={j} className="text-[12px] leading-[1.4]">
                    <div className="mono-label text-accent">{item.time}</div>
                    <div className="mt-1 text-foreground">{item.title}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

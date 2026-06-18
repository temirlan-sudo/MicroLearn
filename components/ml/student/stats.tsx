"use client"

import { useMyCertificates, useStudentDashboard } from "@/lib/hooks"

/**
 * Четыре ключевых показателя студента, данные из /api/dashboard/student + /api/certificates/my.
 */
export function StudentStats() {
  const { data, loading } = useStudentDashboard()
  const { data: certs } = useMyCertificates()

  const stats = [
    {
      label: "В процессе",
      value: loading ? "—" : String(data?.coursesInProgress ?? 0),
      meta: "курсов активно",
    },
    {
      label: "Завершено",
      value: loading ? "—" : String(data?.coursesCompleted ?? 0),
      meta: "полностью пройдено",
    },
    {
      label: "Сертификатов",
      value: certs ? String(certs.length) : loading ? "—" : "0",
      meta: "подтверждённых",
    },
    {
      label: "Серия",
      value: loading ? "—" : String(data?.currentStreak ?? 0),
      meta: "дней подряд",
    },
  ]

  return (
    <section className="border-t border-rule">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={[
              "px-6 py-8 md:px-8 md:py-10",
              index % 2 !== 0 ? "border-l border-rule" : "",
              index >= 2 ? "border-t lg:border-t-0" : "",
              index !== 0 && index !== 2 ? "lg:border-l border-rule" : "",
              index === 2 ? "lg:border-l border-rule" : "",
            ].join(" ")}
          >
            <div className="mono-label text-muted">{stat.label}</div>
            <div className="mt-3 font-display text-[44px] md:text-[60px] leading-[0.95] tracking-[-0.02em]">
              {stat.value}
            </div>
            <div className="mt-3 text-[13px] text-muted">{stat.meta}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

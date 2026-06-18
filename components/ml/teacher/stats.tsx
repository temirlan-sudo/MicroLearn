"use client"

import { useTeacherDashboard } from "@/lib/hooks"

/**
 * Блок показателей преподавателя — данные из /api/dashboard/teacher.
 */
export function TeacherStats() {
  const { data, loading } = useTeacherDashboard()

  const last7days = data?.weeklyEnrollments?.reduce((a, b) => a + b.count, 0) ?? 0

  const stats = [
    {
      label: "Студентов",
      value: loading ? "—" : (data?.totalStudents ?? 0).toLocaleString("ru-RU"),
      delta: `+${last7days} за неделю`,
    },
    {
      label: "Курсов",
      value: loading ? "—" : String(data?.totalCourses ?? 0),
      delta: "опубликовано",
    },
    {
      label: "Средний балл",
      value: loading ? "—" : data?.avgRating ? data.avgRating.toFixed(1) : "—",
      delta: `по ${data?.recentReviews?.length ?? 0} отзывам (последним)`,
    },
    {
      label: "Просмотры",
      value: loading ? "—" : String(data?.totalViews ?? 0),
      delta: "включая записи",
    },
  ]

  return (
    <section className="border-t border-rule">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={[
              "px-6 py-8 md:px-8 md:py-10",
              index !== 0 ? "md:border-l border-rule" : "",
              index !== 0 ? "border-t md:border-t-0" : "",
            ].join(" ")}
          >
            <div className="mono-label text-muted">{stat.label}</div>
            <div className="mt-3 font-display text-[40px] md:text-[52px] leading-[0.95] tracking-[-0.02em] text-foreground">
              {stat.value}
            </div>
            <div className="mt-3 text-[13px] text-muted">{stat.delta}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

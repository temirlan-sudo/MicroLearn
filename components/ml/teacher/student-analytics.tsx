"use client"

import Link from "next/link"
import { useTeacherStudentAnalytics } from "@/lib/hooks"

export function TeacherStudentAnalytics() {
  const { data, loading, error } = useTeacherStudentAnalytics()
  const rows = data ?? []

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">05 / Студенты</div>
          <h2 className="mt-3 font-display text-[28px] leading-[1.05] tracking-[-0.01em] md:text-[36px]">
            Аналитика по студентам
          </h2>
        </div>
        <p className="col-span-12 text-[15px] leading-[1.65] md:col-span-8">
          Прогресс, тесты, задания и сертификаты по каждому студенту на курсах преподавателя.
        </p>
      </header>

      {loading && (
        <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
          Загружаем аналитику…
        </div>
      )}
      {error && (
        <div className="border-t border-rule px-6 py-8 text-[13px] text-accent md:px-8">
          {error}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
          Пока нет записанных студентов.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border-t border-rule">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-rule text-left text-[10px] uppercase tracking-[0.18em] text-muted">
                <th className="px-6 py-3 font-normal md:px-8">Студент</th>
                <th className="px-4 py-3 font-normal">Курс</th>
                <th className="px-4 py-3 text-right font-normal">Уроки</th>
                <th className="px-4 py-3 text-right font-normal">Тесты</th>
                <th className="px-4 py-3 font-normal">Задания</th>
                <th className="px-4 py-3 font-normal">Сертификат</th>
                <th className="px-6 py-3 text-right font-normal md:px-8">Активность</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((row) => (
                <tr
                  key={`${row.student.id}-${row.course.id}`}
                  className="border-b border-rule/50 align-top hover:bg-panel"
                >
                  <td className="px-6 py-5 md:px-8">
                    <div className="font-display text-[17px] leading-tight">{row.student.name}</div>
                    <div className="mt-1 text-[12px] text-muted">{row.student.email}</div>
                  </td>
                  <td className="px-4 py-5">
                    <Link href={`/courses/${row.course.id}`} className="hover:text-accent">
                      {row.course.title}
                    </Link>
                    <div className="mt-1 mono-label text-muted">
                      записан {new Date(row.enrolledAt).toLocaleDateString("ru-RU")}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-right">
                    <div className="font-display text-[20px]">{row.progressPercent}%</div>
                    <div className="text-[12px] text-muted">
                      {row.completedLessons}/{row.totalLessons}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-right text-[13px]">
                    {row.quizAverage == null ? "—" : `${row.quizAverage}%`}
                  </td>
                  <td className="px-4 py-5 text-[12px] leading-[1.6] text-muted">
                    SUB {row.assignments.SUBMITTED ?? 0} · REV {row.assignments.REVIEWED ?? 0} · FIX{" "}
                    {row.assignments.NEEDS_REVISION ?? 0}
                  </td>
                  <td className="px-4 py-5 text-[12px] leading-[1.6]">
                    {row.certificates[0] ? (
                      <Link
                        href={`/certificates/verify/${row.certificates[0].verificationCode}`}
                        className="underline underline-offset-4 decoration-accent hover:text-accent"
                      >
                        {row.certificates[0].status}
                      </Link>
                    ) : (
                      <span className="text-muted">нет</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right text-[12px] text-muted md:px-8">
                    {new Date(row.lastActivity).toLocaleString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

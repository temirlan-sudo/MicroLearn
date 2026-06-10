"use client"

import Link from "next/link"
import { formatKZT } from "@/lib/format"
import { useAuth } from "@/lib/auth-context"
import { useCourses } from "@/lib/hooks"

/**
 * Каталог курсов преподавателя (текущего пользователя).
 */
export function TeacherCourses() {
  const { user } = useAuth()
  const { data } = useCourses(user?.id ? { teacherId: user.id, limit: 30 } : undefined)
  const courses = data ?? []

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Курсы</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Указатель
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Все курсы, которые Анна ведёт сейчас. Новый выпуск — раз в квартал, обновления — по мере
          изменений в индустрии.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
          Пока нет опубликованных курсов.
        </div>
      ) : (
        <ul className="border-t border-rule">
          {courses.map((course, i) => (
            <li key={course.id} className="border-b border-rule">
              <Link
                href={`/courses/${course.id}`}
                className="group grid grid-cols-12 gap-4 px-6 py-6 md:px-8 hover:bg-panel transition-colors"
              >
                <div className="col-span-1 mono-label text-muted">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="col-span-11 md:col-span-5">
                  <div className="mono-label text-muted">{course.category}</div>
                  <div className="mt-2 font-display text-[20px] md:text-[24px] leading-[1.2] tracking-[-0.01em] group-hover:text-accent">
                    {course.title}
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2 mono-label text-muted md:text-right self-center">
                  {course._count.reviews} отзыв(ов)
                </div>
                <div className="col-span-4 md:col-span-2 mono-label text-muted md:text-right self-center">
                  ★ {course.avgRating ? course.avgRating.toFixed(1) : "—"} ·{" "}
                  {(course._count.enrollments ?? 0).toLocaleString("ru-RU")}
                </div>
                <div className="col-span-4 md:col-span-2 font-display text-[18px] md:text-[20px] tracking-[-0.01em] md:text-right self-center">
                  {course.isFree ? "Бесплатно" : formatKZT(Math.round(course.price * 500))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

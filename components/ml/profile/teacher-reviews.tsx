"use client"

import { useTeacherDashboard } from "@/lib/hooks"

/**
 * Отзывы из /api/dashboard/teacher.recentReviews.
 */
export function TeacherReviews() {
  const { data } = useTeacherDashboard()
  const reviews = (data?.recentReviews ?? []).slice(0, 3)

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">03 / Отзывы</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Что говорят
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Цитаты из отзывов студентов. Мы не фильтруем по оценкам — критика тоже полезна.
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
          Отзывов пока нет.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-rule">
          {reviews.map((r, i) => (
            <blockquote
              key={r.id}
              className={[
                "px-6 py-8 md:px-8 md:py-10",
                i !== 0 ? "border-t md:border-t-0 md:border-l border-rule" : "",
              ].join(" ")}
            >
              <div className="mono-label text-accent">
                {"★".repeat(r.rating)}
                <span className="text-muted">
                  {" · "}
                  {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <p className="mt-5 font-display text-[20px] md:text-[22px] leading-[1.3] tracking-[-0.01em] text-balance">
                {r.comment ? (
                  `«${r.comment}»`
                ) : (
                  <span className="text-muted italic">(без комментария)</span>
                )}
              </p>
              <footer className="mt-6 text-[13px]">
                <div>{r.user.name}</div>
                <div className="mono-label text-muted mt-1">Курс · {r.course.title}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  )
}

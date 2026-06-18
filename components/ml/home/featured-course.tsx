"use client"

import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import { useCourses } from "@/lib/hooks"
import { formatKZT } from "@/lib/format"

export function FeaturedCourse() {
  const { data } = useCourses({ sort: "rating", limit: 1 })
  const top = data?.[0]

  return (
    <section id="journal" className="section-rule bg-surface">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-16 md:py-24">
          <div className="col-span-12 md:col-span-4">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              Курс выпуска
            </span>
            <h2 className="mt-6 font-display text-[8vw] leading-[0.9] tracking-[-0.035em] md:text-[3.8vw]">
              Один курс,
              <br />
              <span className="italic">одна глубина</span>
            </h2>
            <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.55] text-foreground">
              Каждый месяц редакция выбирает один курс и разбирает его подробно: кому подойдёт, что
              внутри, что на выходе.
            </p>
            <div className="mt-8 font-display text-[18vw] leading-none tracking-[-0.05em] text-accent md:text-[8vw]">
              03
            </div>
          </div>

          <article className="col-span-12 md:col-span-8">
            <div className="grid grid-cols-12 gap-x-6 border-t border-rule/40 pt-6">
              <div className="col-span-12 md:col-span-3">
                <div
                  className="font-display leading-[0.82] text-accent"
                  style={{ fontVariationSettings: '"opsz" 96, "wdth" 75' }}
                >
                  <div className="text-[20vw] md:text-[8vw]">№</div>
                  <div className="text-[14vw] tnum md:text-[5.5vw]">01</div>
                </div>
              </div>

              <div className="col-span-12 md:col-span-9">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                  <span>{top?.category ?? "Разработка"}</span>
                  <span>·</span>
                  <span>{top?._count?.reviews ?? 0} отзыв(ов)</span>
                </div>

                <h3 className="mt-4 font-display text-[8vw] leading-[0.95] tracking-[-0.03em] md:text-[3.6vw]">
                  {top ? top.title : "React и TypeScript на практике"}
                </h3>

                <p className="mt-5 max-w-[50ch] text-[15px] leading-[1.55] text-foreground">
                  {top
                    ? top.description.slice(0, 260) + (top.description.length > 260 ? "…" : "")
                    : "Редакция каждый месяц выбирает один курс и разбирает его глубоко."}
                </p>

                <dl className="mt-8 grid grid-cols-2 gap-4 text-[13px] tnum md:grid-cols-4">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Оценка
                    </dt>
                    <dd className="mt-1 flex items-center gap-1 font-display text-[18px]">
                      <Star className="h-4 w-4 fill-foreground text-foreground" aria-hidden />{" "}
                      {top?.avgRating ? top.avgRating.toFixed(1) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Студентов
                    </dt>
                    <dd className="mt-1 font-display text-[18px]">
                      {top ? (top._count.enrollments ?? 0).toLocaleString("ru-RU") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Автор
                    </dt>
                    <dd className="mt-1 font-display text-[18px]">{top?.teacher.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Стоимость
                    </dt>
                    <dd className="mt-1 font-display text-[18px]">
                      {top
                        ? top.isFree
                          ? "Бесплатно"
                          : formatKZT(Math.round(top.price * 500))
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link
                    href={top ? `/courses/${top.id}` : "/register"}
                    className="inline-flex items-center gap-3 border border-foreground bg-foreground px-5 py-3 text-[13px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    Открыть курс
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  {top && (
                    <Link
                      href={`/teachers/${top.teacher.id}`}
                      className="text-[13px] text-muted-foreground hover:text-foreground"
                    >
                      Об авторе
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

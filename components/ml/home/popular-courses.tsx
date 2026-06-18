"use client"

import Link from "next/link"
import { ArrowUpRight, Clock, Star } from "lucide-react"
import { useCourses } from "@/lib/hooks"
import { formatKZT } from "@/lib/format"

function monoOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function PopularCourses() {
  const { data, loading, error } = useCourses({ sort: "rating", limit: 6 })
  const courses = data ?? []

  return (
    <section id="popular" className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-16 md:py-24">
          <div className="col-span-12 md:col-span-4">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              Популярное
            </span>
            <h2 className="mt-6 font-display text-[8vw] leading-[0.9] tracking-[-0.035em] md:text-[3.8vw]">
              Курсы, которые
              <br />
              <span className="italic">читают сейчас</span>
            </h2>
            <p className="mt-5 max-w-[32ch] text-[14px] leading-[1.55] text-foreground">
              Редакционная подборка на этой неделе. Обновляется каждый четверг вместе с выпуском
              номера.
            </p>
            <div className="mt-8 font-display text-[18vw] leading-none tracking-[-0.05em] text-accent md:text-[8vw]">
              04
            </div>
          </div>

          <div className="col-span-12 md:col-span-8">
            {loading && (
              <div className="border border-rule/40 p-8 text-[13px] text-muted-foreground">
                Собираем подборку…
              </div>
            )}
            {error && (
              <div className="border border-rule/40 p-8 text-[13px] text-accent">{error}</div>
            )}
            {!loading && !error && courses.length === 0 && (
              <div className="border border-rule/40 p-8 text-[13px] text-muted-foreground">
                В каталоге пока нет опубликованных курсов.
              </div>
            )}
            {courses.length > 0 && (
              <ul className="grid grid-cols-1 gap-[1px] border border-rule/40 bg-rule/40 md:grid-cols-2">
                {courses.map((c, i) => (
                  <li key={c.id} className="bg-background">
                    <Link
                      href={`/courses/${c.id}`}
                      className="group flex h-full flex-col gap-6 p-6 transition-colors hover:bg-surface"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground tnum">
                        <span>
                          № {String(i + 1).padStart(2, "0")} · {c.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {c._count.reviews} отзыв(ов)
                        </span>
                      </div>

                      <h3 className="font-display text-[28px] leading-[1.05] tracking-[-0.02em] text-foreground">
                        {c.title}
                      </h3>

                      <div className="mt-auto flex items-end justify-between gap-3">
                        <div className="flex items-center gap-3 text-[13px]">
                          <span className="flex h-8 w-8 items-center justify-center border border-rule/40 bg-surface text-[11px] tnum">
                            {monoOf(c.teacher.name)}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-foreground">{c.teacher.name}</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Star
                                className="h-3 w-3 fill-foreground text-foreground"
                                aria-hidden
                              />
                              <span className="tnum">
                                {c.avgRating ? c.avgRating.toFixed(1) : "—"}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={[
                              "border px-2 py-1 text-[11px] uppercase tracking-[0.14em] tnum",
                              c.isFree
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-foreground text-foreground",
                            ].join(" ")}
                          >
                            {c.isFree ? "Бесплатно" : formatKZT(Math.round(c.price * 500))}
                          </span>
                          <ArrowUpRight
                            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

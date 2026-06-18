"use client"

import Link from "next/link"
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react"
import { useTeachers } from "@/lib/hooks"

function monoOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function Instructors() {
  const { data } = useTeachers()
  const authors = (data ?? []).slice(0, 6)

  return (
    <section id="teachers" className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-16 md:py-24">
          <div className="col-span-12 md:col-span-4">
            <div className="flex items-baseline gap-4">
              <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
                Авторы номера
              </span>
            </div>
            <h2 className="mt-6 font-display text-[8vw] leading-[0.9] tracking-[-0.035em] md:text-[4vw]">
              Практики,
              <br />
              <span className="italic text-accent">а не лекторы</span>
            </h2>
            <p className="mt-5 max-w-[32ch] text-[14px] leading-[1.55] text-foreground">
              Каждого автора мы лично читаем, смотрим и собеседуем. Никакого автопостинга, никаких
              SEO-фабрик.
            </p>
            <div className="mt-8 font-display text-[18vw] leading-none tracking-[-0.05em] text-accent md:text-[8vw]">
              02
            </div>
          </div>

          <div className="col-span-12 md:col-span-8">
            {authors.length === 0 ? (
              <div className="border border-rule/30 px-4 py-8 text-[13px] text-muted-foreground">
                Подбираем авторов номера…
              </div>
            ) : (
              <ul className="divide-y divide-rule/30 border-y border-rule/30">
                {authors.map((a, i) => (
                  <li key={a.id}>
                    <Link
                      href={`/teachers/${a.id}`}
                      className="group grid grid-cols-[48px_auto_1fr_auto_auto] items-center gap-4 py-4 text-foreground transition-colors hover:bg-surface md:gap-6"
                    >
                      <span className="text-[11px] tnum text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center border border-rule/40 bg-surface text-[12px] tnum text-foreground">
                        {monoOf(a.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-[18px] tracking-[-0.01em]">
                            {a.name}
                          </span>
                          <BadgeCheck className="h-4 w-4 text-accent" aria-hidden />
                        </div>
                        <span className="block text-[12px] text-muted-foreground">
                          {a.bio ? a.bio.slice(0, 60) : `${a.courseCount} курс(ов)`}
                        </span>
                      </div>
                      <div className="hidden items-center gap-2 text-[13px] tnum md:flex">
                        <Star className="h-4 w-4 fill-foreground text-foreground" aria-hidden />
                        <span className="font-medium">
                          {a.avgRating ? a.avgRating.toFixed(1) : "—"}
                        </span>
                        <span className="text-muted-foreground">· {a.courseCount} курс(ов)</span>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent"
                        aria-hidden
                      />
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

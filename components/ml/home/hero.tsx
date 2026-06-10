"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function HomeHero() {
  return (
    <section id="manifest" className="relative">
      <div className="mx-auto max-w-[1440px] px-4 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 pb-12 pt-10 md:gap-y-0 md:pb-20 md:pt-16">
          {/* Левая метка-номер */}
          <div className="col-span-12 md:col-span-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
                Манифест · 01
              </span>
              <span className="h-px flex-1 bg-rule/40" aria-hidden />
            </div>

            <h1 className="font-display tracking-[-0.035em] text-foreground text-balance">
              <span
                className="block text-[14vw] leading-[0.9] md:text-[8.8vw] md:leading-[0.88]"
                style={{ fontVariationSettings: '"opsz" 96, "wdth" 75' }}
              >
                Учиться —
              </span>
              <span
                className="block pl-[6vw] text-[14vw] leading-[0.9] md:pl-[10vw] md:text-[8.8vw] md:leading-[0.88]"
                style={{ fontVariationSettings: '"opsz" 96, "wdth" 85' }}
              >
                как листать
              </span>
              <span
                className="block text-[14vw] italic leading-[0.9] text-accent md:text-[8.8vw] md:leading-[0.88]"
                style={{ fontVariationSettings: '"opsz" 96, "wdth" 75' }}
              >
                ленту новостей
                <span className="caret" aria-hidden />
              </span>
            </h1>

            <p className="mt-10 max-w-[50ch] text-[15px] leading-[1.55] text-foreground">
              MicroLearn — это современная платформа микрообучения, созданная для тех, кто ценит
              своё время. Каждый урок занимает всего 5-10 минут, но даёт максимум пользы. Учись в
              своём темпе, где угодно и когда удобно — в метро, на обеде или перед сном.
              Закрепляй знания интерактивными тестами, отслеживай свой прогресс и получай
              сертификаты по завершении курсов.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-3 border border-foreground bg-foreground px-5 py-3 text-[13px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
              >
                Начать учиться
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/teacher"
                className="inline-flex items-center gap-2 border-b-2 border-foreground pb-0.5 text-[14px] text-foreground hover:border-accent hover:text-accent"
              >
                Стать автором
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Правая колонка — оглавление и метрики */}
          <aside className="col-span-12 md:col-span-4 md:border-l md:border-rule/40 md:pl-8">
            <h2 className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              В этом выпуске
            </h2>
            <ol className="mt-6 flex flex-col divide-y divide-rule/30 text-[14px]">
              {[
                { text: "Манифест микро-обучения", href: "#manifest" },
                { text: "Авторы номера", href: "#teachers" },
                { text: "Курс выпуска: продуктовый дизайн", href: "#journal" },
                { text: "Популярные курсы", href: "#popular" },
                { text: "Отзывы", href: "#testimonials" },
                { text: "Платформа", href: "#students" },
              ].map((item, i) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group flex items-start gap-4 py-3 transition-colors hover:text-accent"
                    onClick={(e) => {
                      e.preventDefault()
                      const el = document.querySelector(item.href)
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                  >
                    <span className="mt-0.5 text-[11px] tnum text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-foreground group-hover:text-accent">{item.text}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ol>

            <dl className="mt-10 grid grid-cols-2 gap-6">
              <Metric label="курсов" value="1 200" suffix="+" />
              <Metric label="студентов" value="340" suffix="тыс." />
              <Metric label="авторов" value="128" />
              <Metric label="средний балл" value="4,8" suffix="/5" />
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}

function Metric({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5 font-display text-[34px] leading-none tnum text-foreground">
        <span>{value}</span>
        {suffix ? (
          <span className="text-[14px] font-sans text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  )
}

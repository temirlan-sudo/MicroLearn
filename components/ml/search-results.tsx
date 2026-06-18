"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCourses } from "@/lib/hooks"
import { formatKZT } from "@/lib/format"

const PAGES = [
  { title: "Тарифы", href: "/pricing", keywords: "тариф оплата подписка premium pro free" },
  { title: "Регистрация", href: "/register", keywords: "регистрация вход аккаунт логин" },
  {
    title: "Кабинет студента",
    href: "/student",
    keywords: "студент кабинет прогресс расписание курсы",
  },
  {
    title: "Кабинет преподавателя",
    href: "/teacher",
    keywords: "преподаватель курс создать автор",
  },
  { title: "О журнале", href: "/about", keywords: "журнал microlearn редакция обучение" },
  { title: "Контакты", href: "/contacts", keywords: "контакты адрес email астана тараз" },
]

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") ?? "").trim()
  const normalized = query.toLowerCase()
  const {
    data: courses,
    loading,
    error,
  } = useCourses(query ? { search: query, limit: 12 } : { limit: 6 })

  const pages = normalized
    ? PAGES.filter((page) => `${page.title} ${page.keywords}`.toLowerCase().includes(normalized))
    : PAGES

  return (
    <section className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6 py-12 md:py-16">
          <div className="col-span-12 md:col-span-4">
            <div className="mono-label text-accent">Поиск</div>
            <h1 className="mt-4 font-display text-[48px] leading-[0.95] tracking-[-0.03em] md:text-[80px]">
              {query ? "Результаты" : "Указатель"}
            </h1>
          </div>
          <div className="col-span-12 md:col-span-8">
            <p className="max-w-[68ch] text-[16px] leading-[1.65] text-foreground">
              {query
                ? `Материалы по запросу «${query}»: курсы, страницы и демо-разделы MicroLearn.`
                : "Введите запрос в шапке или выберите один из основных разделов платформы."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 border-t border-rule py-10">
          <section className="col-span-12 lg:col-span-7">
            <div className="mono-label text-muted">01 / Курсы</div>
            {error ? (
              <div className="mt-6 border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent">
                {error}
              </div>
            ) : loading ? (
              <div className="mt-6 text-[14px] text-muted">Ищем курсы…</div>
            ) : courses && courses.length > 0 ? (
              <ul className="mt-6 border-t border-rule">
                {courses.map((course, index) => (
                  <li key={course.id} className="border-b border-rule">
                    <Link
                      href={`/courses/${course.id}`}
                      className="grid grid-cols-12 gap-4 py-5 transition-colors hover:bg-panel"
                    >
                      <div className="col-span-2 mono-label text-muted md:col-span-1">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="col-span-10 md:col-span-7">
                        <div className="mono-label text-muted">{course.category}</div>
                        <h2 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.01em]">
                          {course.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.55] text-muted">
                          {course.description}
                        </p>
                      </div>
                      <div className="col-span-6 col-start-3 mono-label text-muted md:col-span-2 md:col-start-auto md:self-center md:text-right">
                        ★ {course.avgRating ? course.avgRating.toFixed(1) : "—"}
                      </div>
                      <div className="col-span-4 font-display text-[18px] tracking-[-0.01em] md:col-span-2 md:self-center md:text-right">
                        {course.isFree ? "Бесплатно" : formatKZT(Math.round(course.price * 500))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 border border-rule bg-panel px-4 py-5 text-[14px] text-muted">
                Курсов по этому запросу пока нет. Попробуйте категорию, тему или имя преподавателя.
              </div>
            )}
          </section>

          <section className="col-span-12 lg:col-span-5">
            <div className="mono-label text-muted">02 / Страницы</div>
            {pages.length > 0 ? (
              <ul className="mt-6 border-t border-rule">
                {pages.map((page, index) => (
                  <li key={page.href} className="border-b border-rule">
                    <Link
                      href={page.href}
                      className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-accent"
                    >
                      <span className="text-[14px]">
                        <span className="mono-label mr-4 text-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {page.title}
                      </span>
                      <span aria-hidden className="text-[16px] text-muted">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 text-[14px] text-muted">
                Страниц по этому запросу не найдено.
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}

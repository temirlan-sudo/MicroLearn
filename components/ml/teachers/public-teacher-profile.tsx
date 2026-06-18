"use client"

import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"
import { useFetch } from "@/lib/hooks"
import { formatKZT } from "@/lib/format"

type PublicTeacher = {
  id: string
  name: string
  email: string
  role: "TEACHER" | "STUDENT" | "USER" | "ADMIN"
  avatarUrl?: string | null
  bio?: string | null
  country?: string | null
  education?: string | null
  createdAt: string
  avgRating: number
  courses: {
    id: string
    title: string
    description: string
    category: string
    price: number
    isFree: boolean
    coverUrl?: string | null
    reviews: { rating: number }[]
    _count: { enrollments: number }
  }[]
}

function initialsOf(name?: string) {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase()
}

function withApiHost(url?: string | null) {
  if (!url) return null
  if (url.startsWith("/uploads")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ?? "http://localhost:7666"
    return `${base}${url}`
  }
  return url
}

/**
 * Публичная карточка преподавателя: данные + список его опубликованных курсов.
 * Отличается от /profile/teacher тем, что здесь нельзя редактировать.
 */
export function PublicTeacherProfile({ id }: { id: string }) {
  const { data, loading, error } = useFetch<PublicTeacher>(`/users/${id}`, [id])

  if (loading) {
    return <div className="px-6 py-16 md:px-8 text-[13px] text-muted">Загрузка…</div>
  }
  if (error || !data) {
    return (
      <div className="px-6 py-16 md:px-8 text-[13px] text-foreground">
        {error ?? "Преподаватель не найден."}
      </div>
    )
  }
  if (data.role !== "TEACHER") {
    return (
      <div className="px-6 py-16 md:px-8 text-[13px] text-foreground">
        Этот пользователь не является преподавателем.
      </div>
    )
  }

  const first = data.name.trim().split(/\s+/)[0] ?? data.name
  const last = data.name.trim().split(/\s+/).slice(1).join(" ")
  const totalStudents = data.courses.reduce((acc, c) => acc + (c._count.enrollments ?? 0), 0)
  const avatar = withApiHost(data.avatarUrl)

  return (
    <section>
      {/* Hero */}
      <div className="grid grid-cols-12 gap-6 px-6 py-10 md:px-8 md:py-14 items-end">
        <div className="col-span-12 md:col-span-2">
          {avatar ? (
            <Image
              src={avatar}
              alt={data.name}
              width={160}
              height={160}
              unoptimized
              className="aspect-square w-full max-w-[160px] border border-foreground object-cover"
            />
          ) : (
            <div
              className="aspect-square w-full max-w-[160px] border border-foreground flex items-center justify-center font-display text-[64px] md:text-[80px] leading-none tracking-[-0.02em]"
              aria-hidden
            >
              {initialsOf(data.name)}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="mono-label text-muted">Профиль · Преподаватель</div>
          <h1 className="mt-3 font-display text-[56px] md:text-[84px] leading-[0.95] tracking-[-0.03em]">
            {first}
            {last ? (
              <>
                <br />
                {last}
              </>
            ) : null}
          </h1>
          <p className="mt-5 text-[16px] md:text-[17px] leading-[1.55] max-w-[52ch]">
            {data.bio || "Преподаватель пока не добавил описание."}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3 md:border-l border-rule md:pl-6 pt-6 md:pt-0 border-t md:border-t-0">
          <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
            <dt className="mono-label text-muted">Курсов</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">{data.courses.length}</dd>
            <dt className="mono-label text-muted">Студентов</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {totalStudents.toLocaleString("ru-RU")}
            </dd>
            <dt className="mono-label text-muted">Рейтинг</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {data.avgRating ? data.avgRating.toFixed(1) : "—"}
            </dd>
            {data.country && (
              <>
                <dt className="mono-label text-muted">Локация</dt>
                <dd className="font-display text-[22px] tracking-[-0.01em]">{data.country}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Список курсов */}
      <div className="border-t border-rule">
        <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
          <div className="col-span-12 md:col-span-4">
            <div className="mono-label text-muted">01 / Курсы</div>
            <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
              Что ведёт
            </h2>
          </div>
          <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
            Все опубликованные курсы этого преподавателя. Клик — чтобы перейти к подробностям и
            записаться.
          </p>
        </header>

        {data.courses.length === 0 ? (
          <div className="border-t border-rule px-6 py-10 md:px-8 text-[14px] text-muted">
            Пока нет опубликованных курсов.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 border-t border-rule">
            {data.courses.map((c, i) => {
              const ratings = c.reviews.map((r) => r.rating)
              const avg =
                ratings.length > 0
                  ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
                  : 0
              return (
                <li key={c.id} className={i % 2 === 1 ? "md:border-l border-rule" : ""}>
                  <Link
                    href={`/courses/${c.id}`}
                    className="group flex h-full flex-col gap-4 border-t border-rule px-6 py-8 md:px-8 md:py-10 first:border-t-0 md:first:border-t hover:bg-surface"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted tnum">
                      <span>
                        № {String(i + 1).padStart(2, "0")} · {c.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" aria-hidden />
                        {avg || "—"}
                      </span>
                    </div>
                    <h3 className="font-display text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.01em] group-hover:text-accent">
                      {c.title}
                    </h3>
                    <p className="text-[14px] leading-[1.55] text-foreground">
                      {c.description.length > 160
                        ? c.description.slice(0, 160) + "…"
                        : c.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-[12px] text-muted">
                      <span>{c._count.enrollments.toLocaleString("ru-RU")} студент(ов)</span>
                      <span className="font-display text-[16px] text-foreground">
                        {c.isFree ? "Бесплатно" : formatKZT(Math.round(c.price * 500))}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

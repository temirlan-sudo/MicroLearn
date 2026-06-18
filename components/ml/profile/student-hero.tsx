"use client"

import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useMyCertificates, useStudentDashboard } from "@/lib/hooks"

function monoOf(name?: string) {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

function splitName(name?: string) {
  if (!name) return ["Гость", ""]
  const parts = name.trim().split(/\s+/)
  return [parts[0] ?? "", parts.slice(1).join(" ")]
}

/**
 * Заголовок профиля студента — данные текущего пользователя + сводка.
 */
export function StudentProfileHero() {
  const { user } = useAuth()
  const { data: dash } = useStudentDashboard()
  const { data: certs } = useMyCertificates()

  const [first, last] = splitName(user?.name)
  const createdYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null
  const years = createdYear ? new Date().getFullYear() - createdYear : 0

  return (
    <section>
      <div className="grid grid-cols-12 gap-6 px-6 py-10 md:px-8 md:py-14 items-end">
        <div className="col-span-12 md:col-span-2">
          {user?.avatarUrl ? (
            <Image
              src={
                user.avatarUrl.startsWith("/uploads")
                  ? `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "")}${user.avatarUrl}`
                  : user.avatarUrl
              }
              alt={user.name}
              width={160}
              height={160}
              unoptimized
              className="aspect-square w-full max-w-[160px] border border-foreground object-cover"
            />
          ) : (
            <div
              className="aspect-square w-full max-w-[160px] border border-foreground flex items-center justify-center font-display text-[64px] md:text-[80px] leading-none tracking-[-0.02em]"
              aria-hidden="true"
            >
              {monoOf(user?.name)}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="mono-label text-muted">Профиль · Студент</div>
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
            {user?.bio ??
              (user?.learningGoal
                ? `Цель обучения: ${user.learningGoal}.`
                : "Добавьте краткое био и цель обучения в настройках профиля.")}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3 md:border-l border-rule md:pl-6 pt-6 md:pt-0 border-t md:border-t-0">
          <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
            <dt className="mono-label text-muted">Учится</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {dash?.coursesInProgress ?? "—"}
            </dd>
            <dt className="mono-label text-muted">Завершено</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {dash?.coursesCompleted ?? "—"}
            </dd>
            <dt className="mono-label text-muted">Сертификатов</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {certs ? certs.length : "—"}
            </dd>
            <dt className="mono-label text-muted">На MicroLearn</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {years > 0 ? `${years} г` : "новый"}
            </dd>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="bg-foreground text-background px-4 h-10 text-[12px] uppercase tracking-[0.14em] hover:bg-accent">
              Редактировать
            </button>
            <button className="border border-rule px-4 h-10 text-[12px] uppercase tracking-[0.14em] hover:border-foreground">
              Поделиться
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

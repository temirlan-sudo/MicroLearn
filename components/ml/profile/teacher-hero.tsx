"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTeacherDashboard } from "@/lib/hooks"
import { api, ApiError } from "@/lib/api"

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
 * Заголовок профиля преподавателя — данные текущего авторизованного teacher.
 */
export function TeacherProfileHero() {
  const { user, refresh } = useAuth()
  const { data: dash } = useTeacherDashboard()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [first, last] = splitName(user?.name)
  const createdYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null
  const years = createdYear ? Math.max(0, new Date().getFullYear() - createdYear) : 0

  const apiHost = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ?? "http://localhost:7666"
  const avatarSrc = user?.avatarUrl
    ? user.avatarUrl.startsWith("/uploads")
      ? `${apiHost}${user.avatarUrl}`
      : user.avatarUrl
    : null

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      await api.post("/users/me/avatar", fd)
      await refresh()
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Не удалось загрузить")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <section>
      <div className="grid grid-cols-12 gap-6 px-6 py-10 md:px-8 md:py-14 items-end">
        <div className="col-span-12 md:col-span-2">
          <div className="relative inline-block max-w-[160px] w-full">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={user?.name ?? "Аватар"}
                width={160}
                height={160}
                unoptimized
                className="aspect-square w-full border border-foreground object-cover"
              />
            ) : (
              <div
                className="aspect-square w-full border border-foreground flex items-center justify-center font-display text-[64px] md:text-[80px] leading-none tracking-[-0.02em]"
                aria-hidden="true"
              >
                {monoOf(user?.name)}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Сменить аватар"
              className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center border border-foreground bg-background text-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="h-4 w-4" aria-hidden />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          {uploadError && <div className="mt-2 text-[11px] text-red-500">{uploadError}</div>}
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
            {user?.bio ??
              "Добавьте био в настройках профиля, чтобы студенты знали, почему вас стоит читать."}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3 md:border-l border-rule md:pl-6 pt-6 md:pt-0 border-t md:border-t-0">
          <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
            <dt className="mono-label text-muted">Курсов</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {dash?.totalCourses ?? "—"}
            </dd>
            <dt className="mono-label text-muted">Студентов</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {dash ? dash.totalStudents.toLocaleString("ru-RU") : "—"}
            </dd>
            <dt className="mono-label text-muted">Рейтинг</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {dash?.avgRating ? dash.avgRating.toFixed(1) : "—"}
            </dd>
            <dt className="mono-label text-muted">Стаж</dt>
            <dd className="font-display text-[22px] tracking-[-0.01em]">
              {years > 0 ? `${years} лет` : "новый"}
            </dd>
          </dl>
        </div>
      </div>
    </section>
  )
}

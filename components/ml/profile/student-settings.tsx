"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { api, ApiError } from "@/lib/api"

/**
 * Форма настроек аккаунта студента. PATCH /api/users/me + POST /api/users/me/avatar.
 */
export function StudentSettings() {
  const { user, refresh } = useAuth()

  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [education, setEducation] = useState("")
  const [learningGoal, setLearningGoal] = useState("")
  const [bio, setBio] = useState("")
  const [age, setAge] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [avatarBusy, setAvatarBusy] = useState(false)

  // Заполняем форму когда user подгрузится.
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setCountry(user.country ?? "")
    setEducation(user.education ?? "")
    setLearningGoal(user.learningGoal ?? "")
    setBio(user.bio ?? "")
    setAge(user.age != null ? String(user.age) : "")
  }, [user])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const ageNum = age.trim() ? Number.parseInt(age, 10) : undefined
      await api.patch("/users/me", {
        name: name.trim() || undefined,
        country: country.trim() || undefined,
        education: education.trim() || undefined,
        learningGoal: learningGoal.trim() || undefined,
        bio: bio.trim() || undefined,
        age: Number.isFinite(ageNum) ? ageNum : undefined,
      })
      await refresh()
      setSuccess("Сохранено.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить")
    } finally {
      setSubmitting(false)
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      await api.post("/users/me/avatar", fd)
      await refresh()
      setSuccess("Аватар обновлён.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить аватар")
    } finally {
      setAvatarBusy(false)
      e.target.value = ""
    }
  }

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">01 / Настройки</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Аккаунт
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">
          Данные, которые видят преподаватели, и сведения, влияющие на ваш опыт.
        </p>
      </header>

      <form onSubmit={onSubmit} className="border-t border-rule">
        <Row label="Имя">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent font-display text-[22px] md:text-[26px] tracking-[-0.01em] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Почта">
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full bg-transparent text-[16px] outline-none text-muted cursor-not-allowed"
          />
        </Row>

        <Row label="Возраст">
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={5}
            max={120}
            className="w-32 bg-transparent text-[16px] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Страна">
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Казахстан"
            className="w-full bg-transparent text-[16px] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Образование">
          <input
            type="text"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="Бакалавриат"
            className="w-full bg-transparent text-[16px] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Цель обучения">
          <input
            type="text"
            value={learningGoal}
            onChange={(e) => setLearningGoal(e.target.value)}
            placeholder="Сменить профессию"
            className="w-full bg-transparent text-[16px] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="О себе">
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Пара фраз, которые увидят преподаватели и другие студенты."
            className="w-full bg-transparent text-[15px] leading-[1.6] outline-none resize-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Аватар">
          <label className="inline-flex items-center gap-3 cursor-pointer text-[13px] uppercase tracking-[0.14em] underline underline-offset-4 decoration-accent hover:text-accent">
            {avatarBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {user?.avatarUrl ? "Заменить" : "Загрузить"}
            <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
          </label>
        </Row>

        {error && (
          <div
            className="mx-6 my-4 border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent md:mx-8"
            role="alert"
          >
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 my-4 border border-foreground/60 bg-foreground/5 px-4 py-3 text-[13px] text-foreground md:mx-8">
            {success}
          </div>
        )}

        <div className="grid grid-cols-12 gap-4 px-6 py-6 md:px-8 border-t border-rule">
          <div className="col-span-12 md:col-start-4 md:col-span-9 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background px-5 h-11 text-[13px] uppercase tracking-[0.14em] hover:bg-accent disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-6 md:px-8 border-t border-rule">
      <div className="col-span-12 md:col-span-3 mono-label text-muted pt-2">{label}</div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "mt-1 w-10 h-5 border border-foreground relative shrink-0",
          checked ? "bg-accent border-accent" : "bg-background",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0 bottom-0 w-5 transition-all",
            checked ? "right-0 bg-background" : "left-0 bg-foreground",
          ].join(" ")}
        />
      </button>
      <span className="text-[14px] leading-[1.5]">
        <span className="block text-foreground">{label}</span>
        <span className="mt-1 block text-muted text-[13px]">{hint}</span>
      </span>
    </label>
  )
}

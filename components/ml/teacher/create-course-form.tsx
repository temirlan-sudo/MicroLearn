"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { api, ApiError } from "@/lib/api"

const categories = ["Разработка", "Дизайн", "Маркетинг", "Аналитика", "Менеджмент", "Финансы"]

/**
 * Форма первичной публикации курса — редакторский брифинг.
 * Отправляет POST /api/courses (создаёт DRAFT), затем редиректит на /teacher/courses.
 */
export function CreateCourseForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(categories[0])
  const [level, setLevel] = useState("Начальный")
  const [price, setPrice] = useState(12900)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>, publish: boolean) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (title.trim().length < 3) {
      setError("Название должно быть не короче 3 символов")
      return
    }
    const composedDescription = [subtitle.trim(), description.trim(), `Уровень: ${level}`]
      .filter(Boolean)
      .join("\n\n")
    if (composedDescription.length < 10) {
      setError("Добавьте описание (минимум 10 символов)")
      return
    }

    setSubmitting(true)
    try {
      // Конвертируем тенге → USD (примерная ставка 500 KZT ≈ 1 USD).
      const usdPrice = price > 0 ? Math.round((price / 500) * 100) / 100 : 0
      const res = await api.post<{ data: { id: string } }>("/courses", {
        title: title.trim(),
        description: composedDescription,
        category,
        price: usdPrice,
        isFree: usdPrice === 0,
      })

      if (publish) {
        await api.patch(`/courses/${res.data.id}/publish`)
      }

      setSuccess(publish ? "Курс опубликован!" : "Черновик сохранён.")
      setTimeout(() => router.push("/teacher/courses"), 600)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать курс")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Брифинг</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            Новый курс
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Заполните обложку курса. Позже вы добавите модули, уроки и приложения. Черновик виден
          только вам, пока вы не отправите его на редакторское ревью.
        </p>
      </header>

      <form onSubmit={(e) => onSubmit(e, false)} className="border-t border-rule">
        <Row label="Название">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="React и TypeScript на практике"
            required
            minLength={3}
            className="w-full bg-transparent font-display text-[24px] md:text-[32px] leading-[1.1] tracking-[-0.01em] outline-none placeholder:text-muted focus:underline decoration-accent underline-offset-8"
          />
        </Row>

        <Row label="Подзаголовок">
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="От настройки окружения до архитектуры крупных приложений"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Описание">
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Курс для тех, кто уже знает HTML/CSS и хочет писать настоящие приложения без хаоса в состоянии. Практика в трёх проектах."
            className="w-full bg-transparent text-[15px] leading-[1.6] outline-none placeholder:text-muted resize-none focus:underline decoration-accent underline-offset-4"
          />
        </Row>

        <Row label="Категория">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  "text-[14px] pb-1 border-b",
                  category === c
                    ? "border-accent text-accent"
                    : "border-transparent text-foreground/80 hover:text-foreground",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Уровень">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {["Начальный", "Средний", "Продвинутый"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={[
                  "text-[14px] pb-1 border-b",
                  level === l
                    ? "border-accent text-accent"
                    : "border-transparent text-foreground/80 hover:text-foreground",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Длительность">
          <div className="flex items-baseline gap-6">
            <Field label="часов" defaultValue="14" />
            <Field label="минут" defaultValue="30" />
            <Field label="уроков" defaultValue="56" />
          </div>
        </Row>

        <Row label="Стоимость">
          <div className="flex items-baseline gap-3">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-40 bg-transparent font-display text-[28px] md:text-[32px] tracking-[-0.01em] outline-none focus:underline decoration-accent underline-offset-4"
            />
            <span className="mono-label text-muted">тенге</span>
          </div>
        </Row>

        <Row label="Обложка">
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-28 border border-rule bg-panel flex items-center justify-center text-muted mono-label"
              aria-hidden="true"
            >
              16:9
            </div>
            <p className="max-w-[42ch] text-[13px] leading-[1.55] text-muted">
              Обложку можно добавить после создания курса на вкладке управления. Сейчас форма
              сохраняет основную карточку и программу.
            </p>
          </div>
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
          <div
            className="mx-6 my-4 border border-foreground/60 bg-foreground/5 px-4 py-3 text-[13px] leading-[1.55] text-foreground md:mx-8"
            role="status"
          >
            {success} Через несколько секунд откроется список ваших курсов.
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
              Сохранить черновик
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => onSubmit(e as unknown as React.FormEvent<HTMLFormElement>, true)}
              className="border border-rule px-5 h-11 text-[13px] uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Создать и опубликовать
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

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="flex items-baseline gap-2">
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-14 bg-transparent font-display text-[22px] tracking-[-0.01em] outline-none focus:underline decoration-accent underline-offset-4"
      />
      <span className="text-[13px] text-muted">{label}</span>
    </label>
  )
}

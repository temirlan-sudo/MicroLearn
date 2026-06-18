"use client"

import { useState } from "react"
import {
  useMySchedule,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  type ScheduleItem,
} from "@/lib/hooks"

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

type Draft = {
  id: string // "new" для нового элемента
  dayOfWeek: number
  time: string
  title: string
}

export function Schedule() {
  const { data: items, loading, reload } = useMySchedule()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const monday = new Date(today)
  const dow = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - dow)

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
  })

  const byDay = (dayIndex: number) =>
    (items ?? []).filter((it) => it.dayOfWeek === dayIndex).sort((a, b) => a.time.localeCompare(b.time))

  function startAdd(dayIndex: number) {
    setError(null)
    setEditingId("new")
    setDraft({ id: "new", dayOfWeek: dayIndex, time: "19:00", title: "" })
  }

  function startEdit(item: ScheduleItem) {
    setError(null)
    setEditingId(item.id)
    setDraft({ id: item.id, dayOfWeek: item.dayOfWeek, time: item.time, title: item.title })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setError(null)
  }

  async function saveDraft() {
    if (!draft) return
    if (!draft.title.trim()) {
      setError("Название не может быть пустым")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (draft.id === "new") {
        await createScheduleItem({
          dayOfWeek: draft.dayOfWeek,
          time: draft.time,
          title: draft.title.trim(),
        })
      } else {
        await updateScheduleItem(draft.id, { time: draft.time, title: draft.title.trim() })
      }
      await reload()
      cancelEdit()
    } catch {
      setError("Не удалось сохранить")
    } finally {
      setBusy(false)
    }
  }

  async function removeItem(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteScheduleItem(id)
      await reload()
    } catch {
      setError("Не удалось удалить")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">
            03 / Календарь {loading ? "· загрузка…" : ""}
          </div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            На этой неделе
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65] text-foreground">
          Мягкие дедлайны и запланированные сессии вопросов-ответов. Добавляй, переноси и удаляй
          занятия — это твоё личное расписание.
        </p>
      </header>

      {error && <div className="px-6 md:px-8 pb-2 text-[12px] text-accent">{error}</div>}

      <div className="grid grid-cols-7 border-t border-rule">
        {WD.map((day, i) => {
          const dayItems = byDay(i)
          const isAdding = editingId === "new" && draft?.dayOfWeek === i

          return (
            <div
              key={day}
              className={[
                "min-h-[200px] px-4 md:px-5 py-6 flex flex-col",
                i !== 0 ? "border-l border-rule" : "",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <span className="mono-label text-muted">{day}</span>
                <span className="text-[11px] text-muted">{weekDates[i]}</span>
              </div>

              <ul className="mt-4 space-y-3 flex-1">
                {dayItems.length === 0 && !isAdding ? (
                  <li className="text-[12px] text-muted">—</li>
                ) : null}

                {dayItems.map((item) =>
                  editingId === item.id && draft ? (
                    <li key={item.id} className="text-[12px] leading-[1.4] space-y-1">
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                        className="mono-label bg-transparent border-b border-rule text-accent w-full focus:outline-none"
                      />
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        placeholder="Название"
                        className="bg-transparent border-b border-rule text-foreground w-full focus:outline-none"
                      />
                     <div className="flex flex-col items-start gap-1 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={saveDraft}
                          className="mono-label text-accent hover:opacity-70"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                          className="mono-label text-muted hover:opacity-70"
                        >
                          Отмена
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={item.id} className="group text-[12px] leading-[1.4]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="mono-label text-accent">{item.time}</div>
                          <div className="mt-1 text-foreground">{item.title}</div>
                        </div>
                        <div className="hidden group-hover:flex gap-2 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="text-muted hover:text-foreground"
                            aria-label="Редактировать"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={busy}
                            className="text-muted hover:text-accent"
                            aria-label="Удалить"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </li>
                  ),
                )}

                {isAdding && draft ? (
                  <li className="text-[12px] leading-[1.4] space-y-1">
                    <input
                      type="time"
                      value={draft.time}
                      onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                      className="mono-label bg-transparent border-b border-rule text-accent w-full focus:outline-none"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Название занятия"
                      className="bg-transparent border-b border-rule text-foreground w-full focus:outline-none"
                    />
                    <div className="flex flex-col items-start gap-1 pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={saveDraft}
                        className="mono-label text-accent hover:opacity-70"
                      >
                        Добавить
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={cancelEdit}
                        className="mono-label text-muted hover:opacity-70"
                      >
                        Отмена
                      </button>
                    </div>
                  </li>
                ) : null}
              </ul>

              {!isAdding && (
                <button
                  type="button"
                  onClick={() => startAdd(i)}
                  className="mono-label mt-3 text-left text-muted hover:text-accent"
                >
                  + Добавить
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
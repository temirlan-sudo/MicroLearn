"use client"

import { useEffect, useMemo, useState } from "react"
import { Edit3, Loader2, Plus, Trash2 } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCourses, useTeacherAdaptiveInsights, type MicrolearningCard } from "@/lib/hooks"

type CardForm = {
  topic: string
  front: string
  back: string
  hint: string
}

const emptyForm: CardForm = { topic: "", front: "", back: "", hint: "" }

export function TeacherAdaptiveInsights() {
  const { user } = useAuth()
  const { data: myCoursesData, loading: coursesLoading } = useCourses(
    user?.id ? { teacherId: user.id, limit: 50 } : null,
  )
  const myCourses = useMemo(() => myCoursesData ?? [], [myCoursesData])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const { data, loading, error, reload } = useTeacherAdaptiveInsights(selectedCourseId)
  const [form, setForm] = useState<CardForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (myCourses.length === 0) {
      if (selectedCourseId) setSelectedCourseId(null)
      return
    }

    const selectedBelongsToTeacher = myCourses.some((course) => course.id === selectedCourseId)
    if (!selectedCourseId || !selectedBelongsToTeacher) {
      setSelectedCourseId(myCourses[0].id)
    }
  }, [myCourses, selectedCourseId])

  const cardsByTopic = useMemo(() => {
    const map = new Map<string, MicrolearningCard[]>()
    for (const card of data?.cards ?? []) {
      map.set(card.topic, [...(map.get(card.topic) ?? []), card])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [data?.cards])

  function edit(card: MicrolearningCard) {
    setEditingId(card.id)
    setForm({
      topic: card.topic,
      front: card.front,
      back: card.back,
      hint: card.hint ?? "",
    })
    setSuccess(null)
    setActionError(null)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function saveCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourseId) return
    setBusy(true)
    setActionError(null)
    setSuccess(null)
    try {
      const payload = {
        courseId: selectedCourseId,
        topic: form.topic.trim(),
        front: form.front.trim(),
        back: form.back.trim(),
        hint: form.hint.trim() || null,
      }
      if (editingId) {
        await api.patch(`/adaptive/cards/${editingId}`, payload)
        setSuccess("Карточка обновлена.")
      } else {
        await api.post("/adaptive/cards", payload)
        setSuccess("Карточка создана.")
      }
      resetForm()
      await reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Не удалось сохранить карточку")
    } finally {
      setBusy(false)
    }
  }

  async function removeCard(card: MicrolearningCard) {
    if (!confirm(`Удалить карточку по теме "${card.topic}"?`)) return
    setBusy(true)
    setActionError(null)
    setSuccess(null)
    try {
      await api.delete(`/adaptive/cards/${card.id}`)
      setSuccess("Карточка удалена.")
      await reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Не удалось удалить карточку")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">06 / Повторение</div>
          <h2 className="mt-3 font-display text-[28px] leading-[1.05] tracking-[-0.01em] md:text-[36px]">
            Adaptive Insights
          </h2>
        </div>
        <div className="col-span-12 md:col-span-8">
          <p className="text-[15px] leading-[1.65]">
            Темы собираются из ошибок студентов в тестах. Карточки создаёт преподаватель заранее:
            система только подбирает и планирует повторение.
          </p>
          <label className="mt-5 block max-w-md">
            <span className="mono-label text-muted">Курс</span>
            <select
              value={selectedCourseId ?? ""}
              onChange={(event) => {
                setSelectedCourseId(event.target.value || null)
                resetForm()
              }}
              className="mt-2 h-10 w-full border border-rule bg-background px-3 text-[14px] outline-none focus:border-foreground"
            >
              {myCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {coursesLoading && (
        <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
          Загружаем курсы…
        </div>
      )}

      {!coursesLoading && myCourses.length === 0 && (
        <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
          Создайте курс, чтобы добавлять карточки и видеть adaptive-аналитику.
        </div>
      )}

      {selectedCourseId && (
        <>
          <div className="grid grid-cols-1 border-t border-rule lg:grid-cols-12">
            <div className="lg:col-span-7 lg:border-r lg:border-rule">
              <div className="px-6 py-6 md:px-8">
                <div className="mono-label text-muted">Топ слабых тем</div>
              </div>
              {loading ? (
                <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
                  Загружаем аналитику…
                </div>
              ) : error ? (
                <div className="border-t border-rule px-6 py-8 text-[13px] text-accent md:px-8">
                  {error}
                </div>
              ) : (data?.topics ?? []).length === 0 ? (
                <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
                  Пока студенты не ошибались в quiz этого курса.
                </div>
              ) : (
                <ul className="border-t border-rule">
                  {data!.topics.slice(0, 6).map((topic, index) => (
                    <li
                      key={topic.topic}
                      className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-5 md:px-8"
                    >
                      <div className="col-span-2 mono-label text-muted md:col-span-1">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="col-span-10 md:col-span-5">
                        <div className="font-display text-[20px] leading-[1.1]">{topic.topic}</div>
                        <div className="mt-1 text-[12px] text-muted">
                          {topic.cardsCount} карточек в курсе
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <div className="mono-label text-muted">Ошибки</div>
                        <div className="mt-1 text-[14px]">{topic.mistakesCount}</div>
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <div className="mono-label text-muted">Студенты</div>
                        <div className="mt-1 text-[14px]">{topic.studentsCount}</div>
                      </div>
                      <div className="col-span-4 md:col-span-2 md:text-right">
                        <div className="mono-label text-muted">Сила</div>
                        <div className="mt-1 text-[14px]">{topic.avgStrengthScore}%</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={saveCard} className="lg:col-span-5">
              <div className="px-6 py-6 md:px-8">
                <div className="mono-label text-muted">
                  {editingId ? "Редактировать карточку" : "Новая карточка"}
                </div>
              </div>
              <div className="space-y-4 border-t border-rule px-6 py-6 md:px-8">
                <label className="block text-[13px] text-muted">
                  Тема
                  <input
                    value={form.topic}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, topic: event.target.value }))
                    }
                    placeholder="React Hooks"
                    className="mt-2 h-10 w-full border border-rule bg-background px-3 text-[14px] text-foreground outline-none focus:border-foreground"
                    required
                  />
                </label>
                <label className="block text-[13px] text-muted">
                  Вопрос
                  <textarea
                    value={form.front}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, front: event.target.value }))
                    }
                    rows={3}
                    placeholder="Вопрос карточки"
                    className="mt-2 w-full resize-none border border-rule bg-background p-3 text-[14px] text-foreground outline-none focus:border-foreground"
                    required
                  />
                </label>
                <label className="block text-[13px] text-muted">
                  Ответ
                  <textarea
                    value={form.back}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, back: event.target.value }))
                    }
                    rows={4}
                    placeholder="Короткий ответ"
                    className="mt-2 w-full resize-none border border-rule bg-background p-3 text-[14px] text-foreground outline-none focus:border-foreground"
                    required
                  />
                </label>
                <label className="block text-[13px] text-muted">
                  Подсказка
                  <input
                    value={form.hint}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, hint: event.target.value }))
                    }
                    placeholder="Необязательно"
                    className="mt-2 h-10 w-full border border-rule bg-background px-3 text-[14px] text-foreground outline-none focus:border-foreground"
                  />
                </label>

                {actionError && (
                  <div
                    className="border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent"
                    role="alert"
                  >
                    {actionError}
                  </div>
                )}
                {success && (
                  <div className="border border-rule bg-panel px-4 py-3 text-[13px]">{success}</div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-2 border border-foreground bg-foreground px-4 text-[11px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden />
                    )}
                    {editingId ? "Сохранить" : "Добавить"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="h-10 border border-rule px-4 text-[11px] uppercase tracking-[0.14em] hover:border-foreground"
                    >
                      Отмена
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="border-t border-rule">
            <div className="px-6 py-6 md:px-8">
              <div className="mono-label text-muted">Карточки курса</div>
            </div>
            {loading ? (
              <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
                Загружаем карточки…
              </div>
            ) : cardsByTopic.length === 0 ? (
              <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
                Карточек пока нет. Добавьте первую справа.
              </div>
            ) : (
              <div className="grid grid-cols-1 border-t border-rule md:grid-cols-2">
                {cardsByTopic.map(([topic, cards], topicIndex) => (
                  <div
                    key={topic}
                    className={[
                      "border-b border-rule px-6 py-6 md:px-8",
                      topicIndex % 2 === 1 ? "md:border-l" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-[22px] leading-[1.1]">{topic}</h3>
                      <span className="mono-label text-muted">{cards.length} шт.</span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {cards.map((card) => (
                        <li key={card.id} className="border border-rule bg-panel p-3">
                          <div className="text-[14px] leading-[1.45]">{card.front}</div>
                          <div className="mt-2 text-[12px] leading-[1.5] text-muted">
                            {card.back}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => edit(card)}
                              className="inline-flex h-8 w-8 items-center justify-center border border-rule text-muted hover:border-foreground hover:text-foreground"
                              aria-label="Редактировать карточку"
                              title="Редактировать"
                            >
                              <Edit3 className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCard(card)}
                              className="inline-flex h-8 w-8 items-center justify-center border border-rule text-muted hover:border-accent hover:text-accent"
                              aria-label="Удалить карточку"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { api, ApiError } from "@/lib/api"
import { useCourse, useCourses } from "@/lib/hooks"

/**
 * Конструктор курса — работает поверх реальных эндпоинтов /api/modules и /api/lessons.
 * Пользователь выбирает свой курс в dropdown, после чего может добавлять модули/уроки.
 */
export function CourseBuilder() {
  const { user } = useAuth()
  const { data: myCourses } = useCourses(user?.id ? { teacherId: user.id, limit: 50 } : undefined)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Автовыбор первого курса, когда загрузится список.
  useEffect(() => {
    if (!selectedCourseId && myCourses && myCourses.length > 0) {
      setSelectedCourseId(myCourses[0].id)
    }
  }, [myCourses, selectedCourseId])

  const { data: course, reload } = useCourse(selectedCourseId)
  const modules = course?.modules ?? []
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)

  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addModule() {
    const title = newModuleTitle.trim()
    if (!title || !selectedCourseId) {
      console.log("добавить модуль")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post("/modules", {
        courseId: selectedCourseId,
        title,
        order: modules.length,
      })
      setNewModuleTitle("")
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать модуль")
    } finally {
      setBusy(false)
    }
  }

  async function removeModule(id: string) {
    if (!confirm("Удалить модуль со всеми уроками?")) return
    setBusy(true)
    setError(null)
    try {
      await api.delete(`/modules/${id}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить")
    } finally {
      setBusy(false)
    }
  }

  async function addLesson(moduleId: string) {
    const title = prompt("Название урока?")
    if (!title?.trim()) return
    const mod = modules.find((m) => m.id === moduleId)
    setBusy(true)
    setError(null)
    try {
      await api.post("/lessons", {
        moduleId,
        title: title.trim(),
        type: "TEXT",
        order: mod?.lessons.length ?? 0,
      })
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать урок")
    } finally {
      setBusy(false)
    }
  }

  async function removeLesson(_moduleId: string, lessonId: string) {
    if (!confirm("Удалить урок?")) return
    setBusy(true)
    setError(null)
    try {
      await api.delete(`/lessons/${lessonId}`)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить")
    } finally {
      setBusy(false)
    }
  }

  async function updateLesson(
    _moduleId: string,
    lessonId: string,
    payload: { title?: string; type?: string; duration?: number | null; content?: string },
  ) {
    setError(null)
    try {
      await api.patch(`/lessons/${lessonId}`, payload)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить")
    }
  }

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">03 / Конструктор</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
            Программа курса
          </h2>
        </div>
        <div className="col-span-12 md:col-span-8">
          {myCourses && myCourses.length > 0 ? (
            <>
              <label className="mono-label text-muted block mb-2">Курс</label>
              <select
                value={selectedCourseId ?? ""}
                onChange={(e) => setSelectedCourseId(e.target.value || null)}
                className="h-10 w-full max-w-md border border-border bg-background px-3 text-[14px] outline-none focus:border-foreground"
              >
                {myCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-[13px] text-muted">
                {modules.length} модулей · {totalLessons} уроков
              </p>
            </>
          ) : (
            <p className="text-[15px] text-muted">
              Сначала создайте курс на вкладке «Создать курс», затем сюда вернётся программа для
              наполнения.
            </p>
          )}
        </div>
      </header>

      {error && (
        <div
          className="mx-6 my-4 border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent md:mx-8"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="border-t border-rule">
        {modules.map((module, mi) => (
          <div key={module.id} className="border-b border-rule">
            <div className="grid grid-cols-12 gap-4 px-6 py-5 md:px-8 bg-panel">
              <div className="col-span-1 mono-label text-muted self-center">
                {String(mi + 1).padStart(2, "0")}
              </div>
              <div className="col-span-8 md:col-span-9 self-center font-display text-[20px] md:text-[22px] tracking-[-0.01em]">
                {module.title}
              </div>
              <div className="col-span-3 md:col-span-2 self-center flex justify-end gap-4 text-[12px] uppercase tracking-[0.14em]">
                <button
                  onClick={() => addLesson(module.id)}
                  className="underline-offset-4 hover:underline"
                >
                  + УРОК
                </button>
                <button
                  onClick={() => removeModule(module.id)}
                  className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted hover:border-accent hover:text-accent"
                  aria-label="Удалить модуль"
                  title="Удалить модуль"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {module.lessons.map((lesson, li) => (
              <LessonRow
                key={lesson.id}
                mi={mi}
                li={li}
                id={lesson.id}
                moduleId={module.id}
                initialTitle={lesson.title}
                type={lesson.type}
                duration={lesson.duration}
                onSave={(payload) => updateLesson(module.id, lesson.id, payload)}
                onRemove={() => removeLesson(module.id, lesson.id)}
              />
            ))}

            {module.lessons.length === 0 && (
              <div className="px-6 md:px-8 py-6 border-t border-rule text-[13px] text-muted">
                В модуле пока нет уроков.
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedCourseId && modules.length === 0 && (
        <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
          Добавьте первый модуль ниже.
        </div>
      )}

      {selectedCourseId && (
        <div className="grid grid-cols-12 gap-4 px-6 py-6 md:px-8 border-t border-rule">
          <div className="col-span-1 mono-label text-muted self-center">
            {String(modules.length + 1).padStart(2, "0")}
          </div>
          <div className="col-span-8 md:col-span-9 self-center">
            <input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addModule()}
              placeholder="Название нового модуля"
              disabled={busy}
              className="w-full bg-transparent text-[18px] outline-none placeholder:text-muted focus:underline decoration-accent underline-offset-4"
            />
          </div>
          <div className="col-span-3 md:col-span-2 self-center text-right">
            <button
              onClick={addModule}
              disabled={busy}
              className="text-[12px] uppercase tracking-[0.14em] underline underline-offset-4 decoration-accent hover:text-accent disabled:opacity-60 inline-flex items-center gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}+ ДОБАВИТЬ
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function LessonRow({
  mi,
  li,
  id,
  moduleId: _moduleId,
  initialTitle,
  type,
  duration,
  onSave,
  onRemove,
}: {
  mi: number
  li: number
  id: string
  moduleId: string
  initialTitle: string
  type: string
  duration?: number | null
  onSave: (payload: {
    title?: string
    type?: string
    duration?: number | null
    content?: string
  }) => void
  onRemove: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [open, setOpen] = useState(false)
  const [lessonType, setLessonType] = useState(type)
  const [lessonDuration, setLessonDuration] = useState(duration?.toString() ?? "")
  const [lessonContent, setLessonContent] = useState("")
  const [loadedContent, setLoadedContent] = useState(false)

  async function toggleEditor() {
    const next = !open
    setOpen(next)
    if (!next || loadedContent) return
    try {
      const res = await api.get<{
        data: { content?: string | null; type: string; duration?: number | null }
      }>(`/lessons/${id}/content`)
      setLessonContent(res.data.content ?? "")
      setLessonType(res.data.type)
      setLessonDuration(res.data.duration?.toString() ?? "")
      setLoadedContent(true)
    } catch {
      setLessonContent("")
    }
  }

  function saveFull() {
    onSave({
      title: title.trim(),
      type: lessonType,
      duration: lessonDuration.trim() ? Number(lessonDuration) : null,
      content: lessonContent.trim(),
    })
    setOpen(false)
  }

  return (
    <div className="border-t border-rule">
      <div className="grid grid-cols-12 gap-4 px-6 py-4 md:px-8">
        <div className="col-span-1 mono-label text-muted self-center">
          {String(mi + 1).padStart(2, "0")}.{String(li + 1).padStart(2, "0")}
        </div>
        <div className="col-span-7 md:col-span-7 self-center">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== initialTitle) onSave({ title: title.trim() })
            }}
            className="w-full bg-transparent text-[15px] outline-none focus:underline decoration-accent underline-offset-4"
          />
        </div>
        <div className="col-span-2 mono-label text-muted self-center text-right">
          {lessonType.toLowerCase()}
          {lessonDuration ? ` · ${lessonDuration} мин` : ""}
        </div>
        <div className="col-span-2 self-center flex justify-end gap-3 text-[12px] uppercase tracking-[0.14em]">
          <button onClick={toggleEditor} className="text-muted hover:text-foreground">
            {open ? "Скрыть" : "РЕДАКТ."}
          </button>
          <button
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted hover:border-accent hover:text-accent"
            aria-label="Удалить урок"
            title="Удалить урок"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-12 gap-4 border-t border-rule bg-panel px-6 py-5 md:px-8">
          <div className="col-span-12 md:col-span-3 mono-label text-muted">Материалы урока</div>
          <div className="col-span-12 space-y-4 md:col-span-9">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-[13px] text-muted">
                Тип
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value)}
                  className="mt-2 h-10 w-full border border-rule bg-background px-3 text-foreground outline-none focus:border-foreground"
                >
                  <option value="VIDEO">Видео</option>
                  <option value="TEXT">Текст</option>
                  <option value="FILE">Файл</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </label>
              <label className="text-[13px] text-muted">
                Длительность, мин
                <input
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  type="number"
                  min="0"
                  className="mt-2 h-10 w-full border border-rule bg-background px-3 text-foreground outline-none focus:border-foreground"
                />
              </label>
              <div className="text-[13px] text-muted">
                Подсказка
                <div className="mt-2 border border-rule bg-background px-3 py-2 leading-[1.45]">
                  Для видео укажите прямую ссылку на `.mp4` или `.webm`.
                </div>
              </div>
            </div>
            <textarea
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              rows={7}
              placeholder="Текст урока, ссылка на видео или описание задания"
              className="w-full border border-rule bg-background p-3 text-[14px] leading-[1.6] outline-none focus:border-foreground"
            />
            <button
              onClick={saveFull}
              className="h-10 border border-foreground bg-foreground px-4 text-[12px] uppercase tracking-[0.14em] text-background hover:bg-accent hover:border-accent"
            >
              Сохранить урок
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

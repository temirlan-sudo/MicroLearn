"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import {
  useAdaptiveDailyChallenge,
  useStudentWeakTopics,
  type AdaptiveReviewItem,
} from "@/lib/hooks"

const RISK_LABEL: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
}

export function AdaptivePractice() {
  const {
    data: challenge,
    loading: challengeLoading,
    error: challengeError,
    reload: reloadChallenge,
  } = useAdaptiveDailyChallenge()
  const {
    data: weakTopics,
    loading: weakLoading,
    error: weakError,
    reload: reloadWeak,
  } = useStudentWeakTopics()
  const [activeIndex, setActiveIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [answerError, setAnswerError] = useState<string | null>(null)

  const items = challenge?.items ?? []
  const active = items[activeIndex] ?? null

  const nextTopics = useMemo(() => {
    return (challenge?.topics ?? []).map((item) => `${item.count} · ${item.topic}`).join(" / ")
  }, [challenge?.topics])

  async function answer(item: AdaptiveReviewItem, correct: boolean) {
    setBusy(true)
    setAnswerError(null)
    setMessage(null)
    try {
      const res = await api.post<{ data: AdaptiveReviewItem }>(
        `/adaptive/review/${item.id}/answer`,
        {
          correct,
        },
      )
      setMessage(
        correct
          ? `Карточка перенесена на ${new Date(res.data.nextReviewAt).toLocaleDateString("ru-RU")}.`
          : "Карточка вернётся завтра.",
      )
      setShowAnswer(false)
      await Promise.all([reloadChallenge(), reloadWeak()])
      setActiveIndex((current) => Math.min(current, Math.max(0, items.length - 2)))
    } catch (err) {
      setAnswerError(err instanceof ApiError ? err.message : "Не удалось сохранить ответ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="border-t border-rule">
        <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
          <div className="col-span-12 md:col-span-4">
            <div className="mono-label text-muted">01 / Сегодня</div>
            <h2 className="mt-3 font-display text-[30px] leading-[1.05] tracking-[-0.01em] md:text-[42px]">
              Ежедневное повторение
            </h2>
          </div>
          <div className="col-span-12 md:col-span-8">
            <p className="text-[15px] leading-[1.65]">
              Повторение строится из ошибок в тестах: карточка показывает вопрос, затем ответ, а
              кнопки «Знал» и «Ошибся» двигают дату следующего показа.
            </p>
            {nextTopics && <p className="mt-3 mono-label text-accent">{nextTopics}</p>}
          </div>
        </header>

        {challengeLoading ? (
          <div className="border-t border-rule px-6 py-10 text-[13px] text-muted md:px-8">
            Загружаем карточки…
          </div>
        ) : challengeError ? (
          <div className="border-t border-rule px-6 py-10 text-[13px] text-accent md:px-8">
            {challengeError}
          </div>
        ) : !active ? (
          <div className="border-t border-rule px-6 py-10 text-[14px] text-muted md:px-8">
            На сегодня карточек нет. Пройдите quiz и ошибитесь в одной из тем, чтобы система
            назначила повторение.
          </div>
        ) : (
          <div className="grid grid-cols-12 border-t border-rule">
            <aside className="col-span-12 border-b border-rule px-6 py-6 md:px-8 lg:col-span-3 lg:border-b-0 lg:border-r">
              <div className="mono-label text-muted">Карточка</div>
              <div className="mt-3 font-display text-[38px] leading-none">
                {activeIndex + 1}/{items.length}
              </div>
              <div className="mt-4 text-[13px] leading-[1.55] text-muted">
                {active.course.title}
              </div>
              <div className="mt-3 mono-label text-accent">{active.topic}</div>
            </aside>

            <div className="col-span-12 px-6 py-8 md:px-8 lg:col-span-9">
              <div className="max-w-[760px]">
                <div className="mono-label text-muted">Вопрос</div>
                <h3 className="mt-3 font-display text-[28px] leading-[1.1] tracking-[-0.01em] md:text-[40px]">
                  {active.card.front}
                </h3>
                {active.card.hint && (
                  <p className="mt-4 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted">
                    Подсказка: {active.card.hint}
                  </p>
                )}

                {!showAnswer ? (
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className="mt-7 h-11 border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent"
                  >
                    Показать ответ
                  </button>
                ) : (
                  <div className="mt-7 border-t border-rule pt-6">
                    <div className="mono-label text-muted">Ответ</div>
                    <p className="mt-3 text-[16px] leading-[1.7]">{active.card.back}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => answer(active, true)}
                        disabled={busy}
                        className="inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        )}
                        Знал
                      </button>
                      <button
                        type="button"
                        onClick={() => answer(active, false)}
                        disabled={busy}
                        className="inline-flex h-11 items-center gap-2 border border-rule px-5 text-[12px] uppercase tracking-[0.14em] hover:border-accent hover:text-accent disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Ошибся
                      </button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="mt-5 border border-rule bg-panel px-4 py-3 text-[13px]">
                    {message}
                  </div>
                )}
                {answerError && (
                  <div
                    className="mt-5 border border-accent/60 bg-accent/10 px-4 py-3 text-[13px] text-accent"
                    role="alert"
                  >
                    {answerError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-rule">
        <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
          <div className="col-span-12 md:col-span-4">
            <div className="mono-label text-muted">02 / Слабые темы</div>
            <h2 className="mt-3 font-display text-[28px] leading-[1.05] tracking-[-0.01em] md:text-[36px]">
              Слабые темы
            </h2>
          </div>
          <p className="col-span-12 text-[15px] leading-[1.65] md:col-span-8">
            Риск считается просто: чем больше ошибок относительно попыток, тем ниже сила темы.
          </p>
        </header>

        {weakLoading ? (
          <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
            Загружаем…
          </div>
        ) : weakError ? (
          <div className="border-t border-rule px-6 py-8 text-[13px] text-accent md:px-8">
            {weakError}
          </div>
        ) : (weakTopics ?? []).length === 0 ? (
          <div className="border-t border-rule px-6 py-8 text-[14px] text-muted md:px-8">
            Ошибок ещё нет. После первой неудачной попытки quiz здесь появится тема.
          </div>
        ) : (
          <ul className="border-t border-rule">
            {weakTopics!.map((topic, index) => (
              <li
                key={topic.id}
                className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-5 md:px-8"
              >
                <div className="col-span-2 mono-label text-muted md:col-span-1">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="col-span-10 md:col-span-5">
                  <div className="font-display text-[20px] leading-[1.1]">{topic.topic}</div>
                  <div className="mt-1 text-[12px] text-muted">{topic.course.title}</div>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <div className="mono-label text-muted">Ошибки</div>
                  <div className="mt-1 text-[14px]">
                    {topic.mistakesCount}/{topic.attemptsCount}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <div className="mono-label text-muted">Сила</div>
                  <div className="mt-1 text-[14px]">{topic.strengthScore}%</div>
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right">
                  <div className="mono-label text-accent">{RISK_LABEL[topic.riskLevel]}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    {topic.lastMistakeAt
                      ? new Date(topic.lastMistakeAt).toLocaleDateString("ru-RU")
                      : "нет даты"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

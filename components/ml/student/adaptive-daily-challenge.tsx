"use client"

import Link from "next/link"
import { BookOpenCheck, RotateCcw } from "lucide-react"
import { useAdaptiveDailyChallenge, useStudentWeakTopics } from "@/lib/hooks"

const RISK_LABEL: Record<string, string> = {
  high: "высокий риск",
  medium: "средний риск",
  low: "низкий риск",
}

export function AdaptiveDailyChallenge() {
  const {
    data: challenge,
    loading: challengeLoading,
    error: challengeError,
  } = useAdaptiveDailyChallenge()
  const { data: weakTopics, loading: weakLoading, error: weakError } = useStudentWeakTopics()
  const topics = weakTopics ?? []
  const due = challenge?.total ?? 0

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Повторение</div>
          <h2 className="mt-3 font-display text-[28px] leading-[1.05] tracking-[-0.01em] md:text-[36px]">
            Ежедневное повторение
          </h2>
        </div>
        <p className="col-span-12 text-[15px] leading-[1.65] text-foreground md:col-span-8">
          Система смотрит на ошибки в тестах и поднимает короткие карточки по темам, которые требуют
          закрепления. Всё работает на заранее подготовленных материалах курса, без AI.
        </p>
      </header>

      <div className="grid grid-cols-1 border-t border-rule lg:grid-cols-12">
        <div className="px-6 py-7 md:px-8 lg:col-span-4 lg:border-r lg:border-rule">
          <div className="mono-label text-muted">Сегодня</div>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-[56px] leading-none tracking-[-0.02em]">
              {challengeLoading ? "—" : due}
            </span>
            <span className="pb-2 text-[13px] text-muted">карточек к повторению</span>
          </div>

          {challengeError && <p className="mt-4 text-[13px] text-accent">{challengeError}</p>}

          {challengeLoading ? (
            <div className="mt-5 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted">
              Считаем карточки на сегодня…
            </div>
          ) : !challengeError && due === 0 ? (
            <div className="mt-5 border border-rule bg-panel px-4 py-3 text-[13px] leading-[1.55] text-muted">
              На сегодня повторений нет. После ошибки в тесте здесь появятся карточки по слабой
              теме.
            </div>
          ) : !challengeError ? (
            <Link
              href="/student/adaptive"
              className="mt-5 inline-flex h-11 items-center gap-2 border border-foreground bg-foreground px-4 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent"
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden />
              Начать повторение
            </Link>
          ) : null}
        </div>

        <div className="border-t border-rule lg:col-span-4 lg:border-t-0 lg:border-r">
          <div className="px-6 py-7 md:px-8">
            <div className="mono-label text-muted">Темы дня</div>
          </div>
          {challengeLoading ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Загружаем…
            </div>
          ) : (challenge?.topics ?? []).length === 0 ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Нет запланированных тем.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {challenge!.topics.map((item, index) => (
                <li
                  key={item.topic}
                  className="grid grid-cols-12 gap-3 border-b border-rule px-6 py-4 md:px-8"
                >
                  <div className="col-span-2 mono-label text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="col-span-8 text-[14px]">{item.topic}</div>
                  <div className="col-span-2 text-right font-display text-[18px]">{item.count}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-rule lg:col-span-4 lg:border-t-0">
          <div className="px-6 py-7 md:px-8">
            <div className="mono-label text-muted">Слабые темы</div>
          </div>
          {weakLoading ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Загружаем…
            </div>
          ) : weakError ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-accent md:px-8">
              {weakError}
            </div>
          ) : topics.length === 0 ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Пока нет ошибок в quiz.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {topics.slice(0, 3).map((topic) => (
                <li key={topic.id} className="border-b border-rule px-6 py-4 md:px-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[14px] leading-[1.4]">{topic.topic}</div>
                      <div className="mt-1 text-[12px] text-muted">{topic.course.title}</div>
                    </div>
                    <div className="mono-label text-accent">{RISK_LABEL[topic.riskLevel]}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {topic.mistakesCount}/{topic.attemptsCount} ошибок · сила {topic.strengthScore}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

const rows = [
  { label: "Курсы в каталоге", base: "1 / мес", reader: "Все", team: "Все" },
  { label: "Мест в подписке", base: "1", reader: "1", team: "до 10" },
  { label: "Практика и код-ревью", base: "—", reader: "да", team: "да" },
  { label: "Сертификаты с номером", base: "—", reader: "да", team: "да" },
  { label: "Q&A сессии", base: "только запись", reader: "живое участие", team: "живое + закрытые" },
  { label: "Корпоративные отчёты", base: "—", reader: "—", team: "да" },
  { label: "Поддержка редакции", base: "FAQ", reader: "24 ч", team: "приоритет · 4 ч" },
  { label: "Аккаунт-менеджер", base: "—", reader: "—", team: "да" },
]

/**
 * Сравнительная таблица тарифов — строгая редакционная сетка,
 * без иконок и галочек. Значения — словами.
 *
 * Мобилка: карточный режим (одна строка = один пункт, внутри три значения).
 * Десктоп: классическая таблица 5/2/2/3.
 */
export function PricingComparison() {
  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-4 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">02 / Сравнение</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            По пунктам
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">
          Что именно вы получаете на каждом тарифе. Если нужного пункта нет — напишите в редакцию,
          мы добавим или объясним, почему не делаем.
        </p>
      </header>

      {/* Десктопная таблица */}
      <div className="hidden border-t border-rule md:block">
        <div className="grid grid-cols-12 gap-3 bg-panel px-4 py-4 md:px-8">
          <div className="col-span-5 mono-label text-muted">Опция</div>
          <div className="col-span-2 mono-label text-muted text-right">Базовый</div>
          <div className="col-span-2 mono-label text-accent text-right">Читатель</div>
          <div className="col-span-3 mono-label text-muted text-right">Редакция</div>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-12 gap-3 border-t border-rule px-4 py-4 md:px-8"
          >
            <div className="col-span-5 text-[15px]">{row.label}</div>
            <div className="col-span-2 text-right text-[14px] text-muted">{row.base}</div>
            <div className="col-span-2 text-right text-[14px] text-foreground">{row.reader}</div>
            <div className="col-span-3 text-right text-[14px] text-muted">{row.team}</div>
          </div>
        ))}
      </div>

      {/* Мобильные карточки */}
      <ul className="border-t border-rule md:hidden">
        {rows.map((row, i) => (
          <li key={row.label} className="border-b border-rule px-4 py-5">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="mono-label text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[15px] font-medium leading-tight text-foreground">
                  {row.label}
                </span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-rule/40 pt-3 text-[13px]">
              <div className="flex flex-col gap-1">
                <dt className="mono-label text-muted">Базовый</dt>
                <dd className="text-foreground">{row.base}</dd>
              </div>
              <div className="flex flex-col gap-1 border-l border-rule/40 pl-3">
                <dt className="mono-label text-accent">Читатель</dt>
                <dd className="text-foreground">{row.reader}</dd>
              </div>
              <div className="flex flex-col gap-1 border-l border-rule/40 pl-3">
                <dt className="mono-label text-muted">Редакция</dt>
                <dd className="text-foreground">{row.team}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}

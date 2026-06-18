"use client"

import { useState } from "react"

const items = [
  {
    q: "Что если я захочу отменить подписку?",
    a: "Отмена одним кликом в личном кабинете. Доступ сохранится до конца оплаченного периода — никаких скрытых штрафов и удержаний.",
  },
  {
    q: "Можно ли оплатить картой Казахстана?",
    a: "Да. Принимаем Kaspi Gold, Halyk, Visa, Mastercard и платежи через ЮKassa и Stripe. Выбор провайдера — на ваше усмотрение.",
  },
  {
    q: "Подходит ли MicroLearn для команды?",
    a: "Тариф «Редакция» рассчитан на команды до 10 человек. Если вам нужно больше — напишите: мы сделаем индивидуальный договор и внедрение.",
  },
  {
    q: "Что такое «мягкие дедлайны»?",
    a: "Редакция предлагает темп прохождения, но не наказывает за отставание. Пройти курс можно за неделю или за полгода — доступ не сгорит.",
  },
  {
    q: "Есть ли студенческая скидка?",
    a: "Да. При подтверждении статуса студентом колледжа или вуза действует скидка 30% на тариф «Читатель». Напишите в редакцию с удостоверением.",
  },
  {
    q: "Выдаёте ли вы закрывающие документы для компаний?",
    a: "Для юридических лиц в Казахстане и России выдаём счёт-фактуру, ЭСФ и акт выполненных работ. Оплата по безналу — через договор.",
  },
]

/**
 * FAQ по тарифам — аккордеон в редакционном стиле.
 */
export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="border-t border-rule">
      <header className="grid grid-cols-12 gap-6 px-4 py-8 md:px-8">
        <div className="col-span-12 md:col-span-4">
          <div className="mono-label text-muted">03 / Вопросы</div>
          <h2 className="mt-3 font-display text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.01em]">
            Часто спрашивают
          </h2>
        </div>
        <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">
          Если здесь нет вашего вопроса — напишите редакции, и мы ответим лично. Ответы, которые
          спрашивают чаще всего, мы добавляем в эту страницу.
        </p>
      </header>

      <ul className="border-t border-rule">
        {items.map((item, i) => {
          const isOpen = open === i
          return (
            <li key={item.q} className="border-b border-rule">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-5 text-left hover:bg-panel md:grid md:grid-cols-12 md:gap-4 md:px-8 md:py-6"
              >
                <div className="mono-label shrink-0 text-muted md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 font-display text-[17px] leading-[1.3] tracking-[-0.01em] md:col-span-10 md:text-[22px]">
                  {item.q}
                </div>
                <div className="shrink-0 font-display text-[24px] leading-none tracking-[-0.02em] text-accent md:col-span-1 md:text-right md:text-[28px]">
                  {isOpen ? "−" : "+"}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-6 pl-[calc(1rem+2ch+0.75rem)] md:grid md:grid-cols-12 md:gap-4 md:px-8 md:pb-8 md:pl-8">
                  <div className="hidden md:col-span-1 md:block" />
                  <p className="text-[15px] leading-[1.65] text-foreground md:col-span-10">
                    {item.a}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

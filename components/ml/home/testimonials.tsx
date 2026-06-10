const QUOTES = [
  {
    text: "Короткие уроки по 10 минут, которые реально складываются в навык. За две недели собрала первый настоящий макет в Figma и довела его до прототипа.",
    author: "Алия Нурмагамбетова",
    role: "Джуниор-дизайнер, Астана",
    course: "Интерфейсы без лишнего · А. Ковалёва",
    mono: "АН",
  },
  {
    text: "Редкий случай, когда преподаватель не пересказывает документацию, а показывает, как он сам решает задачи. Код-ревью от Лии стоят отдельного тарифа.",
    author: "Игорь Петров",
    role: "Фронтенд-разработчик",
    course: "React и TypeScript на практике · Л. Тен",
    mono: "ИП",
  },
  {
    text: "Пришёл за SQL, остался из-за того, как устроена подача. Материала ровно столько, сколько нужно, без «доливки» до круглой цифры часов.",
    author: "Данияр Кенжебаев",
    role: "Продакт-менеджер, Тараз",
    course: "SQL для продакт-менеджеров · Д. Орлов",
    mono: "ДК",
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="section-rule bg-surface">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-16 md:py-24">
          <div className="col-span-12 md:col-span-4">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              Отзывы номера
            </span>
            <h2 className="mt-6 font-display text-[8vw] leading-[0.9] tracking-[-0.035em] md:text-[3.8vw]">
              Без восторгов,
              <br />
              <span className="italic">по делу</span>
            </h2>
            <p className="mt-5 max-w-[30ch] text-[14px] leading-[1.55] text-foreground">
              Мы публикуем отзывы целиком — включая критику. Редакция не правит стиль автора.
            </p>
            <div className="mt-8 font-display text-[18vw] leading-none tracking-[-0.05em] text-accent md:text-[8vw]">
              05
            </div>
          </div>

          <ul className="col-span-12 grid gap-[1px] border border-rule/40 bg-rule/40 md:col-span-8 md:grid-cols-1">
            {QUOTES.map((q, i) => (
              <li key={q.author} className="bg-surface">
                <figure className="flex flex-col gap-6 p-6 md:flex-row md:gap-10 md:p-10">
                  <div className="flex items-start gap-4 md:w-[30%] md:flex-col md:items-start">
                    <span className="font-display text-[32px] leading-none tnum text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <figcaption className="font-display text-[18px] leading-tight tracking-[-0.01em] text-foreground">
                        {q.author}
                      </figcaption>
                      <span className="text-[12px] text-muted-foreground">{q.role}</span>
                      <span className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground tnum">
                        {q.course}
                      </span>
                    </div>
                  </div>
                  <blockquote className="flex-1">
                    <p className="font-display text-[22px] leading-[1.25] tracking-[-0.015em] text-foreground md:text-[26px]">
                      <span aria-hidden className="text-accent">
                        «
                      </span>
                      {q.text}
                      <span aria-hidden className="text-accent">
                        »
                      </span>
                    </p>
                  </blockquote>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

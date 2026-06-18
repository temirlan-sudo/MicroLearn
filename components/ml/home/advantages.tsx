import { Clock, ShieldCheck, Users, BadgeCheck } from "lucide-react"

const ITEMS = [
  {
    icon: Clock,
    title: "Учиться, когда удобно",
    copy: "Уроки по 8–14 минут, офлайн-доступ, закладки. Плейлист выпуска адаптируется под ваше расписание.",
  },
  {
    icon: Users,
    title: "Настоящие преподаватели",
    copy: "Каждого автора мы собеседуем лично. Программу утверждает редакция, отзывы — открытые.",
  },
  {
    icon: BadgeCheck,
    title: "Сертификат с проверкой",
    copy: "После курса — итоговый проект и код-ревью от куратора. Сертификат содержит ссылку на работу, а не QR-код для галочки.",
  },
  {
    icon: ShieldCheck,
    title: "Без рекламы и уловок",
    copy: "Мы зарабатываем на подписке, а не на внимании. Никаких «успей купить», push-рассылок и даркпаттернов.",
  },
]

export function Advantages() {
  return (
    <section id="students" className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-16 md:py-24">
          <div className="col-span-12 md:col-span-4">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              Платформа
            </span>
            <h2 className="mt-6 font-display text-[8vw] leading-[0.9] tracking-[-0.035em] md:text-[3.8vw]">
              Четыре принципа,
              <br />
              <span className="italic">без лозунгов</span>
            </h2>
            <div className="mt-8 font-display text-[18vw] leading-none tracking-[-0.05em] text-accent md:text-[8vw]">
              06
            </div>
          </div>

          <ul className="col-span-12 grid gap-[1px] border border-rule/40 bg-rule/40 md:col-span-8 md:grid-cols-2">
            {ITEMS.map((it, i) => (
              <li key={it.title} className="flex min-h-[220px] flex-col gap-4 bg-background p-8">
                <div className="flex items-center justify-between text-muted-foreground">
                  <it.icon className="h-6 w-6 text-foreground" aria-hidden />
                  <span className="text-[10px] uppercase tracking-[0.22em] tnum">0{i + 1}</span>
                </div>
                <h3 className="mt-auto font-display text-[26px] leading-[1.05] tracking-[-0.02em] text-foreground">
                  {it.title}
                </h3>
                <p className="text-[13px] leading-[1.55] text-foreground">{it.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

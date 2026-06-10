import Link from "next/link"
import { NewsletterForm } from "@/components/ml/newsletter-form"

/**
 * Подвал-колофон. Крупная надпись логотипа + выходные данные в редакционном стиле.
 */
export function Footer() {
  return (
    <footer id="colophon" className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-x-6 border-b border-rule py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground tnum">
          <span className="col-span-6 md:col-span-3">№ 07 — Колофон</span>
          <span className="col-span-6 md:col-span-3">Подпишитесь на рассылку</span>
          <span className="hidden md:block md:col-span-3">Одно письмо в неделю</span>
          <span className="hidden md:block md:col-span-3 text-right">ISSN 0000-MLRN</span>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-10 py-12 md:py-16">
          <div className="col-span-12 md:col-span-7">
            <h2 className="font-display text-[15vw] leading-[0.8] tracking-[-0.04em] md:text-[11vw]">
              MicroLearn
            </h2>
            <p className="mt-6 max-w-[48ch] text-[15px] leading-[1.55] text-foreground">
              Журнал микро-обучения. Каждый курс отбирает редакция — мы лично смотрим материал,
              общаемся с автором и читаем отзывы. Без стоковых лекций, без накрученных рейтингов.
            </p>
          </div>

          <div className="col-span-12 md:col-span-5 md:col-start-8">
            <h3 className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Рассылка редакции
            </h3>
            <div className="mt-4 border-t border-rule pt-6">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-8 border-t border-rule py-10 text-[13px]">
          <nav aria-label="Продукт" className="col-span-6 md:col-span-3">
            <h4 className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Продукт
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/#journal" className="hover:text-accent">
                  Журнал курсов
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-accent">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/student" className="hover:text-accent">
                  Кабинет студента
                </Link>
              </li>
              <li>
                <Link href="/teacher" className="hover:text-accent">
                  Кабинет преподавателя
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Редакция" className="col-span-6 md:col-span-3">
            <h4 className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Редакция
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/about" className="hover:text-accent">
                  О журнале
                </Link>
              </li>
              <li>
                <Link href="/editorial" className="hover:text-accent">
                  Редакционный устав
                </Link>
              </li>
              <li>
                <Link href="/authors" className="hover:text-accent">
                  Стать автором
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-accent">
                  Контакты
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Право" className="col-span-6 md:col-span-3">
            <h4 className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Право
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/terms" className="hover:text-accent">
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-accent">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/offer" className="hover:text-accent">
                  Оферта
                </Link>
              </li>
            </ul>
          </nav>
          <div className="col-span-6 md:col-span-3">
            <h4 className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Контакты
            </h4>
            <ul className="flex flex-col gap-2 tnum">
              <li>Астана, пр. Абая, 52</li>
              <li>Телефон: 8 771 580 53 53</li>
              <li>Email: microlearn@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-x-6 border-t border-rule py-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground tnum">
          <span className="col-span-12 md:col-span-4">© 2026 MicroLearn LLP</span>
          <span className="hidden md:block md:col-span-4 md:text-center">
            Diploma project
          </span>
          <span className="col-span-12 md:col-span-4 md:text-right">v0.4.1</span>
        </div>
      </div>
    </footer>
  )
}

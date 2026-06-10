"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { SearchBar } from "@/components/ml/search-bar"
import { ThemeToggle } from "@/components/ml/theme-toggle"
import { NotificationsBell } from "@/components/ml/notifications-bell"
import { useAuth } from "@/lib/auth-context"

const PRIMARY = [
  { href: "/#journal", label: "Журнал" },
  { href: "/pricing", label: "Тарифы" },
  { href: "/#teachers", label: "Преподавателям" },
  { href: "/#students", label: "Студентам" },
]

const DEMO = [
  { href: "/", label: "Главная" },
  { href: "/register", label: "Регистрация" },
  { href: "/teacher", label: "Кабинет преподавателя" },
  { href: "/student", label: "Кабинет студента" },
  { href: "/profile/teacher", label: "Профиль преподавателя" },
  { href: "/profile/student", label: "Профиль студента" },
  { href: "/pricing", label: "Тарифы" },
]

function homeFor(role?: string) {
  if (role === "ADMIN") return "/admin"
  if (role === "TEACHER") return "/teacher"
  if (role === "STUDENT") return "/student"
  return "/"
}

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    router.push("/")
  }

  // Блокируем скролл body, когда открыто мобильное меню
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Основная строка — мобильная версия: лого + бургер. Десктоп: как было. */}
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 md:px-8 lg:flex-nowrap lg:gap-4 lg:px-10 lg:py-4">
        <Link href="/" className="flex items-baseline gap-2" aria-label="MicroLearn — на главную">
          <span className="font-display text-[20px] leading-none tracking-[-0.02em] text-foreground lg:text-[22px]">
            MicroLearn
          </span>
        </Link>

        {/* Десктопная навигация */}
        <nav className="hidden lg:block" aria-label="Основная навигация">
          <ul className="flex items-center gap-5 text-[13px] text-foreground xl:gap-6">
            {PRIMARY.map((i) => {
              const active = pathname === i.href
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className={[
                      "relative transition-colors hover:text-accent",
                      active
                        ? "text-foreground"
                        : "text-foreground/80",
                      "after:absolute after:bottom-[-4px] after:left-0 after:h-[1.5px] after:w-full after:bg-current after:transition-transform after:duration-200 after:ease-out",
                      active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                    ].join(" ")}
                  >
                    {i.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Поиск — только на десктопе в шапке; на мобиле — в выдвижном меню */}
        <div className="hidden lg:ml-auto lg:block lg:max-w-[360px] lg:flex-1 xl:max-w-md">
          <SearchBar />
        </div>

        {/* Правый блок: десктоп — тема/язык/войти/регистрация. Мобила — только тема + бургер. */}
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0 lg:gap-2">
          <ThemeToggle />
          {user && <NotificationsBell />}
          {authLoading ? null : user ? (
            <>
              <Link
                href={homeFor(user.role)}
                className="hidden max-w-[160px] truncate px-2 py-2 text-[13px] text-foreground transition-colors hover:text-accent lg:inline xl:max-w-[180px]"
                title={user.email}
              >
                {user.name}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-2 border border-border px-3 py-2 text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground lg:inline-flex xl:px-4"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register#login"
                className="hidden px-2 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground lg:inline"
              >
                Войти
              </Link>
              <Link
                href="/register#register"
                className="hidden items-center gap-2 border border-foreground bg-foreground px-3 py-2 text-[12px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground lg:inline-flex xl:px-4"
              >
                Регистрация
              </Link>
            </>
          )}

          {/* Бургер — только на мобиле */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground hover:border-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Демо-поднавигация — показываем только гостям, чтобы не путать залогиненных. */}
      {!user && !authLoading && (
        <div className="hidden overflow-hidden border-t border-border bg-surface/60 lg:block">
          <div
            className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-10"
            style={{ contain: "paint" }}
          >
            <div className="flex min-w-0 items-center gap-5 overflow-x-auto py-2.5 lg:gap-6">
              <span className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-muted-foreground tnum">
                Демо
              </span>
              <ul className="flex w-max shrink-0 items-center gap-5 text-[12px] tnum">
                {DEMO.map((i) => {
                  const active = pathname === i.href
                  return (
                    <li key={i.href} className="shrink-0">
                      <Link
                        href={i.href}
                        className={[
                          "whitespace-nowrap pb-1 transition-colors",
                          active
                            ? "border-b border-accent text-accent"
                            : "border-b border-transparent text-foreground/80 hover:text-foreground",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                      >
                        {i.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Мобильное меню — фулл-скрин, редакционный стиль */}
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Главное меню"
          className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
        >
          <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
            <span className="font-display text-[20px] leading-none tracking-[-0.02em] text-foreground">
              MicroLearn
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
              className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground hover:border-foreground"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Скроллимая часть */}
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-rule px-4 py-4">
              <SearchBar />
            </div>

            <div className="px-4 py-6">
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground tnum">
                Разделы
              </span>
              <ul className="mt-4 flex flex-col divide-y divide-rule/40">
                {PRIMARY.map((i) => {
                  const active = pathname === i.href
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        className={[
                          "group flex items-center justify-between gap-4 py-4 font-display text-[22px] tracking-[-0.01em] transition-colors",
                          active ? "text-accent" : "text-foreground hover:text-accent",
                        ].join(" ")}
                      >
                        <span className="relative">
                          {i.label}
                          <span className="absolute bottom-[-2px] left-0 h-[2px] w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-out group-hover:scale-x-100" />
                        </span>
                        <span aria-hidden className="text-[16px] text-muted-foreground">
                          →
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="border-t border-rule px-4 py-6">
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground tnum">
                Демо-страницы
              </span>
              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                {DEMO.map((i) => {
                  const active = pathname === i.href
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        className={[
                          "block py-1.5 transition-colors",
                          active ? "text-accent" : "text-foreground/80 hover:text-foreground",
                        ].join(" ")}
                      >
                        {i.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Липкий футер с кнопками входа/регистрации или сессии */}
          <div className="flex items-stretch gap-3 border-t border-rule bg-background px-4 py-4">
            {user ? (
              <>
                <Link
                  href={homeFor(user.role)}
                  className="flex-1 inline-flex items-center justify-center border border-border px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-foreground hover:border-foreground"
                >
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 inline-flex items-center justify-center border border-foreground bg-foreground px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register#login"
                  className="flex-1 inline-flex items-center justify-center border border-border px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-foreground hover:border-foreground"
                >
                  Войти
                </Link>
                <Link
                  href="/register#register"
                  className="flex-1 inline-flex items-center justify-center border border-foreground bg-foreground px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

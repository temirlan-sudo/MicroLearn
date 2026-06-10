"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

type NavItem = {
  label: string
  href: string
}

const PLAN_LABEL: Record<"FREE" | "PRO" | "PREMIUM", string> = {
  FREE: "Free",
  PRO: "PRO",
  PREMIUM: "Premium",
}

export function DashboardShell({
  edition,
  role,
  title,
  subtitle,
  nav,
  aside,
  children,
}: {
  edition?: string
  role: string
  title?: string
  subtitle?: string
  nav: NavItem[]
  aside?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname() ?? ""
  const { user } = useAuth()

  // Если страница не передала свой title/subtitle — берём данные текущего юзера.
  const displayTitle = title ?? user?.name ?? "Личный кабинет"
  const displaySubtitle =
    subtitle ??
    [user?.country, user ? `Тариф ${PLAN_LABEL[user.plan]}` : null]
      .filter((v): v is string => Boolean(v && v.trim()))
      .join(" · ")

  // Находим пункт с самым длинным совпадающим префиксом — это и будет активный.
  // Так избегаем ситуации, когда, например, /teacher и /teacher/new оба подсвечиваются.
  const activeHref = nav.reduce<string | null>((best, item) => {
    const matches =
      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
    if (!matches) return best
    if (!best || item.href.length > best.length) return item.href
    return best
  }, null)

  return (
    <section className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        {/* Шапка раздела */}
        <div className="grid grid-cols-12 gap-x-6 gap-y-6 border-b border-rule/40 py-8 md:py-12">
          <div className="col-span-12 md:col-span-8">
            <span className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">
              {edition ? `${edition} · ${role}` : role}
            </span>
            <h1 className="mt-4 font-display text-[12vw] leading-[0.9] tracking-[-0.035em] md:text-[5vw]">
              {displayTitle}
            </h1>
            {displaySubtitle && (
              <p className="mt-4 max-w-[50ch] text-[14px] leading-[1.55] text-foreground">
                {displaySubtitle}
              </p>
            )}
          </div>
          {aside ? <div className="col-span-12 md:col-span-4">{aside}</div> : null}
        </div>

        <div className="grid grid-cols-12 gap-x-6 py-10">
          {/* Боковая навигация */}
          <aside className="col-span-12 md:col-span-3">
            <nav aria-label="Разделы кабинета" className="md:sticky md:top-32">
              <ul className="flex flex-row overflow-x-auto border border-rule md:flex-col md:border-0">
                {nav.map((item, i) => {
                  const isActive = item.href === activeHref
                  const index = String(i + 1).padStart(2, "0")
                  return (
                    <li key={item.href} className="flex-1 md:flex-auto">
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={[
                          "group flex w-full items-center gap-4 whitespace-nowrap px-5 py-4 text-left text-[13px] transition-colors",
                          "md:border-b md:border-rule/30",
                          isActive
                            ? "bg-foreground text-background"
                            : "bg-background text-foreground hover:bg-surface",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "text-[10px] uppercase tracking-[0.22em] tnum",
                            isActive ? "text-background/70" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {index}
                        </span>
                        <span className="font-display text-[16px] tracking-[-0.01em]">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* Контент */}
          <div className="col-span-12 mt-10 space-y-16 md:col-span-9 md:mt-0">{children}</div>
        </div>
      </div>
    </section>
  )
}

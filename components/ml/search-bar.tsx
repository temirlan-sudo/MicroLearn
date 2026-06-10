"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const inputId = useId()
  const [q, setQ] = useState("")

  useEffect(() => {
    if (pathname === "/search" && typeof window !== "undefined") {
      setQ(new URLSearchParams(window.location.search).get("q") ?? "")
    }
  }, [pathname])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const query = q.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search")
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`flex items-center border border-border bg-background px-3 text-[13px] focus-within:border-foreground ${className}`}
    >
      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor={inputId} className="sr-only">
        Поиск по курсам, авторам и темам
      </label>
      <input
        id={inputId}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Курсы, авторы, темы..."
        className="h-9 w-full bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="ml-2 border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        Найти
      </button>
    </form>
  )
}

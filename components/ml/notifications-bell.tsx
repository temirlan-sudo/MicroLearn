"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Loader2 } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useMyNotifications } from "@/lib/hooks"

export function NotificationsBell() {
  const { data, loading, reload } = useMyNotifications()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const items = data ?? []
  const unread = items.filter((n) => !n.read).length

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [open])

  async function markAllRead() {
    setBusy(true)
    try {
      await api.patch("/notifications/read-all")
      await reload()
    } catch (err) {
      if (err instanceof ApiError) console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      await reload()
    } catch (err) {
      if (err instanceof ApiError) console.error(err)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Уведомления${unread ? `, ${unread} непрочитанных` : ""}`}
        className="relative inline-flex h-10 w-10 items-center justify-center border border-border text-foreground hover:border-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent text-accent-foreground text-[10px] font-medium leading-[18px] text-center tnum"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] border border-rule bg-background shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div className="mono-label text-muted">Уведомления</div>
            {items.length > 0 && (
              <button
                onClick={markAllRead}
                disabled={busy || unread === 0}
                className="text-[11px] uppercase tracking-[0.14em] text-foreground hover:text-accent disabled:opacity-50 inline-flex items-center gap-1"
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                Прочитать всё
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-[13px] text-muted">Загрузка…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-muted">Пусто.</div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={[
                      "border-b border-rule px-4 py-3 cursor-pointer hover:bg-surface",
                      n.read ? "opacity-70" : "",
                    ].join(" ")}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] text-foreground font-medium">{n.title}</div>
                      {!n.read && <span aria-hidden className="h-2 w-2 bg-accent shrink-0" />}
                    </div>
                    <div className="mt-1 text-[12px] text-muted">{n.body}</div>
                    <div className="mt-1 mono-label text-muted">
                      {new Date(n.createdAt).toLocaleString("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

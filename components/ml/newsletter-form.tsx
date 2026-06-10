"use client"

import { useState } from "react"

export function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
    >
      <label htmlFor="newsletter" className="sr-only">
        Электронная почта
      </label>
      <div className="flex items-stretch border border-foreground">
        <input
          id="newsletter"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@mail.kz"
          className="flex-1 bg-transparent px-3 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="border-l border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background transition-colors hover:border-accent hover:bg-accent"
        >
          {sent ? "Готово" : "OK"}
        </button>
      </div>
      <p className="text-[12px] leading-[1.5] text-muted-foreground">
        Одно письмо в неделю. Отписаться — в каждом письме.
      </p>
    </form>
  )
}

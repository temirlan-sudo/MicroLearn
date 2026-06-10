export function HomeMarquee() {
  const line =
    "Короткие уроки · Настоящие преподаватели · Без накрученных рейтингов · Редакция читает каждый курс · Микро-обучение · "
  return (
    <section aria-hidden className="section-rule overflow-hidden bg-foreground text-background">
      <div className="relative max-w-full overflow-hidden py-5" style={{ contain: "paint" }}>
        <div className="marquee-track flex w-max max-w-none whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="font-display text-[36px] leading-none tracking-[-0.02em] md:text-[54px]"
              style={{ fontVariationSettings: '"opsz" 96, "wdth" 75' }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

import Link from "next/link"
import { PageShell } from "@/components/ml/page-shell"

type InfoPageProps = {
  eyebrow: string
  title: string
  intro: string
  sections: {
    title: string
    body: string
  }[]
  cta?: {
    href: string
    label: string
  }
}

export function InfoPage({ eyebrow, title, intro, sections, cta }: InfoPageProps) {
  return (
    <PageShell section={eyebrow}>
      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid grid-cols-12 gap-6 py-12 md:py-16">
            <div className="col-span-12 md:col-span-4">
              <div className="mono-label text-accent">{eyebrow}</div>
            </div>
            <div className="col-span-12 md:col-span-8">
              <h1 className="break-words font-display text-[48px] leading-[0.95] tracking-[-0.03em] md:text-[88px]">
                {title}
              </h1>
              <p className="mt-6 max-w-[68ch] text-[16px] leading-[1.65] text-foreground">
                {intro}
              </p>
              {cta ? (
                <Link
                  href={cta.href}
                  className="mt-8 inline-flex h-11 items-center border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent"
                >
                  {cta.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <ul className="border-t border-rule">
            {sections.map((section, index) => (
              <li key={section.title} className="grid grid-cols-12 gap-6 border-b border-rule py-8">
                <div className="col-span-12 md:col-span-3">
                  <div className="mono-label text-muted">{String(index + 1).padStart(2, "0")}</div>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <h2 className="font-display text-[26px] leading-[1.05] tracking-[-0.01em] md:text-[34px]">
                    {section.title}
                  </h2>
                </div>
                <p className="col-span-12 max-w-[68ch] text-[15px] leading-[1.65] text-foreground md:col-span-5">
                  {section.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  )
}

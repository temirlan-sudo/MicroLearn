"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"

type VerifyResult = {
  id: string
  verificationCode: string
  status: "VALID" | "REVOKED"
  issuedAt: string
  revokedAt?: string | null
  student: { id: string; name: string }
  course: { id: string; title: string; teacher: { name: string } }
}

export function CertificateVerify({ code }: { code: string }) {
  const [data, setData] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<{ data: VerifyResult }>(`/certificates/verify/${code}`)
        if (!cancelled) setData(res.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Сертификат не найден")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <section className="section-rule">
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mono-label text-muted">Публичная проверка</div>
            <h1 className="mt-3 break-words font-display text-[38px] leading-[0.98] tracking-[-0.025em] md:text-[64px]">
              {code}
            </h1>
          </div>
          {data && (
            <Link
              href={`/courses/${data.course.id}`}
              className="inline-flex h-11 items-center border border-foreground bg-foreground px-5 text-[12px] uppercase tracking-[0.14em] text-background hover:border-accent hover:bg-accent"
            >
              Открыть курс
            </Link>
          )}
        </div>

        {loading && (
          <div className="border border-rule bg-panel px-5 py-6 text-[14px] text-muted">
            Проверяем сертификат…
          </div>
        )}
        {error && (
          <div className="border border-accent/60 bg-accent/10 px-5 py-6 text-[14px] text-accent">
            {error}
          </div>
        )}
        {data && <CertificateArtwork data={data} />}
      </div>
    </section>
  )
}

function CertificateArtwork({ data }: { data: VerifyResult }) {
  const issuedAt = new Date(data.issuedAt)
  const issueNumber = `${String(issuedAt.getMonth() + 1).padStart(2, "0")}-${String(
    issuedAt.getFullYear(),
  ).slice(-2)}`
  const issueMonth = String(issuedAt.getMonth() + 1).padStart(2, "0")
  const issueDate = issuedAt.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <article className="relative mx-auto aspect-[1.38] w-full max-w-[1120px] overflow-hidden border border-[#161513] bg-[#f4efe4] p-[2.2%] text-[#141312] shadow-[10px_14px_0_rgba(0,0,0,0.14)]">
      <div className="relative flex h-full flex-col border border-[#161513] p-[3.8%] shadow-[inset_0_0_0_1px_rgba(20,19,18,0.45)]">
        <div className="flex items-center justify-between border-b-[3px] border-double border-[#161513] pb-[1.4%] font-display text-[clamp(7px,1vw,12px)] uppercase tracking-[0.08em]">
          <span>ИЗД. / {issuedAt.getFullYear()}</span>
          <span>ВЫПУСК № {issueNumber}</span>
          <span>ЗНАНИЯ. ПРАКТИКА. РЕЗУЛЬТАТ.</span>
        </div>

        <div className="flex flex-1 flex-col items-center text-center">
          <div className="mt-[5%] font-display text-[clamp(48px,12vw,132px)] uppercase leading-[0.8] tracking-[0.08em]">
            СЕРТИФИКАТ
          </div>
          <div className="mt-[4%] border border-[#161513] px-[1.1em] py-[0.32em] font-display text-[clamp(10px,1.7vw,21px)] uppercase tracking-[0.22em]">
            О завершении курса
          </div>
          <p className="mt-[3.2%] font-serif text-[clamp(12px,1.5vw,18px)] italic text-[#4f4a42]">
            Настоящий сертификат подтверждает, что
          </p>
          <h2 className="mt-[2.2%] max-w-[82%] border-b border-dotted border-[#6b6258] px-[5%] pb-[1%] font-display text-[clamp(28px,6vw,68px)] uppercase leading-none tracking-[0.12em]">
            {data.student.name}
          </h2>
          <p className="mt-[2.4%] font-serif text-[clamp(12px,1.5vw,18px)] italic text-[#4f4a42]">
            успешно завершил(а) курс
          </p>
          <div className="mt-[1.7%] bg-[#141312] px-[4.5%] py-[1.1%] font-display text-[clamp(18px,3vw,38px)] uppercase tracking-[0.08em] text-[#f4efe4]">
            {data.course.title}
          </div>

          <div className="mt-[3%] space-y-1 font-serif text-[clamp(10px,1.35vw,16px)]">
            <div>Дата выдачи: {issueDate}</div>
            <div>Сертификат № {data.verificationCode}</div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-[4%]">
          <div>
            <div className="border-t border-[#161513]" />
            <div className="mt-2 font-serif text-[clamp(8px,1vw,12px)] italic text-[#4f4a42]">
              Подпись
            </div>
          </div>
          <div className="relative h-[clamp(74px,9vw,104px)] w-[clamp(74px,9vw,104px)]">
            <div className="absolute inset-0 rounded-full border-2 border-[#bd3f34]" />
            <div className="absolute inset-[8%] rounded-full border border-[#bd3f34]" />
            <div className="absolute left-1/2 top-[27%] -translate-x-1/2 rotate-[-8deg] whitespace-nowrap font-display text-[clamp(5px,0.8vw,9px)] uppercase tracking-[0.12em] text-[#bd3f34]">
              ¤ Сертификат ¤
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] font-display text-[clamp(14px,1.8vw,22px)] uppercase text-[#bd3f34]">
              Одобрено
            </div>
            <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 rotate-[-8deg] font-display text-[clamp(6px,0.8vw,10px)] tracking-[0.22em] text-[#bd3f34]">
              •••••
            </div>
          </div>
          <div>
            <div className="border-t border-[#161513]" />
            <div className="mt-2 font-serif text-[clamp(8px,1vw,12px)] italic text-[#4f4a42]">
              Руководитель курса · {data.course.teacher.name}
            </div>
          </div>
        </div>

        <div className="absolute bottom-[10%] right-[3.8%] flex h-[clamp(54px,7.8vw,82px)] w-[clamp(42px,5.6vw,58px)] flex-col items-center justify-center border border-[#161513] font-display leading-none">
          <span className="text-[clamp(10px,1.2vw,14px)]">№</span>
          <span className="mt-1 text-[clamp(16px,2.2vw,25px)]">{issueMonth}</span>
          <span className="mt-1 text-[clamp(9px,1.1vw,12px)]">{issuedAt.getFullYear()}</span>
        </div>

        {data.status === "REVOKED" && (
          <div className="absolute inset-x-[8%] top-1/2 -translate-y-1/2 border border-accent bg-background/95 px-4 py-3 text-center font-display text-[clamp(18px,3vw,36px)] uppercase tracking-[0.12em] text-accent">
            Сертификат отозван
          </div>
        )}
      </div>
    </article>
  )
}

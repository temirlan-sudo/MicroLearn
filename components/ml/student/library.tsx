"use client"

import { useState } from "react"
import { api, ApiError } from "@/lib/api"
import { useMyCertificates, useMyFavorites } from "@/lib/hooks"

/**
 * Две колонки — «Библиотека» и «Сертификаты» — подтягивает из API.
 */
export function StudentLibrary() {
  const { data: favs, loading: favsLoading } = useMyFavorites()
  const { data: certs, loading: certsLoading } = useMyCertificates()
  const favorites = favs ?? []
  const certificates = certs ?? []
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function downloadCertificate(id: string) {
    setDownloadingId(id)
    setDownloadError(null)
    try {
      const response = await api.get<Response>(`/certificates/${id}/download`, { raw: true })
      if (!response.ok)
        throw new ApiError(response.status, `Не удалось скачать сертификат: ${response.status}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `microlearn-certificate-${id.slice(0, 10).toUpperCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Не удалось скачать сертификат")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <section className="border-t border-rule">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b md:border-b-0 md:border-r border-rule">
          <header className="px-6 py-8 md:px-8">
            <div className="mono-label text-muted">04 / Библиотека</div>
            <h2 className="mt-3 font-display text-[26px] md:text-[32px] leading-[1.05] tracking-[-0.01em]">
              Сохранено
            </h2>
          </header>
          {favsLoading ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Загружаем…
            </div>
          ) : favorites.length === 0 ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Пока ничего не сохранено.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {favorites.map((item, i) => (
                <li
                  key={item.id}
                  className="grid grid-cols-12 gap-3 px-6 py-5 md:px-8 border-b border-rule"
                >
                  <div className="col-span-1 mono-label text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="col-span-9">
                    <div className="text-[15px] leading-[1.4]">{item.course.title}</div>
                    <div className="mt-1 text-[13px] text-muted">
                      {item.course.teacher?.name ?? "—"}
                    </div>
                  </div>
                  <div className="col-span-2 mono-label text-accent text-right">Избранное</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <header className="px-6 py-8 md:px-8">
            <div className="mono-label text-muted">05 / Архив</div>
            <h2 className="mt-3 font-display text-[26px] md:text-[32px] leading-[1.05] tracking-[-0.01em]">
              Сертификаты
            </h2>
          </header>
          {certsLoading ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Загружаем…
            </div>
          ) : certificates.length === 0 ? (
            <div className="border-t border-rule px-6 py-6 text-[13px] text-muted md:px-8">
              Сертификаты выдаются на Premium после завершения курса на 100%.
            </div>
          ) : (
            <ul className="border-t border-rule">
              {downloadError && (
                <li
                  className="border-b border-rule px-6 py-4 text-[13px] text-accent md:px-8"
                  role="alert"
                >
                  {downloadError}
                </li>
              )}
              {certificates.map((cert, i) => (
                <li
                  key={cert.id}
                  className="grid grid-cols-12 gap-3 px-6 py-5 md:px-8 border-b border-rule"
                >
                  <div className="col-span-1 mono-label text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="col-span-7">
                    <div className="text-[15px] leading-[1.4]">{cert.course.title}</div>
                    <button
                      type="button"
                      onClick={() => downloadCertificate(cert.id)}
                      disabled={downloadingId === cert.id}
                      className="mt-1 mono-label text-muted hover:text-accent disabled:opacity-50"
                    >
                      № {cert.id.slice(0, 10).toUpperCase()} ·{" "}
                      {downloadingId === cert.id ? "готовим PDF…" : "скачать PDF"}
                    </button>
                  </div>
                  <div className="col-span-4 mono-label text-muted text-right">
                    {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

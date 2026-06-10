"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  useAdminCourses,
  useAdminAuditLogs,
  useAdminCertificates,
  useAdminOverview,
  useAdminReports,
  useAdminUsers,
  type ReportStatus,
} from "@/lib/hooks"

const reportStatuses: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]
const reportStatusLabels: Record<ReportStatus, string> = {
  OPEN: "ОТКРЫТО",
  REVIEWING: "НА ПРОВЕРКЕ",
  RESOLVED: "РЕШЕНО",
  DISMISSED: "ОТКЛОНЕНО",
}

export function AdminPanel() {
  const { user } = useAuth()
  const [userQuery, setUserQuery] = useState("")
  const [courseQuery, setCourseQuery] = useState("")
  const [reportStatus, setReportStatus] = useState<ReportStatus | "">("")
  const [auditAction, setAuditAction] = useState("")
  const [busyReport, setBusyReport] = useState<string | null>(null)
  const [busyCertificate, setBusyCertificate] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const userQs = useMemo(() => {
    const qs = new URLSearchParams()
    if (userQuery.trim()) qs.set("q", userQuery.trim())
    return qs.toString() ? `?${qs}` : ""
  }, [userQuery])
  const courseQs = useMemo(() => {
    const qs = new URLSearchParams()
    if (courseQuery.trim()) qs.set("q", courseQuery.trim())
    return qs.toString() ? `?${qs}` : ""
  }, [courseQuery])
  const reportQs = reportStatus ? `?status=${reportStatus}` : ""
  const auditQs = useMemo(() => {
    const qs = new URLSearchParams()
    if (auditAction.trim()) qs.set("action", auditAction.trim())
    return qs.toString() ? `?${qs}` : ""
  }, [auditAction])

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview,
  } = useAdminOverview()
  const { data: users, loading: usersLoading, error: usersError } = useAdminUsers(userQs)
  const { data: courses, loading: coursesLoading, error: coursesError } = useAdminCourses(courseQs)
  const {
    data: reports,
    loading: reportsLoading,
    error: reportsError,
    reload: reloadReports,
  } = useAdminReports(reportQs)
  const {
    data: auditLogs,
    loading: auditLoading,
    error: auditError,
    reload: reloadAudit,
  } = useAdminAuditLogs(auditQs)
  const {
    data: certificates,
    loading: certificatesLoading,
    error: certificatesError,
    reload: reloadCertificates,
  } = useAdminCertificates()

  async function updateReport(id: string, status: ReportStatus) {
    setBusyReport(id)
    setMessage(null)
    try {
      await api.patch(`/admin/reports/${id}`, {
        status,
        resolution:
          status === "RESOLVED"
            ? "Проверено модератором. Нарушений, блокирующих публикацию, не найдено."
            : undefined,
      })
      await Promise.all([reloadReports(), reloadOverview()])
      setMessage("Статус жалобы обновлен.")
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Не удалось обновить жалобу")
    } finally {
      setBusyReport(null)
    }
  }

  async function revokeCertificate(id: string) {
    if (!confirm("Отозвать сертификат? Публичная проверка покажет статус REVOKED.")) return
    setBusyCertificate(id)
    setMessage(null)
    try {
      await api.patch(`/certificates/${id}/revoke`)
      await Promise.all([reloadCertificates(), reloadAudit()])
      setMessage("Сертификат отозван.")
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Не удалось отозвать сертификат")
    } finally {
      setBusyCertificate(null)
    }
  }

  if (user && user.role !== "ADMIN") {
    return (
      <section className="border border-rule bg-panel px-6 py-8 text-[14px] leading-[1.6]">
        Этот раздел доступен только администратору. Войдите как `admin@microlearn.io`, чтобы открыть
        панель модерации.
      </section>
    )
  }

  return (
    <div className="space-y-16">
      <section className="border-t border-rule" id="overview">
        <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
          <div className="col-span-12 md:col-span-4">
            <div className="mono-label text-muted">01 / Состояние</div>
            <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
              Платформа
            </h2>
          </div>
          <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">
            Сводка нужна для защиты и демонстрации операционного слоя: пользователи, курсы, записи,
            завершенные уроки и жалобы.
          </p>
        </header>

        {overviewError && <Alert text={overviewError} />}
        {overviewLoading ? (
          <Loading />
        ) : overview ? (
          <div className="grid grid-cols-2 border-t border-rule md:grid-cols-5">
            <Metric label="Пользователи" value={overview.totals.users} />
            <Metric label="Курсы" value={overview.totals.courses} />
            <Metric label="Записи" value={overview.totals.enrollments} />
            <Metric label="Уроки завершены" value={overview.totals.completedLessons} />
            <Metric label="Жалобы" value={overview.totals.reports} />
          </div>
        ) : null}
      </section>

      <section className="border-t border-rule" id="users">
        <SectionHeader
          number="02"
          title="Пользователи"
          text="Поиск по имени и email, роли, тарифы и связанная активность."
        />
        <div className="border-t border-rule px-6 py-5 md:px-8">
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Найти пользователя"
            className="w-full border border-rule bg-background px-4 py-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        {usersError && <Alert text={usersError} />}
        {usersLoading ? (
          <Loading />
        ) : (
          <Table
            rows={(users ?? []).map((item) => [
              item.name,
              item.email,
              item.role,
              item.plan,
              `${item._count.enrollments} записей · ${item._count.taughtCourses} курсов`,
            ])}
          />
        )}
      </section>

      <section className="border-t border-rule" id="courses">
        <SectionHeader
          number="03"
          title="Курсы"
          text="Модерация опубликованных и черновых курсов, преподаватель, записи, отзывы и жалобы."
        />
        <div className="border-t border-rule px-6 py-5 md:px-8">
          <input
            value={courseQuery}
            onChange={(e) => setCourseQuery(e.target.value)}
            placeholder="Найти курс или категорию"
            className="w-full border border-rule bg-background px-4 py-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        {coursesError && <Alert text={coursesError} />}
        {coursesLoading ? (
          <Loading />
        ) : (
          <ul className="border-t border-rule">
            {(courses ?? []).map((course) => (
              <li
                key={course.id}
                className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-5 md:px-8"
              >
                <div className="col-span-12 md:col-span-6">
                  <Link
                    href={`/courses/${course.id}`}
                    className="font-display text-[20px] hover:text-accent"
                  >
                    {course.title}
                  </Link>
                  <div className="mt-1 text-[13px] text-muted">
                    {course.teacher.name} · {course.category}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-3 mono-label text-muted">
                  {course.status}
                </div>
                <div className="col-span-6 md:col-span-3 text-right text-[13px] text-muted">
                  {course._count.modules} мод. · {course._count.enrollments} записей ·{" "}
                  {course._count.reports} жалоб
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-rule" id="reports">
        <SectionHeader
          number="04"
          title="Жалобы"
          text="Очередь модерации: открытые, в работе, закрытые и отклоненные обращения."
        />
        <div className="flex flex-wrap gap-2 border-t border-rule px-6 py-5 md:px-8">
          <FilterButton active={!reportStatus} onClick={() => setReportStatus("")}>
            Все
          </FilterButton>
          {reportStatuses.map((status) => (
            <FilterButton
              key={status}
              active={reportStatus === status}
              onClick={() => setReportStatus(status)}
            >
              {reportStatusLabels[status]}
            </FilterButton>
          ))}
        </div>
        {message && (
          <div className="border-t border-rule bg-panel px-6 py-3 text-[13px] md:px-8">
            {message}
          </div>
        )}
        {reportsError && <Alert text={reportsError} />}
        {reportsLoading ? (
          <Loading />
        ) : (
          <ul className="border-t border-rule">
            {(reports ?? []).map((report) => (
              <li key={report.id} className="border-b border-rule px-6 py-6 md:px-8">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-7">
                    <div className="mono-label text-accent">{reportStatusLabels[report.status]}</div>
                    <h3 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.01em]">
                      {report.reason}
                    </h3>
                    <p className="mt-3 text-[14px] leading-[1.6]">
                      {report.details ?? "Без подробностей."}
                    </p>
                    <div className="mt-3 text-[12px] text-muted">
                      {report.reporter?.email ?? "аноним"} ·{" "}
                      {report.course?.title ?? "курс не указан"}
                    </div>
                  </div>
                  <div className="col-span-12 flex flex-wrap gap-2 md:col-span-5 md:justify-end md:self-start">
                    {reportStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateReport(report.id, status)}
                        disabled={busyReport === report.id || report.status === status}
                        className="border border-rule px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-40"
                      >
                        {reportStatusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>
                {report.resolution && (
                  <div className="mt-4 border border-rule bg-panel px-4 py-3 text-[13px] text-muted">
                    Решение: {report.resolution}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-rule" id="certificates">
        <SectionHeader
          number="05"
          title="Сертификаты"
          text="Публичная проверка сертификата и административный отзыв при ошибочной выдаче."
        />
        {certificatesError && <Alert text={certificatesError} />}
        {certificatesLoading ? (
          <Loading />
        ) : (
          <ul className="border-t border-rule">
            {(certificates ?? []).map((cert) => (
              <li
                key={cert.id}
                className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-5 md:px-8"
              >
                <div className="col-span-12 md:col-span-5">
                  <Link
                    href={`/certificates/verify/${cert.verificationCode}`}
                    className="font-display text-[20px] hover:text-accent"
                  >
                    {cert.verificationCode}
                  </Link>
                  <div className="mt-1 text-[13px] text-muted">
                    {cert.user.email} · {cert.course.title}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2 mono-label text-muted">{cert.status}</div>
                <div className="col-span-6 md:col-span-3 text-right text-[13px] text-muted">
                  {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                </div>
                <div className="col-span-12 flex justify-start md:col-span-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => revokeCertificate(cert.id)}
                    disabled={busyCertificate === cert.id || cert.status === "REVOKED"}
                    className="border border-rule px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-40"
                  >
                    Отозвать
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-rule" id="audit">
        <SectionHeader
          number="06"
          title="Audit log"
          text="Журнал ключевых действий: записи на курсы, сдача заданий, тесты, сертификаты и модерация."
        />
        <div className="border-t border-rule px-6 py-5 md:px-8">
          <input
            value={auditAction}
            onChange={(e) => setAuditAction(e.target.value)}
            placeholder="Фильтр по action, например quiz или certificate"
            className="w-full border border-rule bg-background px-4 py-3 text-[14px] outline-none focus:border-foreground"
          />
        </div>
        {auditError && <Alert text={auditError} />}
        {auditLoading ? (
          <Loading />
        ) : (
          <ul className="border-t border-rule">
            {(auditLogs ?? []).map((log) => (
              <li
                key={log.id}
                className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-5 text-[13px] md:px-8"
              >
                <div className="col-span-12 md:col-span-3">
                  <div className="mono-label text-accent">{log.action}</div>
                  <div className="mt-1 text-muted">{log.actorEmail ?? "system"}</div>
                </div>
                <div className="col-span-6 md:col-span-2 mono-label text-muted">
                  {log.entityType}
                </div>
                <div className="col-span-6 md:col-span-3 break-all text-muted">
                  {log.entityId ?? "—"}
                </div>
                <div className="col-span-12 md:col-span-4 md:text-right text-muted">
                  {new Date(log.createdAt).toLocaleString("ru-RU")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SectionHeader({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <header className="grid grid-cols-12 gap-6 px-6 py-8 md:px-8">
      <div className="col-span-12 md:col-span-4">
        <div className="mono-label text-muted">{number} / Реестр</div>
        <h2 className="mt-3 font-display text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      <p className="col-span-12 md:col-span-8 text-[15px] leading-[1.65]">{text}</p>
    </header>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-r border-rule px-6 py-7 md:px-8">
      <div className="mono-label text-muted">{label}</div>
      <div className="mt-3 font-display text-[36px] leading-none tracking-[-0.02em]">{value}</div>
    </div>
  )
}

function Loading() {
  return (
    <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
      Загружаем данные…
    </div>
  )
}

function Alert({ text }: { text: string }) {
  return (
    <div className="border-t border-rule px-6 py-4 text-[13px] text-accent md:px-8">{text}</div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "border px-3 py-2 text-[11px] uppercase tracking-[0.14em]",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-rule hover:border-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function Table({ rows }: { rows: string[][] }) {
  if (rows.length === 0)
    return (
      <div className="border-t border-rule px-6 py-8 text-[13px] text-muted md:px-8">
        Ничего не найдено.
      </div>
    )
  return (
    <ul className="border-t border-rule">
      {rows.map((row, index) => (
        <li
          key={row.join("-")}
          className="grid grid-cols-12 gap-4 border-b border-rule px-6 py-4 text-[13px] md:px-8"
        >
          <div className="col-span-1 mono-label text-muted">
            {String(index + 1).padStart(2, "0")}
          </div>
          {row.map((cell, i) => (
            <div
              key={`${cell}-${i}`}
              className={[
                "col-span-11 md:col-span-2",
                i === 0 ? "font-display text-[17px]" : "text-muted",
              ].join(" ")}
            >
              {cell}
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}

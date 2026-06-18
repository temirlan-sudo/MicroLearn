import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { AdminPanel } from "@/components/ml/admin/panel"

export const metadata = {
  title: "Модерация · MicroLearn",
}

const adminNav = [
  { label: "Обзор", href: "/admin" },
  { label: "Пользователи", href: "/admin#users" },
  { label: "Курсы", href: "/admin#courses" },
  { label: "Жалобы", href: "/admin#reports" },
]

export default function AdminPage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Операции"
        role="Администратор"
        title="Модерация"
        subtitle="Контроль пользователей, курсов, жалоб и ключевых показателей платформы."
        nav={adminNav}
      >
        <AdminPanel />
      </DashboardShell>
    </PageShell>
  )
}

import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { Schedule } from "@/components/ml/student/schedule"

export const metadata = {
  title: "Расписание · MicroLearn",
}

const studentNav = [
  { label: "Сводка", href: "/student" },
  { label: "Мои курсы", href: "/student/courses" },
  { label: "Расписание", href: "/student/schedule" },
  { label: "Повторение", href: "/student/adaptive" },
  { label: "Профиль", href: "/profile/student" },
]

export default function StudentSchedulePage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Неделя"
        role="Студент"
        title="Расписание"
        subtitle="Плановые уроки, Q&A-сессии и мягкие дедлайны"
        nav={studentNav}
      >
        <Schedule />
      </DashboardShell>
    </PageShell>
  )
}

import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { TeacherStats } from "@/components/ml/teacher/stats"
import { CoursesTable } from "@/components/ml/teacher/courses-table"
import { TeacherActivity } from "@/components/ml/teacher/activity"
import { TeacherStudentAnalytics } from "@/components/ml/teacher/student-analytics"
import { TeacherAdaptiveInsights } from "@/components/ml/teacher/adaptive-insights"
import { ReportsCenter } from "@/components/ml/support/reports-center"

export const metadata = {
  title: "Кабинет преподавателя · MicroLearn",
}

const teacherNav = [
  { label: "Сводка", href: "/teacher" },
  { label: "Курсы", href: "/teacher/courses" },
  { label: "Создать курс", href: "/teacher/new" },
  { label: "Профиль", href: "/profile/teacher" },
]

export default function TeacherDashboardPage() {
  return (
    <PageShell>
      <DashboardShell edition="Кабинет" role="Преподаватель" nav={teacherNav}>
        <TeacherStats />
        <CoursesTable />
        <TeacherActivity />
        <TeacherStudentAnalytics />
        <TeacherAdaptiveInsights />
        <ReportsCenter />
      </DashboardShell>
    </PageShell>
  )
}

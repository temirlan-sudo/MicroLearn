import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { ActiveCourses } from "@/components/ml/student/active-courses"
import { StudentLibrary } from "@/components/ml/student/library"
import { ReportsCenter } from "@/components/ml/support/reports-center"

export const metadata = {
  title: "Мои курсы · MicroLearn",
}

const studentNav = [
  { label: "Сводка", href: "/student" },
  { label: "Мои курсы", href: "/student/courses" },
  { label: "Расписание", href: "/student/schedule" },
  { label: "Повторение", href: "/student/adaptive" },
  { label: "Профиль", href: "/profile/student" },
]

export default function StudentCoursesPage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Обучение"
        role="Студент"
        title="Мои курсы"
        subtitle="Активные записи, сохранения и сертификаты"
        nav={studentNav}
      >
        <ActiveCourses />
        <StudentLibrary />
        <ReportsCenter />
      </DashboardShell>
    </PageShell>
  )
}

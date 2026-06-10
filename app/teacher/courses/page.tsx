import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { CoursesTable } from "@/components/ml/teacher/courses-table"
import { CourseBuilder } from "@/components/ml/teacher/course-builder"
import { TeacherAdaptiveInsights } from "@/components/ml/teacher/adaptive-insights"

export const metadata = {
  title: "Мои курсы · MicroLearn",
}

const teacherNav = [
  { label: "Сводка", href: "/teacher" },
  { label: "Курсы", href: "/teacher/courses" },
  { label: "Создать курс", href: "/teacher/new" },
  { label: "Профиль", href: "/profile/teacher" },
]

export default function TeacherCoursesPage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Каталог"
        role="Преподаватель"
        title="Мои курсы"
        subtitle="Редактирование программы и состояние выпусков"
        nav={teacherNav}
      >
        <CoursesTable />
        <CourseBuilder />
        <TeacherAdaptiveInsights />
      </DashboardShell>
    </PageShell>
  )
}

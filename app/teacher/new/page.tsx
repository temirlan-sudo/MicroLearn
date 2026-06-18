import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { CreateCourseForm } from "@/components/ml/teacher/create-course-form"
import { CourseBuilder } from "@/components/ml/teacher/course-builder"

export const metadata = {
  title: "Новый курс · MicroLearn",
}

const teacherNav = [
  { label: "Сводка", href: "/teacher" },
  { label: "Курсы", href: "/teacher/courses" },
  { label: "Создать курс", href: "/teacher/new" },
  { label: "Профиль", href: "/profile/teacher" },
]

export default function NewCoursePage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Редакция"
        role="Преподаватель"
        title="Новый выпуск"
        subtitle="Сначала обложка, затем программа"
        nav={teacherNav}
      >
        <CreateCourseForm />
        <CourseBuilder />
      </DashboardShell>
    </PageShell>
  )
}

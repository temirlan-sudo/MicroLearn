import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { AdaptivePractice } from "@/components/ml/student/adaptive-practice"

export const metadata = {
  title: "Ежедневное повторение · MicroLearn",
}

const studentNav = [
  { label: "Сводка", href: "/student" },
  { label: "Мои курсы", href: "/student/courses" },
  { label: "Расписание", href: "/student/schedule" },
  { label: "Повторение", href: "/student/adaptive" },
  { label: "Профиль", href: "/profile/student" },
]

export default function StudentAdaptivePage() {
  return (
    <PageShell>
      <DashboardShell
        edition="Adaptive"
        role="Студент"
        title="Персональное повторение"
        subtitle="Карточки и слабые темы по результатам quiz"
        nav={studentNav}
      >
        <AdaptivePractice />
      </DashboardShell>
    </PageShell>
  )
}

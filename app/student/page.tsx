import { PageShell } from "@/components/ml/page-shell"
import { DashboardShell } from "@/components/ml/dashboard/shell"
import { StudentStats } from "@/components/ml/student/stats"
import { ActiveCourses } from "@/components/ml/student/active-courses"
import { Schedule } from "@/components/ml/student/schedule"
import { StudentLibrary } from "@/components/ml/student/library"
import { AdaptiveDailyChallenge } from "@/components/ml/student/adaptive-daily-challenge"
import { ReportsCenter } from "@/components/ml/support/reports-center"

export const metadata = {
  title: "Кабинет студента · MicroLearn",
}

const studentNav = [
  { label: "Сводка", href: "/student" },
  { label: "Мои курсы", href: "/student/courses" },
  { label: "Расписание", href: "/student/schedule" },
  { label: "Повторение", href: "/student/adaptive" },
  { label: "Профиль", href: "/profile/student" },
]

export default function StudentDashboardPage() {
  return (
    <PageShell>
      <DashboardShell edition="Кабинет" role="Студент" nav={studentNav}>
        <StudentStats />
        <AdaptiveDailyChallenge />
        <ActiveCourses />
        <Schedule />
        <StudentLibrary />
        <ReportsCenter />
      </DashboardShell>
    </PageShell>
  )
}

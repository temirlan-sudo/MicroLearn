import { PageShell } from "@/components/ml/page-shell"
import { StudentProfileHero } from "@/components/ml/profile/student-hero"
import { StudentSettings } from "@/components/ml/profile/student-settings"
import { StudentAchievements } from "@/components/ml/profile/student-achievements"

export const metadata = {
  title: "Профиль студента · MicroLearn",
}

export default function StudentProfilePage() {
  return (
    <PageShell
      mastheadProps={{
        section: "Профиль студента · MicroLearn",
      }}
    >
      <StudentProfileHero />
      <StudentSettings />
      <StudentAchievements />
    </PageShell>
  )
}

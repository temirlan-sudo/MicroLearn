import { PageShell } from "@/components/ml/page-shell"
import { TeacherProfileHero } from "@/components/ml/profile/teacher-hero"
import { TeacherBio } from "@/components/ml/profile/teacher-bio"
import { TeacherCourses } from "@/components/ml/profile/teacher-courses"
import { TeacherReviews } from "@/components/ml/profile/teacher-reviews"

export const metadata = {
  title: "Профиль преподавателя · MicroLearn",
}

export default function TeacherProfilePage() {
  return (
    <PageShell
      mastheadProps={{
        section: "Профиль преподавателя · MicroLearn",
      }}
    >
      <TeacherProfileHero />
      <TeacherBio />
      <TeacherCourses />
      <TeacherReviews />
    </PageShell>
  )
}

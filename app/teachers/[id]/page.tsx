import { PageShell } from "@/components/ml/page-shell"
import { PublicTeacherProfile } from "@/components/ml/teachers/public-teacher-profile"

export const metadata = {
  title: "Преподаватель · MicroLearn",
}

export default async function PublicTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageShell
      mastheadProps={{
        section: "Профиль преподавателя · MicroLearn",
      }}
    >
      <PublicTeacherProfile id={id} />
    </PageShell>
  )
}

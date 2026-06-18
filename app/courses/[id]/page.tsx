import { PageShell } from "@/components/ml/page-shell"
import { CourseDetail } from "@/components/ml/course-detail"

export const metadata = {
  title: "Курс · MicroLearn",
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageShell showMasthead={false}>
      <CourseDetail id={id} />
    </PageShell>
  )
}

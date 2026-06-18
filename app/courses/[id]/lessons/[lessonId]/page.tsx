import { PageShell } from "@/components/ml/page-shell"
import { LessonReader } from "@/components/ml/lesson-reader"

export const metadata = {
  title: "Урок · MicroLearn",
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  return (
    <PageShell showMasthead={false}>
      <LessonReader courseId={id} lessonId={lessonId} />
    </PageShell>
  )
}

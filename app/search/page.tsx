import { Suspense } from "react"
import { PageShell } from "@/components/ml/page-shell"
import { SearchResults } from "@/components/ml/search-results"

export const metadata = {
  title: "Поиск · MicroLearn",
}

export default function SearchPage() {
  return (
    <PageShell section="Поиск · курсы и разделы">
      <Suspense
        fallback={
          <div className="mx-auto max-w-[1440px] px-6 py-16 text-[14px] text-muted md:px-10">
            Ищем материалы…
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </PageShell>
  )
}

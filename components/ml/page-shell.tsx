import type { ReactNode } from "react"
import { Nav } from "@/components/ml/nav"
import { Footer } from "@/components/ml/footer"
import { Masthead } from "@/components/ml/masthead"

export function PageShell({
  children,
  section,
  showMasthead = true,
  mastheadProps,
}: {
  children: ReactNode
  section?: string
  showMasthead?: boolean
  mastheadProps?: Parameters<typeof Masthead>[0]
}) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        {showMasthead ? (
          <Masthead {...mastheadProps} section={section ?? mastheadProps?.section} />
        ) : null}
        {children}
      </main>
      <Footer />
    </div>
  )
}

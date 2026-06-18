import { PageShell } from "@/components/ml/page-shell"
import { HomeHero } from "@/components/ml/home/hero"
import { HomeMarquee } from "@/components/ml/home/marquee"
import { Instructors } from "@/components/ml/home/instructors"
import { FeaturedCourse } from "@/components/ml/home/featured-course"
import { PopularCourses } from "@/components/ml/home/popular-courses"
import { Testimonials } from "@/components/ml/home/testimonials"
import { Advantages } from "@/components/ml/home/advantages"

export default function HomePage() {
  return (
    <PageShell>
      <HomeHero />
      <HomeMarquee />
      <Instructors />
      <FeaturedCourse />
      <PopularCourses />
      <Testimonials />
      <Advantages />
    </PageShell>
  )
}

import { Plan } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { HttpError } from "../lib/httpError"

export interface PlanDefinition {
  id: Plan
  name: string
  priceUSD: number
  features: string[]
  maxEnrollments: number | null // null = unlimited
  maxCoursePrice: number | null // null = unlimited; 0 = only free
  certificates: boolean
  searchBoost: boolean
  adBanner: boolean
}

export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceUSD: 0,
    features: ["Access to free courses", "Up to 3 enrollments", "Community support"],
    maxEnrollments: 3,
    maxCoursePrice: 0,
    certificates: false,
    searchBoost: false,
    adBanner: true,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceUSD: 9.99,
    features: ["All courses up to $49.99", "Unlimited enrollments", "No ads"],
    maxEnrollments: null,
    maxCoursePrice: 49.99,
    certificates: false,
    searchBoost: false,
    adBanner: false,
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    priceUSD: 19.99,
    features: [
      "All courses at any price",
      "Unlimited enrollments",
      "Auto-generated certificates",
      "Priority in search",
    ],
    maxEnrollments: null,
    maxCoursePrice: null,
    certificates: true,
    searchBoost: true,
    adBanner: false,
  },
}

export function planFor(plan: Plan): PlanDefinition {
  return PLANS[plan]
}

/**
 * Ensures the user can enroll in this course under their current plan.
 * Throws HttpError(403) if not allowed.
 */
export async function assertCanEnroll(userId: string, courseId: string): Promise<void> {
  const [user, course, currentEnrollments] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } }),
    prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { price: true, isFree: true, status: true },
    }),
    prisma.enrollment.count({ where: { userId } }),
  ])

  if (course.status !== "PUBLISHED") {
    throw new HttpError(403, "Course is not published")
  }

  const plan = PLANS[user.plan]

  if (plan.maxCoursePrice !== null) {
    const effectivePrice = course.isFree ? 0 : course.price
    if (effectivePrice > plan.maxCoursePrice) {
      throw new HttpError(
        403,
        `Your ${plan.name} plan doesn't allow enrolling in courses above $${plan.maxCoursePrice}. Upgrade to continue.`,
      )
    }
  }

  if (plan.maxEnrollments !== null && currentEnrollments >= plan.maxEnrollments) {
    throw new HttpError(
      403,
      `Your ${plan.name} plan is limited to ${plan.maxEnrollments} enrollments. Upgrade to enroll in more.`,
    )
  }
}

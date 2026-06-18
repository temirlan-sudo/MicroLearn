import fs from "fs/promises"
import os from "os"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
  process.env.JWT_ACCESS_SECRET = "test-access-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  process.env.UPLOAD_DIR = "./test-uploads"

  return {
    userPlan: "FREE",
    coursePrice: 0,
    courseIsFree: true,
    courseStatus: "PUBLISHED",
    enrollmentCount: 0,
    existingCertificate: null as any,
    createdCertificate: null as any,
    completedLessons: 0,
    modules: [
      { lessons: [{ id: "lesson-1" }, { id: "lesson-2" }, { id: "lesson-3" }, { id: "lesson-4" }] },
    ],
  }
})

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: "user-1",
        name: "Test Student",
        plan: state.userPlan,
      })),
    },
    course: {
      findUniqueOrThrow: vi.fn(async () => ({
        id: "course-1",
        title: "Test Course",
        price: state.coursePrice,
        isFree: state.courseIsFree,
        status: state.courseStatus,
        teacher: { name: "Test Teacher" },
      })),
    },
    enrollment: {
      count: vi.fn(async () => state.enrollmentCount),
    },
    module: {
      findMany: vi.fn(async () => state.modules),
    },
    lessonProgress: {
      count: vi.fn(async () => state.completedLessons),
    },
    certificate: {
      findUnique: vi.fn(async () => state.existingCertificate),
      create: vi.fn(async ({ data }: any) => {
        state.createdCertificate = data
        return data
      }),
    },
  },
}))

describe("learning business flow", () => {
  beforeEach(async () => {
    state.userPlan = "FREE"
    state.coursePrice = 0
    state.courseIsFree = true
    state.courseStatus = "PUBLISHED"
    state.enrollmentCount = 0
    state.existingCertificate = null
    state.createdCertificate = null
    state.completedLessons = 0
    process.env.UPLOAD_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "microlearn-tests-"))
  })

  it("allows enrollment when the plan constraints are satisfied", async () => {
    const { assertCanEnroll } = await import("./plan.service")

    await expect(assertCanEnroll("user-1", "course-1")).resolves.toBeUndefined()
  })

  it("blocks enrollment when the free plan limit is reached", async () => {
    const { assertCanEnroll } = await import("./plan.service")
    state.enrollmentCount = 3

    await expect(assertCanEnroll("user-1", "course-1")).rejects.toMatchObject({
      status: 403,
    })
  })

  it("calculates course progress from completed lessons", async () => {
    const { courseProgressPercent } = await import("./progress.service")
    state.completedLessons = 3

    await expect(courseProgressPercent("user-1", "course-1")).resolves.toBe(75)
  })

  it("issues a certificate and persists its file URL", async () => {
    const { issueCertificate } = await import("./certificate.service")

    const fileUrl = await issueCertificate("user-1", "course-1")

    expect(fileUrl).toMatch(/^\/uploads\/certificates\/cert-/)
    expect(state.createdCertificate).toMatchObject({
      userId: "user-1",
      courseId: "course-1",
      fileUrl,
    })
  })
})

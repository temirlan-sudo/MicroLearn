import cookieParser from "cookie-parser"
import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
  process.env.JWT_ACCESS_SECRET = "test-access-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  process.env.ACCESS_TOKEN_EXPIRES = "15m"
  process.env.REFRESH_TOKEN_EXPIRES = "7d"

  return {
    seq: 0,
    users: new Map<string, any>(),
  }
})

function publicUser(user: any) {
  const { passwordHash: _passwordHash, refreshToken: _refreshToken, ...safe } = user
  return safe
}

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email) return state.users.get(where.email) ?? null
        for (const user of state.users.values()) {
          if (user.id === where.id) return user
        }
        return null
      }),
      create: vi.fn(async ({ data }: any) => {
        const user = {
          id: `user-${++state.seq}`,
          name: data.name,
          email: data.email,
          role: data.role,
          plan: "FREE",
          avatarUrl: null,
          age: data.age ?? null,
          country: data.country ?? null,
          education: data.education ?? null,
          learningGoal: data.learningGoal ?? null,
          bio: null,
          passwordHash: data.passwordHash,
          refreshToken: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }
        state.users.set(user.email, user)
        return publicUser(user)
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const user =
          [...state.users.values()].find((item) => item.id === where.id) ??
          state.users.get(where.email)
        if (!user) throw new Error("User not found")
        Object.assign(user, data)
        return publicUser(user)
      }),
    },
  },
}))

vi.mock("../services/email.service", () => ({
  sendWelcome: vi.fn(async () => undefined),
}))

describe("auth routes", () => {
  let app: express.Express

  beforeAll(async () => {
    const { default: authRoutes } = await import("./auth")
    app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use("/auth", authRoutes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      res.status(err.status ?? 500).json({ error: err.message })
    })
  })

  beforeEach(() => {
    state.seq = 0
    state.users.clear()
  })

  it("registers a user and returns a safe payload", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Test Student",
      email: "student@example.com",
      password: "Password123!",
      role: "STUDENT",
    })

    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toEqual(expect.any(String))
    expect(res.body.data.user).toMatchObject({
      email: "student@example.com",
      role: "STUDENT",
      plan: "FREE",
    })
    expect(res.body.data.user.passwordHash).toBeUndefined()
    expect(res.headers["set-cookie"]?.[0]).toContain("mlrt=")
  })

  it("logs in, refreshes, and logs out", async () => {
    const registered = await request(app).post("/auth/register").send({
      name: "Test Student",
      email: "student@example.com",
      password: "Password123!",
      role: "STUDENT",
    })

    const login = await request(app).post("/auth/login").send({
      email: "student@example.com",
      password: "Password123!",
    })

    expect(login.status).toBe(200)
    expect(login.body.data.accessToken).toEqual(expect.any(String))

    const cookie = login.headers["set-cookie"] ?? registered.headers["set-cookie"]
    const refreshed = await request(app).post("/auth/refresh").set("Cookie", cookie)

    expect(refreshed.status).toBe(200)
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String))

    const logout = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${refreshed.body.data.accessToken}`)

    expect(logout.status).toBe(204)
  })
})

import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import rateLimit from "express-rate-limit"
import { Role } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess } from "../middleware/auth"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/token.service"
import { sendWelcome } from "../services/email.service"
import { env } from "../lib/env"

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Try again later." },
})

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(Role).optional(),
  age: z.number().int().min(5).max(120).optional(),
  country: z.string().max(80).optional(),
  education: z.string().max(120).optional(),
  learningGoal: z.string().max(200).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const REFRESH_COOKIE = "mlrt"
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  plan: true,
  avatarUrl: true,
  age: true,
  country: true,
  education: true,
  learningGoal: true,
  bio: true,
  createdAt: true,
}

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role, age, country, education, learningGoal } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new HttpError(409, "Email already registered")

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role ?? Role.USER,
        age,
        country,
        education,
        learningGoal,
      },
      select: publicUser,
    })

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions)
    sendWelcome(user.email, user.name).catch(() => undefined)

    res.status(201).json({ data: { user, accessToken } })
  }),
)

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new HttpError(401, "Invalid credentials")

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new HttpError(401, "Invalid credentials")

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions)

    const { passwordHash: _pw, refreshToken: _rt, ...safe } = user
    res.json({ data: { user: safe, accessToken } })
  }),
)

router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) throw new HttpError(401, "Missing refresh token")

    let payload
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw new HttpError(401, "Invalid refresh token")
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.refreshToken !== token) {
      throw new HttpError(401, "Refresh token revoked")
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const newRefresh = signRefreshToken({ sub: user.id })
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } })

    res.cookie(REFRESH_COOKIE, newRefresh, cookieOptions)
    res.json({ data: { accessToken } })
  }),
)

router.post(
  "/logout",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { refreshToken: null },
    })
    res.clearCookie(REFRESH_COOKIE, { path: "/" })
    res.status(204).end()
  }),
)

router.get(
  "/me",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: publicUser,
    })
    if (!user) throw new HttpError(404, "User not found")
    res.json({ data: user })
  }),
)

export default router

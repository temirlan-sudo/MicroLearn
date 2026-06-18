import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import http from "http"
import path from "path"
import fs from "fs"
import { ZodError } from "zod"

import { env, allowedOrigins } from "./lib/env"
import { HttpError } from "./lib/httpError"
import { initSocket } from "./socket"
import { metricsMiddleware, registry as metricsRegistry } from "./lib/metrics"

import authRoutes from "./routes/auth"
import userRoutes from "./routes/users"
import courseRoutes from "./routes/courses"
import moduleRoutes from "./routes/modules"
import lessonRoutes from "./routes/lessons"
import enrollmentRoutes from "./routes/enrollments"
import progressRoutes from "./routes/progress"
import reviewRoutes from "./routes/reviews"
import favoriteRoutes from "./routes/favorites"
import planRoutes from "./routes/plans"
import certificateRoutes from "./routes/certificates"
import assignmentRoutes from "./routes/assignments"
import quizRoutes from "./routes/quizzes"
import notificationRoutes from "./routes/notifications"
import reportRoutes from "./routes/reports"
import dashboardRoutes from "./routes/dashboard"
import adminRoutes from "./routes/admin"
import adaptiveRoutes, { teacherAdaptiveRouter } from "./routes/adaptive"
import scheduleRoutes from "./routes/schedule"

const app = express()

// Ensure uploads dir
const uploadDir = path.resolve(env.UPLOAD_DIR)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.use(
  cors({
    origin: (origin, cb) => {
      // В dev-режиме разрешаем запросы без origin (Postman/curl/native) и любой localhost/LAN-origin,
      // плюс всё что перечислено в CLIENT_URL / EXTRA_ORIGINS.
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      // Для локальной разработки/LAN-preview разрешаем localhost и частные сети
      // (10.x, 172.16-31.x, 192.168.x) — там же никогда не будет production.
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
          origin,
        )
      ) {
        return cb(null, true)
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Prometheus-метрики. Middleware считает каждый запрос; endpoint отдаёт текущий снэпшот.
app.use(metricsMiddleware)
app.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", metricsRegistry.contentType)
  res.send(await metricsRegistry.metrics())
})

// Static uploads
app.use("/uploads", express.static(uploadDir))

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() })
})

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/modules", moduleRoutes)
app.use("/api/lessons", lessonRoutes)
app.use("/api/enrollments", enrollmentRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/favorites", favoriteRoutes)
app.use("/api/plans", planRoutes)
app.use("/api/certificates", certificateRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/quizzes", quizRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/adaptive", adaptiveRoutes)
app.use("/api/teacher/adaptive", teacherAdaptiveRouter)
app.use("/api/schedule", scheduleRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.issues })
    return
  }
  // Multer size/filter errors
  const anyErr = err as { name?: string; message?: string; code?: string }
  if (anyErr?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too large" })
    return
  }
  if (anyErr?.name === "MulterError") {
    res.status(400).json({ error: anyErr.message ?? "Upload error" })
    return
  }
  // Prisma known errors — surface conflicts
  if (anyErr?.code === "P2002") {
    res.status(409).json({ error: "Unique constraint violation" })
    return
  }
  if (anyErr?.code === "P2025") {
    res.status(404).json({ error: "Resource not found" })
    return
  }

  console.error("[error]", err)
  res.status(500).json({
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : (anyErr?.message ?? "Internal error"),
  })
})

const httpServer = http.createServer(app)
initSocket(httpServer)

httpServer.listen(env.PORT, () => {
  console.log(`🚀 MicroLearn backend listening on :${env.PORT}`)
  console.log(`   CORS origin: ${env.CLIENT_URL}`)
})

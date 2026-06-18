import dotenv from "dotenv"
dotenv.config()

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET", "dev-access-secret"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES ?? "15m",
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES ?? "7d",
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? "60", 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "./uploads",
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB ?? "2", 10),
  MAX_VIDEO_SIZE_MB: parseInt(process.env.MAX_VIDEO_SIZE_MB ?? "500", 10),
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "587", 10),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "MicroLearn <no-reply@microlearn.local>",
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:7865",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  // Дополнительные разрешённые origin'ы через запятую, напр.
  // "http://localhost:3001,http://192.168.10.6:3001"
  EXTRA_ORIGINS: process.env.EXTRA_ORIGINS ?? "",
}

export const allowedOrigins: string[] = [
  env.CLIENT_URL,
  ...env.EXTRA_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]

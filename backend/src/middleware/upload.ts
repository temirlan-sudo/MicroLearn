import multer from "multer"
import path from "path"
import fs from "fs"
import { env } from "../lib/env"

const uploadDir = path.resolve(env.UPLOAD_DIR)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    cb(null, `${unique}${ext}`)
  },
})

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true)
  else cb(new Error("Only image files allowed"))
}

const videoFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (/^(video|application\/octet-stream)/.test(file.mimetype)) cb(null, true)
  else cb(new Error("Only video files allowed"))
}

const docFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (/pdf|msword|officedocument|plain|zip/.test(file.mimetype)) cb(null, true)
  else cb(new Error("Unsupported document type"))
}

export const uploadImage = multer({
  storage,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter: imageFilter,
})

export const uploadVideo = multer({
  storage,
  limits: { fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024 },
  fileFilter: videoFilter,
})

export const uploadDoc = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: docFilter,
})

export const uploadAny = multer({
  storage,
  limits: { fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024 },
})

export function publicUrl(filename: string): string {
  return `/uploads/${path.basename(filename)}`
}

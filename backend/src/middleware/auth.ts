import { Request, Response, NextFunction } from "express"
import { Role } from "@prisma/client"
import { verifyAccessToken } from "../services/token.service"
import { HttpError } from "../lib/httpError"

export function verifyAccess(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) throw new HttpError(401, "Missing access token")
  const token = auth.slice(7)
  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    next()
  } catch {
    throw new HttpError(401, "Invalid or expired access token")
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, "Unauthenticated")
    if (!roles.includes(req.user.role)) throw new HttpError(403, "Forbidden")
    next()
  }
}

// Optional auth: attaches user if token is valid, otherwise continues.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return next()
  try {
    const payload = verifyAccessToken(auth.slice(7))
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    /* ignore */
  }
  next()
}

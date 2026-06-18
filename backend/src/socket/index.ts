import { Server as HTTPServer } from "http"
import { Server as IOServer } from "socket.io"
import { env } from "../lib/env"
import { verifyAccessToken } from "../services/token.service"
import { registerHandlers } from "./handlers"

let io: IOServer | null = null

export function initSocket(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  })

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.authorization?.toString().replace(/^Bearer\s+/, "") ?? "")
    if (!token) return next() // allow anonymous; they can still "join" explicitly
    try {
      const payload = verifyAccessToken(token)
      ;(socket.data as any).userId = payload.sub
      socket.join(`user:${payload.sub}`)
    } catch {
      /* ignore invalid token, allow anonymous connection */
    }
    next()
  })

  io.on("connection", (socket) => {
    registerHandlers(socket)
  })

  return io
}

export function getIO(): IOServer | null {
  return io
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return
  io.to(`user:${userId}`).emit(event, payload)
}

export function broadcast(event: string, payload: unknown) {
  if (!io) return
  io.emit(event, payload)
}

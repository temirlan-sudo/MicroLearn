import { Socket } from "socket.io"
import { markLessonComplete } from "../services/progress.service"

export function registerHandlers(socket: Socket) {
  socket.on("join", (data: { userId?: string }) => {
    if (data?.userId) socket.join(`user:${data.userId}`)
  })

  socket.on("lesson:complete", async (data: { lessonId?: string }, ack?: (r: unknown) => void) => {
    const userId = (socket.data as any).userId as string | undefined
    if (!userId || !data?.lessonId) {
      ack?.({ error: "unauthorized or missing lessonId" })
      return
    }
    try {
      const result = await markLessonComplete(userId, data.lessonId)
      ack?.({ ok: true, ...result })
    } catch (err) {
      ack?.({ error: (err as Error).message })
    }
  })
}

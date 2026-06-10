import { Router, Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { verifyAccess } from "../middleware/auth"

const router = Router()

router.get(
  "/my",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const list = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    })
    res.json({ data: list, meta: { unread } })
  }),
)

router.patch(
  "/read-all",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    })
    res.status(204).end()
  }),
)

router.patch(
  "/:id/read",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notif) throw new HttpError(404, "Notification not found")
    if (notif.userId !== req.user!.id) throw new HttpError(403, "Forbidden")

    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: { read: true },
    })
    res.json({ data: updated })
  }),
)

export default router

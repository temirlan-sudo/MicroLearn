import { Router, Request, Response } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { HttpError } from "../lib/httpError"
import { validate } from "../middleware/validate"
import { verifyAccess } from "../middleware/auth"

const router = Router()

const addSchema = z.object({ courseId: z.string().min(1) })

router.post(
  "/",
  verifyAccess,
  validate(addSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { courseId } = req.body

    const existing = await prisma.favorite.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (existing) throw new HttpError(409, "Already favorited")

    const fav = await prisma.favorite.create({ data: { userId, courseId } })
    res.status(201).json({ data: fav })
  }),
)

router.delete(
  "/:courseId",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const fav = await prisma.favorite.findUnique({
      where: { userId_courseId: { userId, courseId: req.params.courseId } },
    })
    if (!fav) throw new HttpError(404, "Not in favorites")
    await prisma.favorite.delete({ where: { id: fav.id } })
    res.status(204).end()
  }),
)

router.get(
  "/my",
  verifyAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const favs = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        course: {
          include: { teacher: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    })
    res.json({ data: favs })
  }),
)

export default router

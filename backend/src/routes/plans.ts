import { Router, Request, Response } from "express"
import { z } from "zod"
import { Plan } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { asyncHandler } from "../lib/asyncHandler"
import { validate } from "../middleware/validate"
import { verifyAccess } from "../middleware/auth"
import { PLANS } from "../services/plan.service"
import { writeAuditLog } from "../services/audit-log.service"
import { createPlanPaymentIntent, retrievePaymentIntent } from "../services/payment.service"
import { HttpError } from "../lib/httpError"

const router = Router()

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: Object.values(PLANS) })
  }),
)

const subscribeSchema = z.object({
  plan: z.nativeEnum(Plan),
  billingPeriod: z.enum(["month", "year"]).default("month"),
})
const confirmSchema = z.object({ paymentIntentId: z.string().min(3) })

router.post(
  "/subscribe",
  verifyAccess,
  validate(subscribeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const plan = req.body.plan as Plan
    const billingPeriod = req.body.billingPeriod as "month" | "year"
    if (plan === Plan.FREE) {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { plan },
        select: { id: true, plan: true },
      })
      await writeAuditLog({
        req,
        action: "plan.changed.free",
        entityType: "User",
        entityId: user.id,
        metadata: { plan: user.plan },
      })
      res.json({ data: { user, requiresPayment: false } })
      return
    }

    const currentUser = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, email: true },
    })
    const intent = await createPlanPaymentIntent({
      userId: currentUser.id,
      userEmail: currentUser.email,
      plan,
      billingPeriod,
    })

    await writeAuditLog({
      req,
      action: "plan.payment_intent.created",
      entityType: "PaymentIntent",
      entityId: intent.id,
      metadata: { plan, billingPeriod, amount: intent.amount, currency: intent.currency },
    })

    res.status(201).json({
      data: {
        requiresPayment: true,
        plan,
        amount: intent.amount,
        currency: intent.currency,
        billingPeriod,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
      },
    })
  }),
)

router.post(
  "/confirm",
  verifyAccess,
  validate(confirmSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const intent = await retrievePaymentIntent(req.body.paymentIntentId)
    const plan = intent.metadata.plan as Plan | undefined
    const billingPeriod = intent.metadata.billingPeriod ?? "month"
    const userId = intent.metadata.userId

    if (!plan || !Object.values(Plan).includes(plan)) {
      throw new HttpError(400, "PaymentIntent has no valid plan metadata")
    }
    if (userId !== req.user!.id) {
      throw new HttpError(403, "PaymentIntent belongs to another user")
    }
    if (intent.status !== "succeeded") {
      throw new HttpError(400, `Payment is not completed: ${intent.status}`)
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { plan },
      select: { id: true, plan: true },
    })
    const payment = await prisma.planPayment.upsert({
      where: { stripePaymentId: intent.id },
      create: {
        userId: user.id,
        plan,
        amount: intent.amount,
        currency: intent.currency,
        billingPeriod,
        stripePaymentId: intent.id,
        status: intent.status,
        confirmedAt: new Date(),
      },
      update: {
        status: intent.status,
        confirmedAt: new Date(),
      },
    })

    await writeAuditLog({
      req,
      action: "plan.payment.succeeded",
      entityType: "PlanPayment",
      entityId: payment.id,
      metadata: {
        plan: user.plan,
        stripe_payment_id: payment.stripePaymentId,
        billingPeriod: payment.billingPeriod,
        amount: payment.amount,
        currency: payment.currency,
      },
    })
    res.json({ data: { user, payment } })
  }),
)

export default router

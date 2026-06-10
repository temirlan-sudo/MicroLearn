import Stripe from "stripe"
import { Plan } from "@prisma/client"
import { env } from "../lib/env"
import { HttpError } from "../lib/httpError"
import { PLANS } from "./plan.service"

let stripeClient: Stripe.Stripe | null = null

function stripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(500, "Stripe test secret key is not configured")
  }
  if (!env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    throw new HttpError(500, "Stripe key must be a test mode key")
  }
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY)
  return stripeClient
}

export type BillingPeriod = "month" | "year"

export function planAmountCents(plan: Plan, billingPeriod: BillingPeriod) {
  const multiplier = billingPeriod === "year" ? 9 : 1
  const amount = Math.round(PLANS[plan].priceUSD * multiplier * 100)
  if (amount <= 0) throw new HttpError(400, "Free plan does not require card payment")
  return amount
}

export async function createPlanPaymentIntent(opts: {
  userId: string
  userEmail: string
  plan: Plan
  billingPeriod: BillingPeriod
}) {
  const amount = planAmountCents(opts.plan, opts.billingPeriod)
  return stripe().paymentIntents.create({
    amount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    receipt_email: opts.userEmail,
    metadata: {
      userId: opts.userId,
      plan: opts.plan,
      billingPeriod: opts.billingPeriod,
      project: "MicroLearn diploma MVP",
      mode: "test",
    },
  })
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  return stripe().paymentIntents.retrieve(paymentIntentId)
}

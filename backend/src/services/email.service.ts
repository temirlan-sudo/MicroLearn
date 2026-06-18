import nodemailer, { Transporter } from "nodemailer"
import { env } from "../lib/env"

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  return transporter
}

async function send(to: string, subject: string, html: string) {
  const t = getTransporter()
  if (!t) {
    console.log(`[email:stub] → ${to} | ${subject}`)
    return
  }
  try {
    await t.sendMail({ from: env.SMTP_FROM, to, subject, html })
  } catch (err) {
    console.error("[email] send failed:", (err as Error).message)
  }
}

export async function sendWelcome(to: string, name: string) {
  await send(
    to,
    "Welcome to MicroLearn",
    `<h1>Welcome, ${name}!</h1><p>Thanks for joining MicroLearn. Start exploring courses now.</p>`,
  )
}

export async function sendEnrollment(to: string, name: string, courseTitle: string) {
  await send(
    to,
    `Enrollment confirmed: ${courseTitle}`,
    `<h1>You're enrolled, ${name}!</h1><p>Course: <b>${courseTitle}</b></p>`,
  )
}

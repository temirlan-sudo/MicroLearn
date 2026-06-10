import { chromium } from "playwright"

const appUrl = process.env.APP_URL ?? "http://localhost:7865"
const apiUrl = process.env.API_URL ?? "http://localhost:7666/api"

async function api(path, options = {}) {
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  return { res, json }
}

const { json: courses } = await api("/courses")
const publicCourseId = courses.data[0].id

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
const unauthorized = []
const forbidden = []

page.on("console", (msg) => {
  if (msg.text().includes("Failed to load resource")) return
  if (msg.type() === "error") errors.push(msg.text())
})
page.on("pageerror", (err) => errors.push(err.message))
page.on("response", (response) => {
  if (response.status() === 401) unauthorized.push(response.url())
  if (response.status() === 403) forbidden.push(response.url())
})
page.on("requestfailed", (request) => {
  const reason = request.failure()?.errorText ?? "request failed"
  if (reason.includes("ERR_ABORTED")) return
  errors.push(`${request.url()} ${reason}`)
})

await page.goto(`${appUrl}/courses/${publicCourseId}`, { waitUntil: "networkidle" })
const guestLessonLinks = await page
  .locator(`a[href*="/courses/${publicCourseId}/lessons/"]`)
  .count()
if (guestLessonLinks > 0) {
  throw new Error(`Guest course page exposes ${guestLessonLinks} lesson links`)
}
await page
  .getByText(/Уроки откроются после записи/i)
  .first()
  .waitFor({ timeout: 10_000 })
await page.goto(`${appUrl}/courses/${publicCourseId}`, { waitUntil: "networkidle" })

if (unauthorized.length > 0) {
  throw new Error(`Guest page produced 401 responses: ${unauthorized.join(", ")}`)
}

const { json: login } = await api("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "temir@microlearn.io", password: "Password123!" }),
})
const token = login.data.accessToken

const { json: enrollments } = await api("/enrollments/my", {
  headers: { Authorization: `Bearer ${token}` },
})
const courseId = enrollments.data[0].courseId

await page.addInitScript((accessToken) => {
  window.localStorage.setItem("ml_access_token", accessToken)
}, token)

const authed401 = []
page.on("response", (response) => {
  if (response.status() === 401) authed401.push(response.url())
  if (response.status() === 403) forbidden.push(response.url())
})

await page.goto(`${appUrl}/student/courses`, { waitUntil: "networkidle" })
await page
  .getByRole("link", { name: /Продолжить|Начать курс/i })
  .first()
  .click()
await page.waitForURL(/\/courses\//, { timeout: 10_000 })

await page.goto(`${appUrl}/courses/${courseId}`, { waitUntil: "networkidle" })
await page.getByRole("link", { name: /Продолжить обучение/i }).click()
await page.waitForURL(/\/lessons\//, { timeout: 10_000 })

const completeButton = page.getByRole("button", { name: /Завершить урок/i })
if (await completeButton.isVisible().catch(() => false)) {
  await completeButton.click()
  await page.waitForURL(/\/courses\/.*#program|\/courses\/.*\?/, { timeout: 10_000 })
}

const { json: adminLogin } = await api("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "admin@microlearn.io", password: "Password123!" }),
})
await page.addInitScript((accessToken) => {
  window.localStorage.setItem("ml_access_token", accessToken)
}, adminLogin.data.accessToken)
await page.goto(`${appUrl}/admin`, { waitUntil: "networkidle" })
await page
  .getByText(/Платформа|Пользователи|Жалобы/i)
  .first()
  .waitFor({ timeout: 10_000 })

if (forbidden.length > 0) {
  throw new Error(`Browser produced 403 responses: ${forbidden.join(", ")}`)
}

if (errors.length > 0) {
  throw new Error(`Browser errors: ${errors.join(" | ")}`)
}

if (authed401.length > 0) {
  throw new Error(`Authorized flow produced 401 responses: ${authed401.join(", ")}`)
}

await browser.close()
console.log("Playwright smoke passed")

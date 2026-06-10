/**
 * MicroLearn presentation screenshots.
 *
 * Запускает headless-браузер, логинится последовательно как guest / student /
 * teacher / admin и сохраняет полностраничные PNG в папку ./screenshots.
 *
 * Перед запуском должны быть подняты:
 *   - backend на http://localhost:7666
 *   - frontend на http://localhost:7865
 *   - выполнен seed (demo-данные).
 *
 * Запуск:
 *   node tests/playwright-screens.mjs
 *
 * Опции через переменные окружения:
 *   APP_URL, API_URL                 — адреса frontend / backend
 *   SCREENSHOTS_DIR                  — куда складывать (по умолчанию ./screenshots)
 *   SCREENSHOT_THEME=light|dark      — тема (по умолчанию light)
 *   VIEWPORT=1440x900                — размер окна
 */

import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const appUrl = process.env.APP_URL ?? "http://localhost:7865"
const apiUrl = process.env.API_URL ?? "http://localhost:7666/api"
const outDir = path.resolve(process.env.SCREENSHOTS_DIR ?? "screenshots")
const theme = process.env.SCREENSHOT_THEME === "dark" ? "dark" : "light"
const [vw, vh] = (process.env.VIEWPORT ?? "1440x900").split("x").map(Number)

const ACCOUNTS = {
  student: { email: "temir@microlearn.io", password: "Password123!" },
  teacher: { email: "aigerim@microlearn.io", password: "Password123!" },
  admin: { email: "admin@microlearn.io", password: "Password123!" },
}

const VERIFY_CODE = process.env.VERIFY_CODE ?? "ML-DEMO-2026"

fs.mkdirSync(outDir, { recursive: true })

async function api(p, options = {}) {
  const res = await fetch(`${apiUrl}${p}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(`API ${options.method ?? "GET"} ${p} -> ${res.status} ${text}`)
  }
  return json
}

async function login(role) {
  const creds = ACCOUNTS[role]
  if (!creds) throw new Error(`Unknown role: ${role}`)
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(creds),
  })
  return data.data.accessToken
}

function logStep(label) {
  // eslint-disable-next-line no-console
  console.log(`  • ${label}`)
}

async function shoot(page, name, { fullPage = true, beforeShot } = {}) {
  if (beforeShot) await beforeShot()
  // даём странице успокоиться
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(400)
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage })
  logStep(`saved ${path.relative(process.cwd(), file)}`)
}

async function gotoAndShoot(page, urlPath, name, opts) {
  await page.goto(`${appUrl}${urlPath}`, { waitUntil: "domcontentloaded" })
  await shoot(page, name, opts)
}

async function setTokenAndReload(page, token) {
  await page.evaluate((t) => {
    window.localStorage.setItem("ml_access_token", t)
  }, token)
}

async function setThemeCookie(context) {
  // next-themes хранит тему в localStorage — выставим до загрузки страницы.
  await context.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value)
    } catch {}
  }, theme)
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`MicroLearn screenshots → ${outDir}`)
  // eslint-disable-next-line no-console
  console.log(`  app=${appUrl}`)
  // eslint-disable-next-line no-console
  console.log(`  api=${apiUrl}`)
  // eslint-disable-next-line no-console
  console.log(`  theme=${theme} viewport=${vw}x${vh}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: 2, // ретина — крупнее текст в презентации
    colorScheme: theme,
    locale: "ru-RU",
  })
  await setThemeCookie(context)
  const page = await context.newPage()

  // достаём id первого опубликованного курса для публичных и студенческих экранов
  const coursesResp = await api("/courses")
  const publicCourse = coursesResp.data?.[0]
  if (!publicCourse) {
    throw new Error("No published courses returned by /api/courses — запусти seed.")
  }
  const publicCourseId = publicCourse.id

  // ───────── GUEST ─────────
  // eslint-disable-next-line no-console
  console.log("\n[guest]")
  await gotoAndShoot(page, "/", "01-home")
  await gotoAndShoot(page, "/search?q=react", "02-search")
  await gotoAndShoot(page, `/courses/${publicCourseId}`, "03-course-detail-guest")
  await gotoAndShoot(page, "/pricing", "04-pricing")
  await gotoAndShoot(page, "/authors", "05-authors")
  await gotoAndShoot(page, "/about", "06-about")
  await gotoAndShoot(page, "/register", "07-register")
  await gotoAndShoot(page, `/certificates/verify/${VERIFY_CODE}`, "08-certificate-verify")

  // ───────── STUDENT ─────────
  // eslint-disable-next-line no-console
  console.log("\n[student]")
  const studentToken = await login("student")
  await page.goto(appUrl, { waitUntil: "domcontentloaded" })
  await setTokenAndReload(page, studentToken)

  await gotoAndShoot(page, "/student", "10-student-dashboard")
  await gotoAndShoot(page, "/student/courses", "11-student-courses")
  await gotoAndShoot(page, "/student/schedule", "12-student-schedule")
  await gotoAndShoot(page, "/profile", "13-student-profile")

  // курс глазами студента + урок
  const enrollments = await api("/enrollments/my", {
    headers: { Authorization: `Bearer ${studentToken}` },
  })
  const enrolledCourseId = enrollments.data?.[0]?.courseId ?? publicCourseId
  await gotoAndShoot(page, `/courses/${enrolledCourseId}`, "14-course-detail-student")

  try {
    const courseFull = await api(`/courses/${enrolledCourseId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    const firstLesson = courseFull.data?.modules?.[0]?.lessons?.[0]
    if (firstLesson?.id) {
      await gotoAndShoot(
        page,
        `/courses/${enrolledCourseId}/lessons/${firstLesson.id}`,
        "15-lesson-reader",
      )
    }
  } catch (err) {
    logStep(`skip lesson screenshot: ${err.message}`)
  }

  // ───────── TEACHER ─────────
  // eslint-disable-next-line no-console
  console.log("\n[teacher]")
  const teacherToken = await login("teacher")
  await page.goto(appUrl, { waitUntil: "domcontentloaded" })
  await setTokenAndReload(page, teacherToken)

  await gotoAndShoot(page, "/teacher", "20-teacher-dashboard")
  await gotoAndShoot(page, "/teacher/courses", "21-teacher-courses")
  await gotoAndShoot(page, "/teacher/new", "22-teacher-new-course")

  // ───────── ADMIN ─────────
  // eslint-disable-next-line no-console
  console.log("\n[admin]")
  const adminToken = await login("admin")
  await page.goto(appUrl, { waitUntil: "domcontentloaded" })
  await setTokenAndReload(page, adminToken)

  await gotoAndShoot(page, "/admin", "30-admin-panel")

  await browser.close()
  // eslint-disable-next-line no-console
  console.log(`\n✓ Done. Files in ${outDir}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Screenshot run failed:", err)
  process.exitCode = 1
})

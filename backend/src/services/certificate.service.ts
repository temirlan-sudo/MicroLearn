/**
 * Генерация PDF-сертификата в «газетном» стиле.
 *
 * Используем pdf-lib + @pdf-lib/fontkit, чтобы встроить TTF-шрифты с кириллицей
 * (Helvetica из стандартных шрифтов pdf-lib кириллицу не поддерживает).
 *
 * Шрифты лежат в backend/assets/fonts:
 *   - Oswald-Bold.ttf       — крупная типографика (заголовок, имя, название курса);
 *   - PTSerif-Regular.ttf   — основной текст (даты, лейблы);
 *   - PTSerif-Italic.ttf    — короткие пояснительные подписи.
 */

import { PDFDocument, PDFFont, PDFPage, degrees, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import fs from "fs/promises"
import path from "path"
import { env } from "../lib/env"
import { prisma } from "../lib/prisma"

function verificationCode() {
  return `ML-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
    .toString(36)
    .slice(-5)
    .toUpperCase()}`
}

const FONTS_DIR = path.resolve(__dirname, "../../assets/fonts")
let fontCache: { oswald: Buffer; serif: Buffer; serifItalic: Buffer } | null = null

async function loadFontsOnce() {
  if (fontCache) return fontCache
  const [oswald, serif, serifItalic] = await Promise.all([
    fs.readFile(path.join(FONTS_DIR, "Oswald-Bold.ttf")),
    fs.readFile(path.join(FONTS_DIR, "PTSerif-Regular.ttf")),
    fs.readFile(path.join(FONTS_DIR, "PTSerif-Italic.ttf")),
  ])
  fontCache = { oswald, serif, serifItalic }
  return fontCache
}

// Палитра «газеты»
const INK = rgb(0.08, 0.08, 0.08)
const PAPER = rgb(0.965, 0.95, 0.91)
const RED = rgb(0.78, 0.12, 0.12)
const MUTED = rgb(0.32, 0.32, 0.32)

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  letterSpacing = 0,
) {
  const { width } = page.getSize()
  if (letterSpacing > 0) {
    // Эмуляция трекинга — рисуем посимвольно, считая ширину каждой буквы.
    const totalWidth =
      [...text].reduce((acc, ch) => acc + font.widthOfTextAtSize(ch, size), 0) +
      letterSpacing * (text.length - 1)
    let x = (width - totalWidth) / 2
    for (const ch of text) {
      page.drawText(ch, { x, y, font, size, color })
      x += font.widthOfTextAtSize(ch, size) + letterSpacing
    }
    return
  }
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (width - textWidth) / 2, y, font, size, color })
}

function drawRule(page: PDFPage, x1: number, x2: number, y: number, thickness = 0.6, color = INK) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
}

function drawCornerCross(page: PDFPage, cx: number, cy: number, size = 6, color = MUTED) {
  page.drawLine({
    start: { x: cx - size, y: cy },
    end: { x: cx + size, y: cy },
    thickness: 0.5,
    color,
  })
  page.drawLine({
    start: { x: cx, y: cy - size },
    end: { x: cx, y: cy + size },
    thickness: 0.5,
    color,
  })
}

function drawApprovedStamp(
  page: PDFPage,
  cx: number,
  cy: number,
  font: PDFFont,
  serif: PDFFont,
) {
  const outerR = 52
  const innerR = 44

  // Внешний круг
  page.drawCircle({ x: cx, y: cy, size: outerR, borderColor: RED, borderWidth: 2.4 })
  // Внутренний декоративный круг
  page.drawCircle({ x: cx, y: cy, size: innerR, borderColor: RED, borderWidth: 0.6 })

  // Текст «ОДОБРЕНО» с лёгким наклоном
  const text = "ОДОБРЕНО"
  const size = 18
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: cx - w / 2,
    y: cy - 4,
    font,
    size,
    color: RED,
    rotate: degrees(-8),
  })

  // Декоративная подпись сверху
  const top = "★  СЕРТИФИКАТ  ★"
  const topSize = 7
  const topW = serif.widthOfTextAtSize(top, topSize)
  page.drawText(top, {
    x: cx - topW / 2,
    y: cy + 22,
    font: serif,
    size: topSize,
    color: RED,
    rotate: degrees(-8),
  })

  // Звёздочки снизу
  const stars = "★ ★ ★ ★ ★"
  const starsSize = 9
  const starsW = font.widthOfTextAtSize(stars, starsSize)
  page.drawText(stars, {
    x: cx - starsW / 2,
    y: cy - 26,
    font,
    size: starsSize,
    color: RED,
    rotate: degrees(-8),
  })
}

function drawVerticalText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = MUTED,
  letterSpacing = 1.4,
) {
  // Поворот на 90° по часовой → читается снизу вверх
  page.drawText(text, {
    x,
    y,
    font,
    size,
    color,
    rotate: degrees(90),
    // имитация трекинга через character spacing недоступна, поэтому добавим пробелы
  })
  void letterSpacing // зарезервировано
}

function drawDottedLine(
  page: PDFPage,
  x1: number,
  x2: number,
  y: number,
  step = 3,
  color = INK,
) {
  for (let x = x1; x <= x2; x += step) {
    page.drawLine({
      start: { x, y },
      end: { x: x + 1.2, y },
      thickness: 0.6,
      color,
    })
  }
}

export async function generateCertificatePdf(opts: {
  userName: string
  courseTitle: string
  teacherName: string
  issuedAt: Date
  verificationCode?: string
}): Promise<{ filePath: string; fileUrl: string }> {
  const { userName, courseTitle, teacherName, issuedAt } = opts
  const code = opts.verificationCode ?? "ML-DRAFT-0000"

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const fonts = await loadFontsOnce()
  const display = await pdf.embedFont(fonts.oswald, { subset: true })
  const body = await pdf.embedFont(fonts.serif, { subset: true })
  const italic = await pdf.embedFont(fonts.serifItalic, { subset: true })

  // A4 landscape
  const page = pdf.addPage([842, 595])
  const { width, height } = page.getSize()

  page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER })

  page.drawRectangle({
    x: 16,
    y: 16,
    width: width - 32,
    height: height - 32,
    borderColor: INK,
    borderWidth: 1,
  })
  page.drawRectangle({
    x: 22,
    y: 22,
    width: width - 44,
    height: height - 44,
    borderColor: INK,
    borderWidth: 0.4,
  })

  const headerY = height - 58
  const yearLabel = `ИЗД. / ${issuedAt.getFullYear()}`
  const issueLabel = `ВЫПУСК № ${String(issuedAt.getMonth() + 1).padStart(2, "0")}-${String(
    issuedAt.getFullYear(),
  ).slice(-2)}`
  const motto = "ЗНАНИЯ. ПРАКТИКА. РЕЗУЛЬТАТ."

  page.drawText(yearLabel, { x: 52, y: headerY, font: display, size: 9, color: INK })
  const issW = display.widthOfTextAtSize(issueLabel, 9)
  page.drawText(issueLabel, {
    x: (width - issW) / 2,
    y: headerY,
    font: display,
    size: 9,
    color: INK,
  })
  const motW = display.widthOfTextAtSize(motto, 9)
  page.drawText(motto, {
    x: width - 52 - motW,
    y: headerY,
    font: display,
    size: 9,
    color: INK,
  })

  drawRule(page, 38, width - 38, headerY - 10, 0.6)
  drawRule(page, 38, width - 38, headerY - 13, 0.3)

  drawCentered(page, "СЕРТИФИКАТ", height - 190, display, 94, INK, 2.4)

  const subTitle = "О  ЗАВЕРШЕНИИ  КУРСА"
  const subSize = 14
  const subWidth = display.widthOfTextAtSize(subTitle, subSize) + 14
  const subBoxW = subWidth + 30
  const subBoxX = (width - subBoxW) / 2
  const subBoxY = height - 230
  page.drawRectangle({
    x: subBoxX,
    y: subBoxY,
    width: subBoxW,
    height: 26,
    borderColor: INK,
    borderWidth: 0.8,
  })
  drawCentered(page, subTitle, subBoxY + 8, display, subSize, INK, 1.6)

  drawCentered(
    page,
    "Настоящий сертификат подтверждает, что",
    height - 266,
    italic,
    13,
    MUTED,
  )

  const upperName = userName.toUpperCase()
  let nameSize = 56
  while (display.widthOfTextAtSize(upperName, nameSize) > width - 160 && nameSize > 28) {
    nameSize -= 2
  }
  drawCentered(page, upperName, height - 330, display, nameSize, INK, 2)

  drawDottedLine(page, 145, width - 145, height - 342, 3, MUTED)

  drawCentered(page, "успешно завершил(а) курс", height - 376, italic, 13, MUTED)

  const courseUpper = courseTitle.toUpperCase()
  let courseSize = 26
  while (display.widthOfTextAtSize(courseUpper, courseSize) > width - 220 && courseSize > 14) {
    courseSize -= 1
  }
  const barTextW = display.widthOfTextAtSize(courseUpper, courseSize)
  const barPadX = 28
  const barW = barTextW + barPadX * 2
  const barH = courseSize + 18
  const barX = (width - barW) / 2
  const barY = height - 430
  page.drawRectangle({ x: barX, y: barY, width: barW, height: barH, color: INK })
  page.drawText(courseUpper, {
    x: barX + barPadX,
    y: barY + 9,
    font: display,
    size: courseSize,
    color: PAPER,
  })

  const dateStr = `Дата выдачи: ${issuedAt
    .toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".")}`
  const certNoStr = `Сертификат № ${code}`
  drawCentered(page, dateStr, 120, body, 12, INK)
  drawCentered(page, certNoStr, 101, body, 12, INK)

  const sigY = 58
  const leftFromX = 46
  const leftToX = 290
  const rightFromX = width - 302
  const rightToX = width - 86
  drawRule(page, leftFromX, leftToX, sigY, 0.6)
  drawRule(page, rightFromX, rightToX, sigY, 0.6)
  page.drawText("Подпись", {
    x: leftFromX,
    y: sigY - 14,
    font: italic,
    size: 10,
    color: MUTED,
  })
  page.drawText(`Руководитель курса · ${teacherName}`, {
    x: rightFromX,
    y: sigY - 14,
    font: italic,
    size: 10,
    color: MUTED,
  })

  const yearStr = String(issuedAt.getFullYear())
  page.drawRectangle({
    x: width - 72,
    y: 76,
    width: 44,
    height: 62,
    borderColor: INK,
    borderWidth: 0.8,
  })
  page.drawText("№", {
    x: width - 61,
    y: 118,
    font: display,
    size: 10,
    color: INK,
  })
  const issueShort = String(issuedAt.getMonth() + 1).padStart(2, "0")
  page.drawText(issueShort, {
    x: width - 61,
    y: 101,
    font: display,
    size: 14,
    color: INK,
  })
  page.drawText(yearStr, {
    x: width - 66,
    y: 86,
    font: display,
    size: 9,
    color: INK,
  })

  drawApprovedStamp(page, width - 135, 185, display, body)

  // ───────── Сохранение ─────────
  const bytes = await pdf.save()
  const dir = path.resolve(env.UPLOAD_DIR, "certificates")
  await fs.mkdir(dir, { recursive: true })
  const filename = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, bytes)

  return { filePath, fileUrl: `/uploads/certificates/${filename}` }
}

export async function issueCertificate(userId: string, courseId: string): Promise<string> {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (existing) return existing.fileUrl

  const [user, course] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: { teacher: true },
    }),
  ])

  const code = verificationCode()
  const { fileUrl } = await generateCertificatePdf({
    userName: user.name,
    courseTitle: course.title,
    teacherName: course.teacher.name,
    issuedAt: new Date(),
    verificationCode: code,
  })

  await prisma.certificate.create({
    data: { userId, courseId, fileUrl, verificationCode: code },
  })

  return fileUrl
}

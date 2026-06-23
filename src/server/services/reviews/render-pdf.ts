// Server-side PDF of a review report via headless Chromium (@sparticuz/chromium +
// puppeteer-core). Renders the self-contained print HTML (no auth/layout/theme deps)
// with page.setContent, then page.pdf. Used by the download route and the email sender.
//
// Why puppeteer-core (not playwright-core): @sparticuz/chromium is built for puppeteer,
// and playwright-core's runtime path requires aren't followed by Vercel/Next file tracing,
// so the package never reached the serverless function ("Cannot find module …playwright…").
//
// Runtime note: @sparticuz/chromium ships a Linux Chromium for serverless (Vercel).
// Locally on Windows/macOS set PUPPETEER_EXECUTABLE_PATH to a local Chrome/Chromium.

import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { loadWeeklyReport, loadMonthlyReport } from "./report-data"
import { loadReviewAnalytics } from "./review-insights"
import { renderReviewReportHtml } from "./pdf-report-html"
import type { ReviewPeriod } from "@/server/services/email/send-review"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

async function buildHtml(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<string> {
  const analytics = await loadReviewAnalytics(prisma, userId, period)
  if (period.kind === "weekly") {
    const { report, saved } = await loadWeeklyReport(prisma, userId, period.weekStart)
    return renderReviewReportHtml({
      kind: "weekly",
      title: report.weekLabel,
      subtitle: `Review semanal · ${report.kpis.trades} trades · moneda base ${report.baseCurrency}`,
      report,
      aiAnalysis: saved?.aiAnalysis ?? null,
      analytics,
    })
  }
  const { report, saved } = await loadMonthlyReport(prisma, userId, period.year, period.month)
  return renderReviewReportHtml({
    kind: "monthly",
    title: `${MONTHS[period.month - 1]} ${period.year}`,
    subtitle: `Review mensual · ${report.kpis.trades} trades · moneda base ${report.baseCurrency}`,
    report,
    aiAnalysis: saved?.aiAnalysis ?? null,
    analytics,
  })
}

export async function renderReviewPdf(prisma: PrismaClient, args: { userId: string; period: ReviewPeriod }): Promise<Buffer> {
  const html = await buildHtml(prisma, args.userId, args.period)

  const localExe = process.env.PUPPETEER_EXECUTABLE_PATH
  const executablePath = localExe || (await chromium.executablePath())

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" }) // self-contained HTML, no network
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

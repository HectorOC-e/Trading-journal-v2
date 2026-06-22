// Server-side PDF of a review report via headless Chromium (@sparticuz/chromium +
// playwright-core). Renders the self-contained print HTML (no auth/layout/theme deps)
// with page.setContent, then page.pdf. Used by the download route and the email sender.
//
// Runtime note: @sparticuz/chromium ships a Linux Chromium for serverless (Vercel).
// Locally on Windows/macOS it may not provide a usable binary — set the
// PLAYWRIGHT_CHROMIUM_EXECUTABLE env to a local Chrome/Chromium to test on dev.

import chromium from "@sparticuz/chromium"
import { chromium as playwright } from "playwright-core"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { loadWeeklyReport, loadMonthlyReport } from "./report-data"
import { renderReviewReportHtml } from "./pdf-report-html"
import type { ReviewPeriod } from "@/server/services/email/send-review"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

async function buildHtml(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<string> {
  if (period.kind === "weekly") {
    const { report, saved } = await loadWeeklyReport(prisma, userId, period.weekStart)
    return renderReviewReportHtml({
      kind: "weekly",
      title: report.weekLabel,
      subtitle: `Review semanal · ${report.kpis.trades} trades · moneda base ${report.baseCurrency}`,
      report,
      aiAnalysis: saved?.aiAnalysis ?? null,
    })
  }
  const { report, saved } = await loadMonthlyReport(prisma, userId, period.year, period.month)
  return renderReviewReportHtml({
    kind: "monthly",
    title: `${MONTHS[period.month - 1]} ${period.year}`,
    subtitle: `Review mensual · ${report.kpis.trades} trades · moneda base ${report.baseCurrency}`,
    report,
    aiAnalysis: saved?.aiAnalysis ?? null,
  })
}

export async function renderReviewPdf(prisma: PrismaClient, args: { userId: string; period: ReviewPeriod }): Promise<Buffer> {
  const html = await buildHtml(prisma, args.userId, args.period)

  const localExe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  const executablePath = localExe || (await chromium.executablePath())

  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: executablePath || undefined,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle" })
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

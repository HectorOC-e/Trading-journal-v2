// Cron processes each world independently, saving only into evidence-bound mode
// snapshots. The manual period envelope and legacy mixed AI are never rewritten.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { OPERATIONAL_MODES, MODE_LABELS } from "@/domains/trading/operational-mode"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { loadWeeklyReport, loadMonthlyReport } from "./report-data"
import { buildAnalysisPrompt, runReviewAnalysis } from "./review-ai"
import { loadReviewInsights } from "./review-insights"
import { saveReviewModeAnalysis } from "./mode-snapshots"
import { ensureWeeklyReviewEnvelope } from "./envelopes"
import type { ReviewPeriod } from "@/server/services/email/send-review"

export async function ensureReviewAnalysis(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<void> {
  const candidates = usableCandidates(await resolveAiCall(prisma, userId, "weekly_reviews"))
  if (candidates.length === 0) return

  // Ensure notes have their stable empty shape before hashing report evidence.
  if (period.kind === "weekly") {
    await ensureWeeklyReviewEnvelope(prisma, userId, period.weekStart)
  } else {
    await prisma.monthlyReview.upsert({
      where: { userId_year_month: { userId, year: period.year, month: period.month } },
      create: { userId, year: period.year, month: period.month },
      update: {},
    })
  }

  for (const mode of period.mode ? [period.mode] : OPERATIONAL_MODES) {
    const bundle = period.kind === "weekly"
      ? await loadWeeklyReport(prisma, userId, period.weekStart, mode)
      : await loadMonthlyReport(prisma, userId, period.year, period.month, mode)
    const { report, saved, snapshot, evidenceHash } = bundle
    if (report.kpis.trades === 0 || saved?.aiAnalysis) continue
    const insights = await loadReviewInsights(prisma, userId, { ...period, mode })
    const label = period.kind === "weekly"
      ? (report as Awaited<ReturnType<typeof loadWeeklyReport>>["report"]).weekLabel
      : `${String(period.month).padStart(2, "0")}/${period.year}`
    const prompt = `Modalidad: ${mode} (${MODE_LABELS[mode]}). Analiza únicamente esta modalidad; no combines resultados con otros mundos. Las notas manuales compartidas no son evidencia financiera.\n` +
      buildAnalysisPrompt(label, period.kind, report, insights).replace("(datos reales)", "(evidencia de la modalidad indicada)")
    const analysis = await runReviewAnalysis(candidates, prompt, "background")
    if (analysis) await saveReviewModeAnalysis(prisma, snapshot, evidenceHash, analysis)
  }
}

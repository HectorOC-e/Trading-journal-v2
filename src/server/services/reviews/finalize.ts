// A review row is the shared manual-notes envelope. Automatic financial results
// belong to the mode snapshots refreshed by the report loaders.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { OPERATIONAL_MODES, type OperationalMode } from "@/domains/trading/operational-mode"
import { loadWeeklyReport } from "./report-data"
import { ensureWeeklyReviewEnvelope } from "./envelopes"

export type FinalizeResult = "finalized" | "skipped"

export async function finalizeWeeklyReview(
  prisma: PrismaClient,
  userId: string,
  weekStart: string,
  mode?: OperationalMode,
): Promise<FinalizeResult> {
  const bundles = await Promise.all((mode ? [mode] : OPERATIONAL_MODES).map(
    selected => loadWeeklyReport(prisma, userId, weekStart, selected),
  ))
  if (!bundles.some(({ report }) => report.kpis.trades > 0)) return "skipped"

  const saved = await ensureWeeklyReviewEnvelope(prisma, userId, weekStart)
  if (saved.status !== "submitted") {
    await prisma.weeklyReview.update({ where: { id: saved.id, userId }, data: { status: "submitted" } })
  }
  return "finalized"
}

// ─────────────────────────────────────────────────────────────────────────────
// recomputeInsights — the C8/#18 job (Sprint 0).
//
// Runs the EXISTING deterministic detectors (insights-engine + psychology-insights
// — no new analysis is introduced in S0) for a user and persists the result via
// the historization diff, emitting insight.created/resolved on the outbox. This is
// the producer side of the S0 bus.
//
// Scope guard: S0 reuses the detectors already in the repo. New detectors (rolling,
// Bayesian edge decay, drift…) are later sprints. sample_size is the number of
// trades analysed — a coarse but honest n (per-detector n is an S3 refinement, see
// OPEN_ITEMS_SPRINT_0).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generateInsights } from "@/domains/analytics/services/insights-engine"
import { generatePsychologyInsights } from "@/domains/analytics/services/psychology-insights"
import { persistInsights, toComputedInsight, type PersistResult } from "./insight-store"

export async function recomputeInsightsForUser(userId: string, prisma: PrismaClient): Promise<PersistResult> {
  const bundle = await buildAnalyticsBundle(userId, prisma)
  const n = bundle.raw.trades.length

  const engineInsights = [
    ...generateInsights({
      trades: bundle.raw.trades,
      setups: bundle.raw.setupsMeta,
      accounts: bundle.raw.accountsMeta,
      withdrawals: bundle.raw.withdrawals,
    }),
    ...generatePsychologyInsights(bundle.raw.trades),
  ]

  const computed = engineInsights.map((i) => toComputedInsight(i, n))
  return persistInsights(userId, computed, prisma)
}

export interface RecomputeAllResult {
  users: number
  created: number
  touched: number
  resolved: number
  failures: number
}

export async function recomputeInsightsForAll(prisma: PrismaClient): Promise<RecomputeAllResult> {
  const users = await prisma.user.findMany({ select: { id: true } })
  const totals: RecomputeAllResult = { users: users.length, created: 0, touched: 0, resolved: 0, failures: 0 }

  for (const u of users) {
    try {
      const r = await recomputeInsightsForUser(u.id, prisma)
      totals.created += r.created
      totals.touched += r.touched
      totals.resolved += r.resolved
    } catch {
      totals.failures += 1
    }
  }
  return totals
}

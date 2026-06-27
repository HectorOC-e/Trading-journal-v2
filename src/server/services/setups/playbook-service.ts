// ─────────────────────────────────────────────────────────────────────────────
// Playbook intelligence service (S10) — prisma orchestration over the pure setup
// analytics (domains/analytics/setups). For one setup it bundles edge decay (#12),
// definition-vs-execution drift (#32), the edge-evolution curve (#21) and a
// before/after redefinition comparison (#50, keyed on `edgeUpdatedAt`). Read-only;
// the UI (EdgeEvolutionChart etc.) lands in S12. Numbers from the deterministic
// engine (P2).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { detectEdgeDecay, type EdgeDecayResult } from "@/domains/analytics/setups/edge-decay"
import { detectSetupDrift, type DriftResult, type DriftTrade } from "@/domains/analytics/setups/drift"
import { buildEdgeEvolution, type EvolutionMetrics, type EvolutionPoint } from "@/domains/analytics/setups/evolution"
import { compareVariants, type VariantComparison } from "@/domains/analytics/setups/variant-compare"
import type { Dated, Window } from "@/domains/analytics/longitudinal/rolling-window"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))
const ymd = (d: Date) => d.toISOString().slice(0, 10)

const RECENT_WINDOW = 20
const EVOLUTION_WINDOW = 10

export interface SetupPlaybook {
  hasData: boolean
  sampleSize: number
  decay: EdgeDecayResult
  drift: DriftResult
  evolution: Window<EvolutionMetrics>[]
  /** Edge before vs after the last redefinition (`edgeUpdatedAt`); null if never redefined or too few trades. */
  redefinition: VariantComparison | null
}

export async function getSetupPlaybook(
  prisma: PrismaClient,
  userId: string,
  setupId: string,
): Promise<SetupPlaybook | null> {
  const setup = await prisma.setup.findFirst({
    where: { id: setupId, userId },
    select: { direction: true, expectedWr: true, expectedAvgR: true, edgeUpdatedAt: true },
  })
  if (!setup) return null

  const trades = await prisma.trade.findMany({
    where: { userId, setupId, status: "CLOSED" },
    orderBy: [{ date: "asc" }, { closeTime: "asc" }, { createdAt: "asc" }],
    select: { rMultiple: true, pnl: true, direction: true, date: true },
  })

  const rChrono = trades.map((t) => num(t.rMultiple)).filter((n): n is number => n != null)
  const recent = rChrono.slice(-RECENT_WINDOW)
  const baseline = rChrono.slice(0, -RECENT_WINDOW)

  const decay = detectEdgeDecay({
    recent,
    baseline: baseline.length >= 2 ? baseline : null,
    definedAvgR: num(setup.expectedAvgR),
  })

  const driftTrades: DriftTrade[] = trades.map((t) => ({
    direction: t.direction === "SHORT" ? "SHORT" : "LONG",
    rMultiple: num(t.rMultiple),
    pnl: num(t.pnl) ?? 0,
  }))
  const drift = detectSetupDrift({
    definition: {
      direction: setup.direction === "LONG" || setup.direction === "SHORT" ? setup.direction : "AMBAS",
      expectedWr: num(setup.expectedWr),
      expectedAvgR: num(setup.expectedAvgR),
    },
    trades: driftTrades,
  })

  const series: Dated<EvolutionPoint>[] = trades.map((t) => ({
    date: ymd(t.date),
    value: { rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 },
  }))
  const evolution = buildEdgeEvolution(series, { size: { count: EVOLUTION_WINDOW }, step: EVOLUTION_WINDOW })

  let redefinition: VariantComparison | null = null
  if (setup.edgeUpdatedAt) {
    const cut = setup.edgeUpdatedAt.getTime()
    const before = trades.filter((t) => t.date.getTime() < cut)
    const after = trades.filter((t) => t.date.getTime() >= cut)
    redefinition = compareVariants(
      { label: "actual", rMultiples: after.map((t) => num(t.rMultiple)).filter((n): n is number => n != null), pnls: after.map((t) => num(t.pnl) ?? 0) },
      { label: "anterior", rMultiples: before.map((t) => num(t.rMultiple)).filter((n): n is number => n != null), pnls: before.map((t) => num(t.pnl) ?? 0) },
    )
  }

  return { hasData: trades.length > 0, sampleSize: trades.length, decay, drift, evolution, redefinition }
}

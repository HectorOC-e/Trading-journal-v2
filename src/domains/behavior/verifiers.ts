// ─────────────────────────────────────────────────────────────────────────────
// Verifier library (FREEZE-D7) — the Behavior Engine's objective measurers.
//
// A Commitment is only offered where a VERIFIER exists: a pure function that, given
// the trades of a window, returns an OBSERVED VALUE plus the concrete EVIDENCE
// (offending trade ids). Verification is objective — it measures data, never
// self-report (BEHAVIOR_ENGINE_V3 §8.3). The result feeds the commitment state
// machine, which decides kept/partial/broken.
//
// Initial subset (S4): the high-value behavioral patterns whose signal exists in
// today's capture (revenge, intraday-decay, oversizing, off-plan). `edge-decay`
// (FREEZE-D7's 5th) needs SetupEdgeSnapshot and lands with S10 — its metricKey is
// reserved but not yet measurable here.
// ─────────────────────────────────────────────────────────────────────────────

/** The slice of a trade the verifiers read. Pure data — no Prisma types. */
export interface WindowTrade {
  id: string
  date: string
  pnl: number
  rMultiple: number | null
  tags: string[]
  riskPct?: number | null
  revengeFlag?: boolean | null
  fomoFlag?: boolean | null
  openTime?: string | null
}

export interface VerifierResult {
  observedValue: number
  evidence: { tradeIds: string[]; note: string }
}

export type Verifier = (trades: WindowTrade[], opts?: VerifierOpts) => VerifierResult

export interface VerifierOpts {
  /** Risk % above which a trade counts as oversized (oversizing verifier). */
  oversizeThresholdPct?: number
}

/** The metric keys a commitment can be verified against. */
export const METRIC_KEYS = [
  "revengeTradesAfterLoss",
  "tradesPerDayBeyond2",
  "oversizedTrades",
  "offPlanTrades",
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]

const OFF_PLAN_TAGS = new Set(["Off-plan", "Impulsivo", "Revanche"])
const DEFAULT_OVERSIZE_PCT = 1.5

function sortByDateTime(trades: WindowTrade[]): WindowTrade[] {
  return [...trades].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.openTime ?? "").localeCompare(b.openTime ?? "") || a.id.localeCompare(b.id),
  )
}

/** Count of trades flagged as revenge (or tagged "Revanche"). Target: 0. */
export const verifyRevengeTrades: Verifier = (trades) => {
  const offenders = trades.filter((t) => t.revengeFlag === true || t.tags.includes("Revanche"))
  return {
    observedValue: offenders.length,
    evidence: { tradeIds: offenders.map((t) => t.id), note: `${offenders.length} trade(s) de revancha en la ventana` },
  }
}

/** Count of trades taken beyond the 2nd of their day (intraday over-trading). Target: 0. */
export const verifyTradesPerDayBeyond2: Verifier = (trades) => {
  const byDay = new Map<string, WindowTrade[]>()
  for (const t of sortByDateTime(trades)) {
    const arr = byDay.get(t.date) ?? []
    arr.push(t)
    byDay.set(t.date, arr)
  }
  const offenders: string[] = []
  for (const day of byDay.values()) day.slice(2).forEach((t) => offenders.push(t.id))
  return {
    observedValue: offenders.length,
    evidence: { tradeIds: offenders, note: `${offenders.length} trade(s) más allá del 2º del día` },
  }
}

/** Count of trades whose risk % exceeds the threshold (oversizing). Target: 0. */
export const verifyOversizedTrades: Verifier = (trades, opts) => {
  const threshold = opts?.oversizeThresholdPct ?? DEFAULT_OVERSIZE_PCT
  const offenders = trades.filter((t) => t.riskPct != null && t.riskPct > threshold)
  return {
    observedValue: offenders.length,
    evidence: { tradeIds: offenders.map((t) => t.id), note: `${offenders.length} trade(s) por encima de ${threshold}% de riesgo` },
  }
}

/** Count of off-plan / impulsive trades (by tag). Target: 0. */
export const verifyOffPlanTrades: Verifier = (trades) => {
  const offenders = trades.filter((t) => t.tags.some((tag) => OFF_PLAN_TAGS.has(tag)))
  return {
    observedValue: offenders.length,
    evidence: { tradeIds: offenders.map((t) => t.id), note: `${offenders.length} trade(s) fuera de plan` },
  }
}

const REGISTRY: Record<MetricKey, Verifier> = {
  revengeTradesAfterLoss: verifyRevengeTrades,
  tradesPerDayBeyond2: verifyTradesPerDayBeyond2,
  oversizedTrades: verifyOversizedTrades,
  offPlanTrades: verifyOffPlanTrades,
}

/** Look up a verifier by metric key. Null when none exists (offer study/note, not commit). */
export function getVerifier(metricKey: string): Verifier | null {
  return (REGISTRY as Record<string, Verifier>)[metricKey] ?? null
}

export function hasVerifier(metricKey: string): boolean {
  return metricKey in REGISTRY
}

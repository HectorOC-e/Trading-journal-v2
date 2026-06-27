// ─────────────────────────────────────────────────────────────────────────────
// Institutional summary (S12 surface for S3) — bundles the pure institutional
// analytics (R distribution, risk ratios, drawdown) from a trade list into the
// shape the ANALIZAR surface renders. The equity curve is the running cumulative
// P&L (one point per trade, chronological). Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { analyzeRDistribution, type RDistributionResult } from "@/domains/analytics/institutional/r-distribution"
import { computeRiskRatios, type RiskRatios } from "@/domains/analytics/institutional/risk-ratios"
import { analyzeDrawdown, type DrawdownResult, type EquityPoint } from "@/domains/analytics/institutional/drawdown"

export interface InstitutionalTrade {
  rMultiple: number | null
  pnl: number
  date: string
}

export interface InstitutionalSummary {
  sampleSize: number
  rDistribution: RDistributionResult
  ratios: RiskRatios
  drawdown: DrawdownResult
}

export function summarizeInstitutional(trades: InstitutionalTrade[]): InstitutionalSummary {
  const chronological = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  const rMultiples = chronological.map((t) => t.rMultiple).filter((r): r is number => r != null)

  let running = 0
  const equityPoints: EquityPoint[] = chronological.map((t) => {
    running += t.pnl
    return { date: t.date, equity: running }
  })

  return {
    sampleSize: chronological.length,
    rDistribution: analyzeRDistribution(rMultiples),
    ratios: computeRiskRatios(rMultiples),
    drawdown: analyzeDrawdown(equityPoints),
  }
}

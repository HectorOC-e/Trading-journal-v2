// Monthly "Carta del Gestor" scoring. Pure + deterministic — three 0–100 pillars
// (Rendimiento / Disciplina / Psicología) and a blended overall score, computed from the
// month's analytics. No IO. Shared by the report resolver, the cron finalizer and the email.

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export interface PillarInput {
  trades: number
  winRate: number          // 0–100
  profitFactor: number
  expectancy: number       // per-trade, base currency
  disciplineScore: number | null
  byEmotion: { emotion: string; trades: number; avgPnl: number; winRate: number }[]
}

export interface Pillars {
  performance: number
  discipline: number
  psychology: number
  overall: number
}

export function computePillars(i: PillarInput): Pillars {
  if (i.trades === 0) return { performance: 0, discipline: i.disciplineScore ?? 0, psychology: 0, overall: 0 }

  // Rendimiento: profit factor (dominant) + win rate + expectancy sign.
  const pfScore = i.profitFactor >= 2 ? 100 : i.profitFactor >= 1 ? 55 + (i.profitFactor - 1) * 45 : i.profitFactor * 55
  const wrScore = i.winRate * 1.3
  const expScore = i.expectancy > 0 ? 100 : i.expectancy < 0 ? 25 : 55
  const performance = clamp(0.5 * pfScore + 0.3 * wrScore + 0.2 * expScore)

  const discipline = clamp(i.disciplineScore ?? 60)

  // Psicología: share of trades made under emotions that were net-positive, blended with
  // discipline. Falls back to discipline when no emotion data was logged.
  const emoTotal = i.byEmotion.reduce((s, e) => s + e.trades, 0)
  let psychology: number
  if (emoTotal === 0) {
    psychology = discipline
  } else {
    const positiveShare = (i.byEmotion.filter(e => e.avgPnl > 0).reduce((s, e) => s + e.trades, 0) / emoTotal) * 100
    psychology = clamp(0.6 * positiveShare + 0.4 * discipline)
  }

  const overall = clamp(0.4 * performance + 0.35 * discipline + 0.25 * psychology)
  return { performance, discipline, psychology, overall }
}

// ─────────────────────────────────────────────────────────────────────────────
// ImprovementScore (#41, E14.C2) — the product's North Star. A composite rolling
// index that PREDICTS and EXPLAINS progress, decomposed into drivers so the coach
// can say "+ por cumplimiento de compromisos, − por coste de indisciplina". Every
// number is deterministic (P2). Pure, no I/O.
//
//   score = w1·discipline + w2·expectancy(norm) + w3·commitmentKept + w4·(1−cost)
//   (0–100, weights sum to 1; each driver's points sum to the score)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImprovementWeights {
  discipline: number
  expectancy: number
  commitment: number
  cost: number
}

const DEFAULT_WEIGHTS: ImprovementWeights = { discipline: 0.3, expectancy: 0.3, commitment: 0.25, cost: 0.15 }

export interface ImprovementInputs {
  /** Rolling discipline 0–1 (1 = clean execution). */
  disciplineRolling: number
  /** Rolling expectancy in R (can be negative). */
  expectancyR: number
  /** Commitment kept rate 0–1. */
  commitmentKeptRate: number
  /** Fraction of edge lost to indiscipline 0–1 (subtracted). */
  costOfIndisciplineRatio: number
  weights?: Partial<ImprovementWeights>
}

export interface Driver {
  key: "discipline" | "expectancy" | "commitment" | "cost"
  label: string
  /** Points this driver contributes to the score (0 … 100·weight). */
  points: number
  /** Max points this driver could contribute (100·weight). */
  maxPoints: number
}

export interface ImprovementResult {
  score: number
  drivers: Driver[]
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Map expectancy R to 0–1: −1R → 0, 0R → 0.5, +1R → 1 (clamped). */
const normExpectancy = (r: number) => clamp01((r + 1) / 2)

export function computeImprovementScore(input: ImprovementInputs): ImprovementResult {
  const w = { ...DEFAULT_WEIGHTS, ...input.weights }
  const norm = {
    discipline: clamp01(input.disciplineRolling),
    expectancy: normExpectancy(input.expectancyR),
    commitment: clamp01(input.commitmentKeptRate),
    cost: 1 - clamp01(input.costOfIndisciplineRatio), // higher cost ⇒ lower contribution
  }

  const drivers: Driver[] = [
    { key: "discipline", label: "Disciplina", points: 100 * w.discipline * norm.discipline, maxPoints: 100 * w.discipline },
    { key: "expectancy", label: "Expectancy", points: 100 * w.expectancy * norm.expectancy, maxPoints: 100 * w.expectancy },
    { key: "commitment", label: "Compromisos cumplidos", points: 100 * w.commitment * norm.commitment, maxPoints: 100 * w.commitment },
    { key: "cost", label: "Bajo coste de indisciplina", points: 100 * w.cost * norm.cost, maxPoints: 100 * w.cost },
  ]

  const score = drivers.reduce((s, d) => s + d.points, 0)
  return { score, drivers }
}

// ── Cost of indiscipline (#49) ───────────────────────────────────────────────

export interface IndisciplineTrade {
  pnl: number
  offPlan: boolean
}

export interface IndisciplineCost {
  /** Absolute P&L the off-plan trades cost vs trading on-plan (≥ 0). */
  costAbs: number
  /** costAbs as a fraction of gross profit (0–1), for the improvement score. */
  costRatio: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0)

/**
 * The opportunity cost of trading off-plan: `(cleanAvg − offPlanAvg) × offPlanCount`,
 * floored at 0 (off-plan that happens to outperform isn't a fabricated cost).
 * `costRatio` normalizes it against gross profit for the score.
 */
export function costOfIndiscipline(trades: IndisciplineTrade[]): IndisciplineCost {
  const off = trades.filter((t) => t.offPlan)
  const clean = trades.filter((t) => !t.offPlan)
  if (off.length === 0 || clean.length === 0) return { costAbs: 0, costRatio: 0 }

  const gap = mean(clean.map((t) => t.pnl)) - mean(off.map((t) => t.pnl))
  const costAbs = Math.max(0, gap * off.length)
  const grossProfit = trades.reduce((s, t) => s + Math.max(0, t.pnl), 0)
  const costRatio = grossProfit > 0 ? Math.min(1, costAbs / grossProfit) : costAbs > 0 ? 1 : 0
  return { costAbs, costRatio }
}

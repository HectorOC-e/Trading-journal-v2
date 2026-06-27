// ─────────────────────────────────────────────────────────────────────────────
// HOY feed (#36 prioridad adaptativa, E11). Merges every cognitive signal —
// intervention, risk, anomaly, insight, commitment, reinforcement, suggestion,
// notification — into ONE prioritized feed. Adaptive: an item that's been ignored
// or sat unacted for days SINKS; a critical signal never sinks (P4 — only the real
// alarm interrupts). The reinforcement stays calm and low so it never dominates.
// Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export type SignalKind =
  | "intervention" | "risk" | "anomaly" | "suggestion" | "insight" | "commitment" | "reinforcement" | "notification"

export type SignalSeverity = "critical" | "warning" | "info" | "positive"

export interface SignalInput {
  id: string
  kind: SignalKind
  severity: SignalSeverity
  title: string
  body?: string
  cta?: { label: string; href?: string; action?: string }
  /** ISO timestamp; older un-acted items decay. */
  createdAt: string
  /** Times shown without action (telemetry); higher ⇒ lower priority. */
  ignored?: number
}

export interface TodayItem extends SignalInput {
  priority: number
}

// Base priority by kind — what deserves attention first, before recency/ignore.
const BASE: Record<SignalKind, number> = {
  intervention: 100,
  risk: 80,
  anomaly: 70,
  suggestion: 55,
  insight: 50,
  commitment: 45,
  reinforcement: 30,
  notification: 20,
}

const SEVERITY_MULT: Record<SignalSeverity, number> = {
  critical: 1.5,
  warning: 1.2,
  info: 1.0,
  positive: 0.9,
}

const AGE_HALFLIFE_DAYS = 7
const MAX_IGNORE_PENALTY = 0.6
const IGNORE_STEP = 0.15

const DAY_MS = 86_400_000

/**
 * Score and sort the feed. Critical items skip age/ignore decay (the floor): they
 * stay at the top however old or ignored. Everything else decays with age
 * (exponential, ~1-week half-life) and with the ignore count.
 */
export function assembleTodayFeed(signals: SignalInput[], opts: { now?: Date } = {}): TodayItem[] {
  const now = (opts.now ?? new Date()).getTime()

  const scored = signals.map((s): TodayItem => {
    const base = BASE[s.kind] * SEVERITY_MULT[s.severity]
    if (s.severity === "critical") return { ...s, priority: base }

    const ageDays = Math.max(0, (now - new Date(s.createdAt).getTime()) / DAY_MS)
    const ageDecay = Math.exp((-Math.LN2 * ageDays) / AGE_HALFLIFE_DAYS)
    const ignorePenalty = 1 - Math.min(MAX_IGNORE_PENALTY, (s.ignored ?? 0) * IGNORE_STEP)
    return { ...s, priority: base * ageDecay * ignorePenalty }
  })

  return scored.sort((a, b) => b.priority - a.priority)
}

// ── Daily anomaly (#44, ANALYTICS_V3 §4) ─────────────────────────────────────

export interface AnomalyInput {
  tradesToday: number
  /** Mean trades per active day over the lookback. */
  meanDailyTrades: number
  /** Today's realized loss as a positive magnitude (0 if not down). */
  lossToday: number
  /** 90th percentile of daily loss over the lookback (positive magnitude). */
  p90DailyLoss: number
}

export interface AnomalyResult {
  overtrading: boolean
  outsizedLoss: boolean
  messages: string[]
}

const OVERTRADING_FACTOR = 1.5
const MIN_TRADES_FOR_OVERTRADING = 3

/** Flags overtrading (today > 1.5× the daily mean) and an outsized daily loss
 *  (today's loss beyond p90). Quiet on a normal day. */
export function detectDailyAnomaly(input: AnomalyInput): AnomalyResult {
  const messages: string[] = []
  const overtrading =
    input.meanDailyTrades > 0 &&
    input.tradesToday >= MIN_TRADES_FOR_OVERTRADING &&
    input.tradesToday > OVERTRADING_FACTOR * input.meanDailyTrades
  if (overtrading) {
    const x = (input.tradesToday / input.meanDailyTrades).toFixed(1)
    messages.push(`Hoy llevas ${input.tradesToday} trades — ${x}× tu media. ¿Overtrading?`)
  }

  const outsizedLoss = input.p90DailyLoss > 0 && input.lossToday > input.p90DailyLoss
  if (outsizedLoss) {
    messages.push(`La pérdida de hoy supera tu peor 10% de días. Considera parar.`)
  }

  return { overtrading, outsizedLoss, messages }
}

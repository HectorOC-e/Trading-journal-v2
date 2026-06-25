// ─────────────────────────────────────────────────────────────────────────────
// Emotion capture incentive loop (DELTA D10) + close-time nudge (#10).
//
// The audit's C7 is not really about taps — it's that logging emotion returned NO
// value, so traders stopped. D10 closes the loop: the moment you tag an emotion,
// the system shows what that emotion has historically meant for YOU. This module
// computes that feedback (pure) so the capture flow can surface it immediately.
//
// Statistical honesty (FREEZE-P3/ADR-002): feedback is withheld below a minimum
// sample so we never make a confident claim from 1–2 trades.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmotionTrade {
  emotionBefore: string | null
  pnl: number
  rMultiple: number | null
}

export interface EmotionStat {
  n: number
  winRate: number // 0–100
  avgR: number
}

const MIN_SAMPLE = 5

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Win rate + avg R grouped by the emotion recorded before each trade. */
export function wrByEmotion(trades: EmotionTrade[]): Record<string, EmotionStat> {
  const groups = new Map<string, EmotionTrade[]>()
  for (const t of trades) {
    const e = t.emotionBefore
    if (!e) continue
    const arr = groups.get(e) ?? []
    arr.push(t)
    groups.set(e, arr)
  }

  const out: Record<string, EmotionStat> = {}
  for (const [emotion, list] of groups) {
    const wins = list.filter((t) => t.pnl > 0).length
    const rs = list.map((t) => t.rMultiple).filter((r): r is number => r !== null)
    const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0
    out[emotion] = { n: list.length, winRate: round1((wins / list.length) * 100), avgR }
  }
  return out
}

export interface EmotionFeedback extends EmotionStat {
  emotion: string
}

/**
 * The in-the-moment incentive for the captured emotion. Null below MIN_SAMPLE or
 * if the emotion has no history — the UI then shows nothing rather than a weak claim.
 */
export function feedbackForEmotion(trades: EmotionTrade[], emotion: string): EmotionFeedback | null {
  const stat = wrByEmotion(trades)[emotion]
  if (!stat || stat.n < MIN_SAMPLE) return null
  return { emotion, ...stat }
}

/** A closed trade with no pre-trade emotion should be nudged to add one (#10). */
export function needsEmotionNudge(trade: { status: string; emotionBefore: string | null }): boolean {
  return trade.status === "CLOSED" && !trade.emotionBefore
}

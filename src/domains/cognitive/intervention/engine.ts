// ─────────────────────────────────────────────────────────────────────────────
// Intervention Engine (C1, FREEZE §9) — pure, deterministic decision.
//
// The DECISION to intervene is deterministic and fast (no LLM in the critical
// path — the text may stream later). The fast-path mutation runs this over the
// day's state and returns an intervention in its response (≤2s, no push).
//
//   priority = severity × urgency × confidence × expectedImpact × (1 − fatigue)
//   intervene  iff  priority ≥ θ(user)         (silence by default, anti-fatigue)
//
// FREEZE-D14 — hard capital override: account.dd_approach / dd_breach ALWAYS
// intervene, ignoring θ, cooldown and the daily budget. Capital first.
// ─────────────────────────────────────────────────────────────────────────────

export type InterventionTrigger = "revenge" | "oversizing" | "cascade" | "dd_approach" | "dd_breach"
export type Severity = "warning" | "critical"
export type ActionKind = "cooldown" | "risk_limit" | "stop_for_day" | "none"

export interface DayState {
  tradesToday: number
  lossesToday: number
  /** Current trailing losing streak (today). */
  consecutiveLosses: number
  lastRiskPct: number | null
  avgRiskPct: number | null
  dayPnlPct: number
  /** Current account drawdown as a positive magnitude (%). */
  drawdownPct: number
  ddDailyLimitPct: number | null
  /** Off-plan / FOMO / revenge-flagged trades today. */
  impulsiveToday: number
}

export interface InterventionScores {
  severity: number
  urgency: number
  confidence: number
  expectedImpact: number
}

export interface InterventionCandidate {
  trigger: InterventionTrigger
  severity: Severity
  scores: InterventionScores
  message: string
  suggestedAction: { kind: ActionKind; label: string }
  capitalOverride: boolean
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** priority = severity × urgency × confidence × expectedImpact × (1 − fatigue). */
export function priority(s: InterventionScores, fatiguePenalty = 0): number {
  return s.severity * s.urgency * s.confidence * s.expectedImpact * (1 - clamp01(fatiguePenalty))
}

const DEFAULT_IMPACT = 0.6

/** Run the live detectors over the day's state → candidate interventions. */
export function detectInterventions(state: DayState, opts: { expectedImpact?: number } = {}): InterventionCandidate[] {
  const impact = opts.expectedImpact ?? DEFAULT_IMPACT
  const out: InterventionCandidate[] = []

  // ── Capital first (FREEZE-D14): drawdown breach / approach ──
  if (state.ddDailyLimitPct != null && state.ddDailyLimitPct > 0) {
    if (state.drawdownPct >= state.ddDailyLimitPct) {
      out.push({
        trigger: "dd_breach",
        severity: "critical",
        scores: { severity: 1, urgency: 1, confidence: 1, expectedImpact: 1 },
        message: "Alcanzaste tu límite de pérdida del día. Para de operar y protege la cuenta.",
        suggestedAction: { kind: "stop_for_day", label: "Detener por hoy" },
        capitalOverride: true,
      })
    } else if (state.drawdownPct >= state.ddDailyLimitPct * 0.8) {
      out.push({
        trigger: "dd_approach",
        severity: "warning",
        scores: { severity: 0.8, urgency: 0.9, confidence: 0.9, expectedImpact: impact },
        message: "Estás cerca de tu límite de pérdida diario. Un trade más y podrías cruzarlo.",
        suggestedAction: { kind: "cooldown", label: "Enfriamiento 30 min" },
        capitalOverride: true,
      })
    }
  }

  // ── Cascade / tilt: 3+ pérdidas seguidas ──
  if (state.consecutiveLosses >= 3) {
    out.push({
      trigger: "cascade",
      severity: "critical",
      scores: { severity: 0.9, urgency: 0.95, confidence: 0.85, expectedImpact: impact },
      message: `Llevas ${state.consecutiveLosses} pérdidas seguidas — es una cascada. Cierra por hoy antes de que crezca.`,
      suggestedAction: { kind: "stop_for_day", label: "Detener por hoy" },
      capitalOverride: false,
    })
  } else if (state.consecutiveLosses >= 2 && state.impulsiveToday > 0) {
    // ── Revenge: 2 pérdidas + operación impulsiva ──
    out.push({
      trigger: "revenge",
      severity: "warning",
      scores: { severity: 0.75, urgency: 0.85, confidence: 0.8, expectedImpact: impact },
      message: "Llevas 2 pérdidas y operaste impulsivamente — es tu patrón de revancha. Tómate un respiro.",
      suggestedAction: { kind: "cooldown", label: "Enfriamiento 30 min" },
      capitalOverride: false,
    })
  }

  // ── Oversizing tras pérdida: último riesgo ≥ 2× tu media ──
  if (
    state.lossesToday >= 1 &&
    state.lastRiskPct != null &&
    state.avgRiskPct != null &&
    state.avgRiskPct > 0 &&
    state.lastRiskPct >= state.avgRiskPct * 2
  ) {
    out.push({
      trigger: "oversizing",
      severity: "warning",
      scores: { severity: 0.7, urgency: 0.8, confidence: 0.75, expectedImpact: impact },
      message: `Doblaste tu tamaño habitual tras una pérdida (${state.lastRiskPct.toFixed(1)}% vs ${state.avgRiskPct.toFixed(1)}% medio). Así se pierde una cuenta.`,
      suggestedAction: { kind: "risk_limit", label: "Limitar riesgo por trade" },
      capitalOverride: false,
    })
  }

  return out
}

export interface FatigueState {
  /** Currently-active (unanswered) interventions. */
  activeCount: number
  /** Minutes since the last intervention shown (null = none today). */
  minsSinceLast: number | null
  /** Interventions already shown today. */
  shownToday: number
}

export interface DecisionOpts {
  theta?: number
  cooldownMins?: number
  dailyBudget?: number
}

const DEFAULT_THETA = 0.18
const DEFAULT_COOLDOWN = 30
const DEFAULT_BUDGET = 4

/**
 * Choose at most one intervention to show. Capital overrides bypass θ/cooldown/
 * budget (D14). Otherwise: at most 1 active, respect cooldown + daily budget, and
 * require priority ≥ θ. Returns null = silence (the default).
 */
export function decideIntervention(
  candidates: InterventionCandidate[],
  fatigue: FatigueState,
  opts: DecisionOpts = {},
): InterventionCandidate | null {
  if (candidates.length === 0) return null
  const theta = opts.theta ?? DEFAULT_THETA
  const cooldown = opts.cooldownMins ?? DEFAULT_COOLDOWN
  const budget = opts.dailyBudget ?? DEFAULT_BUDGET

  const ranked = [...candidates].sort((a, b) => priority(b.scores) - priority(a.scores))

  // Capital override wins unconditionally.
  const capital = ranked.find((c) => c.capitalOverride)
  if (capital) return capital

  const best = ranked[0]
  if (fatigue.activeCount >= 1) return null // max 1 active
  if (fatigue.shownToday >= budget) return null // token bucket
  if (fatigue.minsSinceLast != null && fatigue.minsSinceLast < cooldown) return null
  if (priority(best.scores) < theta) return null
  return best
}

import type { OperationalMode } from "@/domains/trading/operational-mode"

export type ValidationStage = "HYPOTHESIS" | "BACKTEST" | "DEMO" | "REAL"
export type ValidationVerdict = "INCOMPLETE" | "INSUFFICIENT" | "ELIGIBLE" | "WARNING"
export type ValidationAction = "PROMOTE" | "KEEP_REVIEWING" | "SUSPEND" | "RESUME" | "RETURN_TO_REVIEW"

export type ValidationPolicy = {
  version: number
  backtestMinClosed: number
  backtestMinRCoveragePct: number
  backtestMinChecklistCoveragePct: number
  backtestRequirePositiveExpectancy: boolean
  demoMinClosed: number
  demoMinDistinctWeeks: number
  demoMinChecklistCompliancePct: number
  demoRequirePositiveExpectancy: boolean
  realMonitorMinClosed: number
  realMonitorMinDistinctWeeks: number
}

export type ValidationTrade = {
  id: string
  date: Date
  rMultiple: number | null
}

export type ValidationDefinition = {
  market: string
  direction: string
  description: string
  expectedAvgR: number | null
  checklistItemCount: number
}

export type ValidationSignals = {
  decay?: "decaying" | "improving" | "stable" | "insufficient"
  drift?: "drifting" | "aligned" | "stable" | "insufficient"
}

export type ValidationCriterion = {
  key: string
  met: boolean
  actual: number | string | null
  target: number | string
}

export type StageEvidence = {
  stage: ValidationStage
  mode: OperationalMode | null
  verdict: ValidationVerdict
  monitoringOnly: boolean
  closedCount: number
  usableRCount: number
  rCoveragePct: number
  winRatePct: number | null
  averageR: number | null
  expectancyR: number | null
  cumulativeR: number | null
  maxDrawdownR: number | null
  distinctWeeks: number
  checklistEvaluated: number
  checklistCompliant: number
  checklistCoveragePct: number
  checklistCompliancePct: number | null
  criteria: ValidationCriterion[]
  warnings: Array<"EDGE_DECAY" | "DEFINITION_DRIFT">
}

export type ValidationDecisionLike = {
  action: ValidationAction
  fromStage: ValidationStage
  toStage: ValidationStage
}

export type ValidationState = {
  currentStage: ValidationStage
  suspended: boolean
}

export type TransitionResult = { valid: true } | { valid: false; reason: string }

export const DEFAULT_VALIDATION_POLICY: ValidationPolicy = {
  version: 1,
  backtestMinClosed: 30,
  backtestMinRCoveragePct: 80,
  backtestMinChecklistCoveragePct: 70,
  backtestRequirePositiveExpectancy: true,
  demoMinClosed: 20,
  demoMinDistinctWeeks: 4,
  demoMinChecklistCompliancePct: 80,
  demoRequirePositiveExpectancy: true,
  realMonitorMinClosed: 20,
  realMonitorMinDistinctWeeks: 4,
}

const STAGES: ValidationStage[] = ["HYPOTHESIS", "BACKTEST", "DEMO", "REAL"]

function rounded(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function pct(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : rounded((numerator / denominator) * 100, 1)
}

function isoWeekKey(input: Date) {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const year = date.getUTCFullYear()
  const first = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((date.getTime() - first.getTime()) / 86_400_000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, "0")}`
}

function modeForStage(stage: ValidationStage): OperationalMode | null {
  if (stage === "BACKTEST") return "BACKTEST"
  if (stage === "DEMO") return "DEMO"
  if (stage === "REAL") return "REAL"
  return null
}

function metricEvidence(
  stage: ValidationStage,
  trades: ValidationTrade[],
  checklist: Map<string, { checked: number; total: number }>,
) {
  const chronological = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id))
  const valid = chronological.filter((trade): trade is ValidationTrade & { rMultiple: number } =>
    trade.rMultiple !== null && Number.isFinite(trade.rMultiple))
  const values = valid.map((trade) => trade.rMultiple)
  const sum = values.reduce((total, value) => total + value, 0)
  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0
  for (const value of values) {
    cumulative += value
    peak = Math.max(peak, cumulative)
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative)
  }

  const evaluated = chronological.flatMap((trade) => {
    const result = checklist.get(trade.id)
    return result && result.total > 0 ? [result] : []
  })
  const compliant = evaluated.filter((result) => result.checked >= result.total).length

  return {
    stage,
    mode: modeForStage(stage),
    monitoringOnly: stage === "REAL",
    closedCount: chronological.length,
    usableRCount: valid.length,
    rCoveragePct: pct(valid.length, chronological.length),
    winRatePct: valid.length ? pct(valid.filter((trade) => trade.rMultiple > 0).length, valid.length) : null,
    averageR: valid.length ? rounded(sum / valid.length) : null,
    expectancyR: valid.length ? rounded(sum / valid.length) : null,
    cumulativeR: valid.length ? rounded(sum) : null,
    maxDrawdownR: valid.length ? rounded(maxDrawdown) : null,
    distinctWeeks: new Set(chronological.map((trade) => isoWeekKey(trade.date))).size,
    checklistEvaluated: evaluated.length,
    checklistCompliant: compliant,
    checklistCoveragePct: pct(evaluated.length, chronological.length),
    checklistCompliancePct: evaluated.length ? pct(compliant, evaluated.length) : null,
  }
}

function criterion(key: string, met: boolean, actual: number | string | null, target: number | string): ValidationCriterion {
  return { key, met, actual, target }
}

export function evaluateValidationStage(input: {
  stage: ValidationStage
  policy: ValidationPolicy
  definition: ValidationDefinition
  trades: ValidationTrade[]
  checklist: Map<string, { checked: number; total: number }>
  signals?: ValidationSignals
}): StageEvidence {
  const metrics = metricEvidence(input.stage, input.trades, input.checklist)
  let criteria: ValidationCriterion[]

  if (input.stage === "HYPOTHESIS") {
    criteria = [
      criterion("market", input.definition.market.trim().length > 0, input.definition.market.trim(), "definido"),
      criterion("direction", input.definition.direction.trim().length > 0, input.definition.direction.trim(), "definida"),
      criterion("description", input.definition.description.trim().length > 0, input.definition.description.trim() ? "definida" : "", "definida"),
      criterion("expectancy", input.definition.expectedAvgR !== null && Number.isFinite(input.definition.expectedAvgR), input.definition.expectedAvgR, "definida"),
      criterion("checklist", input.definition.checklistItemCount > 0, input.definition.checklistItemCount, 1),
    ]
  } else if (input.stage === "BACKTEST") {
    criteria = [
      criterion("closedCount", metrics.closedCount >= input.policy.backtestMinClosed, metrics.closedCount, input.policy.backtestMinClosed),
      criterion("rCoverage", metrics.rCoveragePct >= input.policy.backtestMinRCoveragePct, metrics.rCoveragePct, input.policy.backtestMinRCoveragePct),
      criterion("expectancy", !input.policy.backtestRequirePositiveExpectancy || (metrics.expectancyR ?? 0) > 0, metrics.expectancyR, "> 0R"),
      criterion("checklistCoverage", metrics.checklistCoveragePct >= input.policy.backtestMinChecklistCoveragePct, metrics.checklistCoveragePct, input.policy.backtestMinChecklistCoveragePct),
    ]
  } else if (input.stage === "DEMO") {
    criteria = [
      criterion("closedCount", metrics.closedCount >= input.policy.demoMinClosed, metrics.closedCount, input.policy.demoMinClosed),
      criterion("distinctWeeks", metrics.distinctWeeks >= input.policy.demoMinDistinctWeeks, metrics.distinctWeeks, input.policy.demoMinDistinctWeeks),
      criterion("expectancy", !input.policy.demoRequirePositiveExpectancy || (metrics.expectancyR ?? 0) > 0, metrics.expectancyR, "> 0R"),
      criterion("checklistCompliance", (metrics.checklistCompliancePct ?? 0) >= input.policy.demoMinChecklistCompliancePct, metrics.checklistCompliancePct, input.policy.demoMinChecklistCompliancePct),
    ]
  } else {
    criteria = [
      criterion("closedCount", metrics.closedCount >= input.policy.realMonitorMinClosed, metrics.closedCount, input.policy.realMonitorMinClosed),
      criterion("distinctWeeks", metrics.distinctWeeks >= input.policy.realMonitorMinDistinctWeeks, metrics.distinctWeeks, input.policy.realMonitorMinDistinctWeeks),
    ]
  }

  const warnings: StageEvidence["warnings"] = []
  if (input.signals?.decay === "decaying") warnings.push("EDGE_DECAY")
  if (input.signals?.drift === "drifting") warnings.push("DEFINITION_DRIFT")
  const allMet = criteria.every((item) => item.met)
  const verdict: ValidationVerdict = input.stage === "HYPOTHESIS"
    ? (allMet ? "ELIGIBLE" : "INCOMPLETE")
    : metrics.closedCount === 0
      ? "INCOMPLETE"
      : allMet
        ? (input.stage === "REAL" && warnings.length ? "WARNING" : "ELIGIBLE")
        : "INSUFFICIENT"

  return { ...metrics, criteria, warnings, verdict }
}

export function deriveValidationState(decisions: ValidationDecisionLike[]): ValidationState {
  return decisions.reduce<ValidationState>((state, decision) => {
    if (decision.action === "SUSPEND") return { ...state, suspended: true }
    if (decision.action === "RESUME") return { ...state, suspended: false }
    if (decision.action === "PROMOTE" || decision.action === "RETURN_TO_REVIEW") {
      return { currentStage: decision.toStage, suspended: false }
    }
    return state
  }, { currentStage: "HYPOTHESIS", suspended: false })
}

export function validateValidationTransition(
  state: ValidationState,
  action: ValidationAction,
  targetStage: ValidationStage,
): TransitionResult {
  if (action === "RESUME") {
    return state.suspended && targetStage === state.currentStage
      ? { valid: true }
      : { valid: false, reason: "Sólo una estrategia suspendida puede reanudarse en su etapa actual." }
  }
  if (action === "SUSPEND") {
    return !state.suspended && targetStage === state.currentStage
      ? { valid: true }
      : { valid: false, reason: "La suspensión debe conservar la etapa actual." }
  }
  if (state.suspended) return { valid: false, reason: "Reanuda la estrategia antes de cambiar su ruta." }
  if (action === "KEEP_REVIEWING") {
    return targetStage === state.currentStage
      ? { valid: true }
      : { valid: false, reason: "Continuar revisando no cambia de etapa." }
  }
  const currentIndex = STAGES.indexOf(state.currentStage)
  const targetIndex = STAGES.indexOf(targetStage)
  if (action === "PROMOTE") {
    return targetIndex === currentIndex + 1
      ? { valid: true }
      : { valid: false, reason: state.currentStage === "REAL" ? "Real permanece en monitoreo continuo." : "La promoción debe avanzar exactamente una etapa." }
  }
  return targetIndex <= currentIndex
    ? { valid: true }
    : { valid: false, reason: "Volver a revisión no puede avanzar la ruta." }
}

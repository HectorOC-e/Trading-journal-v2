import { describe, expect, it } from "vitest"
import {
  DEFAULT_VALIDATION_POLICY,
  deriveValidationState,
  evaluateValidationStage,
  validateValidationTransition,
  type ValidationDefinition,
  type ValidationTrade,
} from "@/domains/analytics/setups/validation"

const definition: ValidationDefinition = {
  market: "FX",
  direction: "LONG",
  description: "Ruptura y retroceso a una zona definida.",
  expectedAvgR: 0.4,
  checklistItemCount: 3,
}

function trades(count: number, options: { nullR?: number; weeks?: number; r?: number } = {}): ValidationTrade[] {
  const nullR = options.nullR ?? 0
  const weeks = options.weeks ?? 1
  const r = options.r ?? 0.5
  return Array.from({ length: count }, (_, index) => ({
    id: `trade-${index}`,
    date: new Date(Date.UTC(2026, 0, 5 + (index % weeks) * 7)),
    rMultiple: index < nullR ? null : r,
  }))
}

function checklist(rows: ValidationTrade[], compliant: number, evaluated = rows.length) {
  return new Map(rows.slice(0, evaluated).map((row, index) => [
    row.id,
    { checked: index < compliant ? 2 : 1, total: 2 },
  ]))
}

describe("strategy validation engine", () => {
  it("marks an undefined hypothesis incomplete and a defined one eligible", () => {
    const incomplete = evaluateValidationStage({
      stage: "HYPOTHESIS",
      policy: DEFAULT_VALIDATION_POLICY,
      definition: { ...definition, description: "", checklistItemCount: 0 },
      trades: [],
      checklist: new Map(),
    })
    expect(incomplete.verdict).toBe("INCOMPLETE")
    expect(incomplete.criteria.filter((criterion) => !criterion.met).map((criterion) => criterion.key)).toEqual([
      "description",
      "checklist",
    ])

    const eligible = evaluateValidationStage({
      stage: "HYPOTHESIS",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: [],
      checklist: new Map(),
    })
    expect(eligible.verdict).toBe("ELIGIBLE")
  })

  it("uses the visible Backtesting defaults and treats null R as missing evidence", () => {
    const sample = trades(30, { nullR: 6, weeks: 4, r: 0.5 })
    const evidence = evaluateValidationStage({
      stage: "BACKTEST",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: sample,
      checklist: checklist(sample, 21, 21),
    })

    expect(evidence).toMatchObject({
      verdict: "ELIGIBLE",
      closedCount: 30,
      usableRCount: 24,
      rCoveragePct: 80,
      expectancyR: 0.5,
      averageR: 0.5,
      cumulativeR: 12,
      checklistEvaluated: 21,
      checklistCoveragePct: 70,
    })
    expect(evidence).not.toHaveProperty("pnl")
    expect(evidence).not.toHaveProperty("currency")
  })

  it("keeps an undersized sample insufficient instead of turning missing values into zero", () => {
    const sample = trades(29, { nullR: 29 })
    const evidence = evaluateValidationStage({
      stage: "BACKTEST",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: sample,
      checklist: new Map(),
    })

    expect(evidence.verdict).toBe("INSUFFICIENT")
    expect(evidence.rCoveragePct).toBe(0)
    expect(evidence.expectancyR).toBeNull()
    expect(evidence.averageR).toBeNull()
    expect(evidence.maxDrawdownR).toBeNull()
  })

  it("requires the Demo sample, four ISO weeks, positive expectancy and 80 percent compliance", () => {
    const sample = trades(20, { weeks: 4, r: 0.25 })
    const eligible = evaluateValidationStage({
      stage: "DEMO",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: sample,
      checklist: checklist(sample, 16),
    })
    expect(eligible).toMatchObject({
      verdict: "ELIGIBLE",
      closedCount: 20,
      distinctWeeks: 4,
      checklistCompliancePct: 80,
      expectancyR: 0.25,
    })

    const threeWeeks = trades(20, { weeks: 3, r: 0.25 })
    const insufficient = evaluateValidationStage({
      stage: "DEMO",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: threeWeeks,
      checklist: checklist(threeWeeks, 16),
    })
    expect(insufficient.verdict).toBe("INSUFFICIENT")
    expect(insufficient.criteria.find((criterion) => criterion.key === "distinctWeeks")?.met).toBe(false)
  })

  it("calculates maximum drawdown from chronological cumulative R", () => {
    const sample: ValidationTrade[] = [2, -1, -2, 1].map((rMultiple, index) => ({
      id: `dd-${index}`,
      date: new Date(Date.UTC(2026, 0, 5 + index)),
      rMultiple,
    }))
    const evidence = evaluateValidationStage({
      stage: "BACKTEST",
      policy: { ...DEFAULT_VALIDATION_POLICY, backtestMinClosed: 4, backtestMinRCoveragePct: 100, backtestMinChecklistCoveragePct: 0 },
      definition,
      trades: sample,
      checklist: new Map(),
    })
    expect(evidence.maxDrawdownR).toBe(3)
    expect(evidence.cumulativeR).toBe(0)
    expect(evidence.expectancyR).toBe(0)
    expect(evidence.verdict).toBe("INSUFFICIENT")
  })

  it("keeps Real in monitoring and warns on edge deterioration", () => {
    const sample = trades(20, { weeks: 4, r: 0.2 })
    const monitoring = evaluateValidationStage({
      stage: "REAL",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: sample,
      checklist: checklist(sample, 18),
    })
    expect(monitoring.verdict).toBe("ELIGIBLE")
    expect(monitoring.monitoringOnly).toBe(true)

    const warning = evaluateValidationStage({
      stage: "REAL",
      policy: DEFAULT_VALIDATION_POLICY,
      definition,
      trades: sample,
      checklist: checklist(sample, 18),
      signals: { decay: "decaying", drift: "stable" },
    })
    expect(warning.verdict).toBe("WARNING")
    expect(warning.warnings).toEqual(["EDGE_DECAY"])
  })

  it("replays immutable decisions and rejects skipped or completed stages", () => {
    expect(deriveValidationState([])).toEqual({ currentStage: "HYPOTHESIS", suspended: false })
    const promoted = deriveValidationState([
      { action: "PROMOTE", fromStage: "HYPOTHESIS", toStage: "BACKTEST" },
      { action: "PROMOTE", fromStage: "BACKTEST", toStage: "DEMO" },
      { action: "SUSPEND", fromStage: "DEMO", toStage: "DEMO" },
      { action: "RESUME", fromStage: "DEMO", toStage: "DEMO" },
    ])
    expect(promoted).toEqual({ currentStage: "DEMO", suspended: false })
    expect(validateValidationTransition(promoted, "PROMOTE", "REAL")).toEqual({ valid: true })
    expect(validateValidationTransition(promoted, "PROMOTE", "BACKTEST").valid).toBe(false)
    expect(validateValidationTransition({ currentStage: "HYPOTHESIS", suspended: false }, "PROMOTE", "DEMO").valid).toBe(false)
    expect(validateValidationTransition({ currentStage: "REAL", suspended: false }, "PROMOTE", "REAL").valid).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import {
  deriveCommitmentSpec,
  canCommit,
  evaluateResult,
  statusFromResult,
} from "@/domains/behavior/commitment-machine"

describe("deriveCommitmentSpec", () => {
  it("maps a known insight type to a verifiable spec", () => {
    const spec = deriveCommitmentSpec("intraday-decay")!
    expect(spec).not.toBeNull()
    expect(spec.metricKey).toBe("tradesPerDayBeyond2")
    expect(spec.comparator).toBe("<=")
    expect(spec.target).toBe(0)
    expect(spec.window).toBe("week")
  })

  it("returns null for an insight type with no verifier (offer study/note)", () => {
    expect(deriveCommitmentSpec("weekday-discipline")).toBeNull()
    expect(deriveCommitmentSpec("totally-unknown")).toBeNull()
    expect(canCommit("intraday-decay")).toBe(true)
    expect(canCommit("weekday-discipline")).toBe(false)
  })
})

describe("evaluateResult", () => {
  it("'<=' target 0: kept at 0, partial at 1, broken at ≥2", () => {
    expect(evaluateResult(0, 0, "<=")).toBe("kept")
    expect(evaluateResult(1, 0, "<=")).toBe("partial")
    expect(evaluateResult(2, 0, "<=")).toBe("broken")
  })

  it("'>=' target: kept when meeting it", () => {
    expect(evaluateResult(5, 5, ">=")).toBe("kept")
    expect(evaluateResult(4, 5, ">=")).toBe("partial")
    expect(evaluateResult(1, 5, ">=")).toBe("broken")
  })

  it("'==' is kept only on exact match", () => {
    expect(evaluateResult(3, 3, "==")).toBe("kept")
    expect(evaluateResult(2, 3, "==")).toBe("broken")
  })
})

describe("statusFromResult", () => {
  it("passes the result through as the terminal status", () => {
    expect(statusFromResult("kept")).toBe("kept")
    expect(statusFromResult("broken")).toBe("broken")
  })
})

import { describe, it, expect } from "vitest"
import { adviseWithdrawal } from "@/domains/analytics/risk/withdrawal-policy"

const funded = {
  phase: "FUNDED" as const,
  currentEquity: 110_000,
  initialBalance: 100_000,
  ddTotalPct: 0.1,
  ddModel: "FIXED" as const,
  minProfitBufferPct: 0.02,
}

describe("adviseWithdrawal (#46)", () => {
  it("blocks withdrawals on an evaluation phase", () => {
    const a = adviseWithdrawal({ ...funded, phase: "PHASE_1" })
    expect(a.eligible).toBe(false)
    expect(a.maxSafeAmount).toBe(0)
    expect(a.reason).toBe("NOT_FUNDED")
  })

  it("blocks when the funded account has no profit", () => {
    const a = adviseWithdrawal({ ...funded, currentEquity: 100_000 })
    expect(a.eligible).toBe(false)
    expect(a.maxSafeAmount).toBe(0)
    expect(a.reason).toBe("NO_PROFIT")
  })

  it("allows withdrawing profit above the retained buffer", () => {
    // profit 10k − buffer 2% of 100k (2k) = 8k safe
    const a = adviseWithdrawal(funded)
    expect(a.eligible).toBe(true)
    expect(a.maxSafeAmount).toBeCloseTo(8_000, 6)
    expect(a.reason).toBe("OK")
  })

  it("approves a request within the safe amount and reports the post-withdrawal buffer", () => {
    const a = adviseWithdrawal({ ...funded, requestedAmount: 8_000 })
    expect(a.requestAllowed).toBe(true)
    // floor = 90k; equity after = 102k; distance = 12k = 0.12 of initial
    expect(a.bufferToFloorPct).toBeCloseTo(0.12, 9)
  })

  it("rejects a request that exceeds the safe amount", () => {
    const a = adviseWithdrawal({ ...funded, requestedAmount: 12_000 })
    expect(a.requestAllowed).toBe(false)
    expect(a.reason).toBe("EXCEEDS_SAFE")
  })
})

import { describe, it, expect } from "vitest"
import { computeTransfer } from "@/domains/learning/transfer"

const low = (m: number) => [m - 0.1, m, m + 0.1, m, m - 0.1, m + 0.1, m, m]

describe("computeTransfer (#31)", () => {
  it("reports an associated improvement (never 'cause') with n and a caveat", () => {
    const r = computeTransfer({ before: low(0.5), after: low(1.5) })
    expect(r.label).toBe("associated-improvement")
    expect(r.significant).toBe(true)
    expect(r.delta).toBeCloseTo(1, 6)
    expect(r.nBefore).toBe(8)
    expect(r.nAfter).toBe(8)
    expect(r.caveat).toMatch(/asociaci|confound|régimen|no implica causa/i)
  })

  it("reports an associated decline when the edge drops after", () => {
    expect(computeTransfer({ before: low(1.5), after: low(0.5) }).label).toBe("associated-decline")
  })

  it("reports no association when before and after are indistinguishable", () => {
    const r = computeTransfer({ before: low(1.0), after: [1.05, 0.95, 1.0, 1.1, 0.9, 1.0, 1.05, 0.95] })
    expect(r.label).toBe("no-association")
    expect(r.significant).toBe(false)
  })

  it("is insufficient with too few trades on either side", () => {
    const r = computeTransfer({ before: [1], after: low(1.5) })
    expect(r.label).toBe("insufficient")
  })
})

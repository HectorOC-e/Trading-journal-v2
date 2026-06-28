import { describe, it, expect } from "vitest"
import { initialSalience, decayedSalience, recallScore, type MemoryEventType } from "@/domains/cognitive/memory/salience"

describe("initialSalience", () => {
  it("ranks in-the-moment errors above routine episodes", () => {
    expect(initialSalience("intervention")).toBeGreaterThan(initialSalience("commitment_kept"))
    expect(initialSalience("commitment_broken")).toBeGreaterThan(initialSalience("trade_emotional"))
  })
  it("is within (0,1] and falls back for an unknown type", () => {
    const s = initialSalience("nope" as MemoryEventType)
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(1)
  })
})

describe("decayedSalience", () => {
  it("equals the initial salience at age 0", () => {
    expect(decayedSalience(0.8, 0)).toBeCloseTo(0.8, 9)
  })
  it("halves at the half-life", () => {
    expect(decayedSalience(0.8, 30, 30)).toBeCloseTo(0.4, 6)
  })
  it("decreases with age and never goes negative", () => {
    expect(decayedSalience(0.8, 90, 30)).toBeLessThan(decayedSalience(0.8, 10, 30))
    expect(decayedSalience(0.8, 100000, 30)).toBeGreaterThanOrEqual(0)
  })
})

describe("recallScore", () => {
  it("rises with both salience and similarity", () => {
    const lo = recallScore({ salience: 0.3, similarity: 0.3 })
    expect(recallScore({ salience: 0.9, similarity: 0.3 })).toBeGreaterThan(lo)
    expect(recallScore({ salience: 0.3, similarity: 0.9 })).toBeGreaterThan(lo)
  })
  it("stays within [0,1]", () => {
    expect(recallScore({ salience: 1, similarity: 1 })).toBeLessThanOrEqual(1)
    expect(recallScore({ salience: 0, similarity: 0 })).toBeGreaterThanOrEqual(0)
  })
})

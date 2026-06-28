import { describe, it, expect } from "vitest"
import { buildCognitiveDigest } from "@/domains/cognitive/digest/cognitive-digest"

describe("buildCognitiveDigest", () => {
  it("summarizes improvement, commitments and the top pattern", () => {
    const r = buildCognitiveDigest({ improvementDelta: 4, topPattern: "rompes compromisos", kept: 3, broken: 1 })
    expect(r.hasContent).toBe(true)
    expect(r.summary).toMatch(/4/)
    expect(r.summary).toMatch(/3/)
    expect(r.summary.toLowerCase()).toContain("compromiso")
  })

  it("words a positive vs negative improvement delta differently", () => {
    const up = buildCognitiveDigest({ improvementDelta: 5, topPattern: null, kept: 0, broken: 0 }).summary
    const down = buildCognitiveDigest({ improvementDelta: -5, topPattern: null, kept: 0, broken: 0 }).summary
    expect(up).not.toEqual(down)
  })

  it("has no content when nothing happened (don't nag)", () => {
    expect(buildCognitiveDigest({ improvementDelta: null, topPattern: null, kept: 0, broken: 0 }).hasContent).toBe(false)
  })
})

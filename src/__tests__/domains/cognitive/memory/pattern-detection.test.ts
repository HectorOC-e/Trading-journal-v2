import { describe, it, expect } from "vitest"
import { detectPatterns, type EpisodeForPattern } from "@/domains/cognitive/memory/pattern-detection"

const ep = (id: string, eventType: string): EpisodeForPattern => ({ id, eventType })

describe("detectPatterns (E14, P6 — data confirms, not the LLM)", () => {
  it("confirms a pattern only with enough support episodes (N>=3)", () => {
    const ps = detectPatterns([ep("a", "intervention"), ep("b", "intervention"), ep("c", "intervention")], { minSupport: 3 })
    const p = ps.find((x) => x.key === "intervention")!
    expect(p.status).toBe("confirmed")
    expect(p.supportEpisodeIds).toEqual(["a", "b", "c"])
  })

  it("leaves a thin pattern as candidate (below the threshold)", () => {
    const ps = detectPatterns([ep("a", "checkin_red"), ep("b", "checkin_red")], { minSupport: 3 })
    expect(ps.find((x) => x.key === "checkin_red")!.status).toBe("candidate")
  })

  it("groups by event type and writes a human pattern text", () => {
    const ps = detectPatterns([ep("a", "commitment_broken"), ep("b", "commitment_broken"), ep("c", "commitment_broken")])
    const p = ps.find((x) => x.key === "commitment_broken")!
    expect(p.supportEpisodeIds).toHaveLength(3)
    expect(p.text.length).toBeGreaterThan(0)
  })

  it("raises confidence with more support", () => {
    const few = detectPatterns([ep("a", "trade_emotional"), ep("b", "trade_emotional")])[0].confidence
    const many = detectPatterns(Array.from({ length: 8 }, (_, i) => ep(`e${i}`, "trade_emotional")))[0].confidence
    expect(many).toBeGreaterThan(few)
  })

  it("ignores manual notes and is empty-safe", () => {
    expect(detectPatterns([ep("a", "manual"), ep("b", "manual")])).toEqual([])
    expect(detectPatterns([])).toEqual([])
  })
})

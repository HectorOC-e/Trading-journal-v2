import { describe, it, expect } from "vitest"
import { computeTagEdges, type TagTrade } from "@/domains/analytics/tags/tag-edge"

const mk = (tags: string[], rs: number[]): TagTrade[] => rs.map((r) => ({ tags, rMultiple: r, pnl: r * 100 }))

describe("computeTagEdges (#20)", () => {
  it("classifies a consistently positive tag as gold", () => {
    const r = computeTagEdges(mk(["A+"], [1.6, 1.8, 1.7, 1.9, 1.6, 1.8, 1.7, 1.9]))
    const aPlus = r.byTag.find((t) => t.tag === "A+")!
    expect(aPlus.classification).toBe("gold")
    expect(aPlus.avgR).toBeGreaterThan(1.5)
    expect(aPlus.pValue).toBeLessThan(0.05)
  })

  it("classifies a consistently negative tag as poison", () => {
    const r = computeTagEdges(mk(["dudé"], [-0.3, -0.4, -0.5, -0.4, -0.3, -0.5, -0.4, -0.4]))
    expect(r.byTag[0].classification).toBe("poison")
  })

  it("counts a trade toward each of its tags", () => {
    const r = computeTagEdges([{ tags: ["A+", "breakout"], rMultiple: 2, pnl: 200 }, { tags: ["breakout"], rMultiple: 1, pnl: 100 }])
    expect(r.byTag.find((t) => t.tag === "A+")!.trades).toBe(1)
    expect(r.byTag.find((t) => t.tag === "breakout")!.trades).toBe(2)
  })

  it("stays neutral when the tag's edge is within the noise", () => {
    const r = computeTagEdges(mk(["news"], [-3, 3, -2, 2, -3, 3, -1, 1]))
    expect(r.byTag[0].classification).toBe("neutral")
  })

  it("sorts gold tags first (best avg R on top)", () => {
    const trades = [...mk(["A+"], [1.6, 1.8, 1.7, 1.9, 1.6, 1.8, 1.7, 1.9]), ...mk(["dudé"], [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4])]
    expect(computeTagEdges(trades).byTag[0].tag).toBe("A+")
  })

  it("is neutral below the minimum sample", () => {
    expect(computeTagEdges(mk(["rare"], [2, 2])).byTag[0].classification).toBe("neutral")
  })
})

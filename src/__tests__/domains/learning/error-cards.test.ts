import { describe, it, expect } from "vitest"
import { generateErrorCards } from "@/domains/learning/error-cards"

const ERROR_TAGS = ["Off-plan", "Impulsivo", "dudé", "Revanche"]

describe("generateErrorCards (#42)", () => {
  it("turns a recurring error tag into a card with its cost", () => {
    const trades = [
      { tags: ["Off-plan"], rMultiple: -1, pnl: -100 },
      { tags: ["Off-plan"], rMultiple: -0.5, pnl: -50 },
      { tags: ["Off-plan"], rMultiple: -1.5, pnl: -150 },
    ]
    const cards = generateErrorCards({ trades, errorTags: ERROR_TAGS })
    expect(cards).toHaveLength(1)
    expect(cards[0].errorTag).toBe("Off-plan")
    expect(cards[0].occurrences).toBe(3)
    expect(cards[0].costR).toBeCloseTo(-3, 9)
    expect(cards[0].costPnl).toBeCloseTo(-300, 9)
    expect(cards[0].front).toContain("Off-plan")
    expect(cards[0].back).toContain("3")
  })

  it("orders cards by cost — the most expensive mistake first", () => {
    const trades = [
      ...Array(3).fill({ tags: ["dudé"], rMultiple: -0.4, pnl: -40 }),
      ...Array(3).fill({ tags: ["Revanche"], rMultiple: -2, pnl: -200 }),
    ]
    const cards = generateErrorCards({ trades, errorTags: ERROR_TAGS })
    expect(cards[0].errorTag).toBe("Revanche")
  })

  it("ignores non-error tags", () => {
    const trades = [...Array(3).fill({ tags: ["A+"], rMultiple: 2, pnl: 200 })]
    expect(generateErrorCards({ trades, errorTags: ERROR_TAGS })).toEqual([])
  })

  it("requires a minimum number of occurrences", () => {
    const trades = [{ tags: ["Impulsivo"], rMultiple: -1, pnl: -100 }]
    expect(generateErrorCards({ trades, errorTags: ERROR_TAGS, minOccurrences: 3 })).toEqual([])
  })
})

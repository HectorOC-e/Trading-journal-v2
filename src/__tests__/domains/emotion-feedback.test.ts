import { describe, it, expect } from "vitest"
import {
  wrByEmotion,
  feedbackForEmotion,
  needsEmotionNudge,
  type EmotionTrade,
} from "@/domains/trading/services/emotion-feedback"

function t(emotion: string | null, pnl: number, rMultiple: number | null = null): EmotionTrade {
  return { emotionBefore: emotion, pnl, rMultiple }
}

// 6 "anxious" trades: 2 winners → WR 33.3%
const anxious = [t("anxious", 10, 1), t("anxious", -5, -1), t("anxious", -5, -1), t("anxious", 8, 1), t("anxious", -5, -1), t("anxious", -5, -1)]

describe("wrByEmotion — historical performance per emotion (D10)", () => {
  it("computes n, win rate and avg R per emotion", () => {
    const map = wrByEmotion(anxious)
    expect(map.anxious.n).toBe(6)
    expect(map.anxious.winRate).toBeCloseTo(33.3, 1)
    expect(map.anxious.avgR).toBeCloseTo((1 - 1 - 1 + 1 - 1 - 1) / 6, 3)
  })
  it("ignores trades with no emotion", () => {
    const map = wrByEmotion([t(null, 10, 1), t("calm", 10, 1)])
    expect(Object.keys(map)).toEqual(["calm"])
  })
})

describe("feedbackForEmotion — the in-the-moment incentive (D10)", () => {
  it("returns the trader's history for the captured emotion when the sample is enough", () => {
    const fb = feedbackForEmotion(anxious, "anxious")
    expect(fb).toMatchObject({ emotion: "anxious", n: 6 })
    expect(fb?.winRate).toBeCloseTo(33.3, 1)
  })
  it("returns null below the minimum sample (no misleading small-n claim, R6)", () => {
    expect(feedbackForEmotion([t("calm", 10, 1)], "calm")).toBeNull()
  })
  it("returns null for an emotion never recorded", () => {
    expect(feedbackForEmotion(anxious, "calm")).toBeNull()
  })
})

describe("needsEmotionNudge — prompt at close when emotion is missing (#10)", () => {
  it("is true for a closed trade without emotion", () => {
    expect(needsEmotionNudge({ status: "CLOSED", emotionBefore: null })).toBe(true)
    expect(needsEmotionNudge({ status: "CLOSED", emotionBefore: "" })).toBe(true)
  })
  it("is false when emotion is present or the trade is still open", () => {
    expect(needsEmotionNudge({ status: "CLOSED", emotionBefore: "calm" })).toBe(false)
    expect(needsEmotionNudge({ status: "OPEN", emotionBefore: null })).toBe(false)
  })
})
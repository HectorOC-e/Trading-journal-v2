import { describe, it, expect } from "vitest"
import { assembleTodayFeed, detectDailyAnomaly, type SignalInput } from "@/domains/cognitive/today/feed"

const NOW = new Date("2026-06-27T12:00:00Z")
const sig = (o: Partial<SignalInput> & Pick<SignalInput, "id" | "kind" | "severity">): SignalInput => ({
  title: o.id, createdAt: NOW.toISOString(), ...o,
})

describe("assembleTodayFeed (#36)", () => {
  it("ranks a critical intervention above everything", () => {
    const feed = assembleTodayFeed([
      sig({ id: "rein", kind: "reinforcement", severity: "positive" }),
      sig({ id: "iv", kind: "intervention", severity: "critical" }),
      sig({ id: "ins", kind: "insight", severity: "warning" }),
    ], { now: NOW })
    expect(feed[0].id).toBe("iv")
  })

  it("drops an ignored item below a fresh one of the same kind (ignored sink)", () => {
    const feed = assembleTodayFeed([
      sig({ id: "ignored", kind: "insight", severity: "warning", ignored: 4 }),
      sig({ id: "fresh", kind: "insight", severity: "warning", ignored: 0 }),
    ], { now: NOW })
    expect(feed.map((i) => i.id)).toEqual(["fresh", "ignored"])
  })

  it("does NOT let a critical item sink even when ignored (critical floor)", () => {
    const feed = assembleTodayFeed([
      sig({ id: "fresh-insight", kind: "insight", severity: "warning", ignored: 0 }),
      sig({ id: "ignored-critical", kind: "intervention", severity: "critical", ignored: 9, createdAt: "2026-06-01T00:00:00Z" }),
    ], { now: NOW })
    expect(feed[0].id).toBe("ignored-critical")
  })

  it("sinks an old item below a recent one of the same kind (age decay)", () => {
    const feed = assembleTodayFeed([
      sig({ id: "old", kind: "insight", severity: "info", createdAt: "2026-06-10T00:00:00Z" }),
      sig({ id: "recent", kind: "insight", severity: "info", createdAt: "2026-06-27T00:00:00Z" }),
    ], { now: NOW })
    expect(feed.map((i) => i.id)).toEqual(["recent", "old"])
  })

  it("keeps calm reinforcement low so it never dominates the feed", () => {
    const feed = assembleTodayFeed([
      sig({ id: "rein", kind: "reinforcement", severity: "positive" }),
      sig({ id: "risk", kind: "risk", severity: "warning" }),
    ], { now: NOW })
    expect(feed[0].id).toBe("risk")
  })

  it("attaches a numeric priority and is empty-safe", () => {
    expect(assembleTodayFeed([], { now: NOW })).toEqual([])
    const feed = assembleTodayFeed([sig({ id: "a", kind: "insight", severity: "info" })], { now: NOW })
    expect(typeof feed[0].priority).toBe("number")
  })
})

describe("detectDailyAnomaly (#44)", () => {
  it("flags overtrading when today exceeds 1.5× the daily mean", () => {
    const a = detectDailyAnomaly({ tradesToday: 7, meanDailyTrades: 3, lossToday: 0, p90DailyLoss: 500 })
    expect(a.overtrading).toBe(true)
    expect(a.messages.join(" ")).toMatch(/media|overtrading/i)
  })

  it("does not flag overtrading within the normal band", () => {
    expect(detectDailyAnomaly({ tradesToday: 4, meanDailyTrades: 3, lossToday: 0, p90DailyLoss: 500 }).overtrading).toBe(false)
  })

  it("flags an outsized daily loss beyond p90", () => {
    const a = detectDailyAnomaly({ tradesToday: 2, meanDailyTrades: 3, lossToday: 800, p90DailyLoss: 500 })
    expect(a.outsizedLoss).toBe(true)
  })

  it("is quiet on a normal day", () => {
    const a = detectDailyAnomaly({ tradesToday: 2, meanDailyTrades: 3, lossToday: 100, p90DailyLoss: 500 })
    expect(a.overtrading).toBe(false)
    expect(a.outsizedLoss).toBe(false)
    expect(a.messages).toEqual([])
  })
})

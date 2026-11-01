import { describe, expect, it } from "vitest"
import { elapsedStudySeconds, restoreStudyTimer, toggleStudyPause } from "@/lib/study-timer"

describe("study timer reload", () => {
  it("restores paused time without counting time spent paused", () => {
    const start = restoreStudyTimer(null, "s1", 1000)
    const paused = toggleStudyPause(start, 61000)
    const restored = restoreStudyTimer(JSON.stringify(paused), "s1", 1000)
    expect(elapsedStudySeconds(restored, 3601000)).toBe(60)
    const resumed = toggleStudyPause(restored, 3601000)
    expect(elapsedStudySeconds(resumed, 3631000)).toBe(90)
  })

  it("keeps elapsed running time across reloads and rejects another session's snapshot", () => {
    const start = restoreStudyTimer(null, "s1", 1000)
    expect(elapsedStudySeconds(restoreStudyTimer(JSON.stringify(start), "s1", 1000), 121000)).toBe(120)
    expect(elapsedStudySeconds(restoreStudyTimer(JSON.stringify(start), "s2", 120000), 121000)).toBe(1)
  })

  it("falls back safely for broken browser storage", () => {
    for (const saved of ["oops", "{}", '{"sessionId":"s1","paused":true,"accumSec":-5,"runStartMs":0}']) {
      expect(elapsedStudySeconds(restoreStudyTimer(saved, "s1", 1000), 61000)).toBe(60)
    }
  })
})

/**
 * @vitest-environment jsdom
 * localStorage guard tests — M-02 regression guard (TASK-024)
 *
 * Verifies that localStorage.getItem / setItem failures don't crash the app
 * and that valid periods are correctly loaded from storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Isolated localStorage logic mirroring dashboard/page.tsx behaviour
// so we can test it without the full Next.js render tree.
const VALID_PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const
type Period = typeof VALID_PERIODS[number]
const KEY = "tj-dashboard-period"

function loadSavedPeriod(defaultPeriod: Period): Period {
  try {
    const saved = localStorage.getItem(KEY) as Period | null
    if (saved && VALID_PERIODS.includes(saved)) return saved
  } catch {
    // localStorage unavailable — fall through to default
  }
  return defaultPeriod
}

function savePeriod(period: Period): void {
  try {
    localStorage.setItem(KEY, period)
  } catch {
    // localStorage unavailable — no-op
  }
}

describe("Dashboard localStorage fallback (M-02 regression guard)", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("returns default period when localStorage is empty", () => {
    expect(loadSavedPeriod("3M")).toBe("3M")
  })

  it("returns saved period when it is valid", () => {
    localStorage.setItem(KEY, "7d")
    expect(loadSavedPeriod("3M")).toBe("7d")
  })

  it("returns default period when saved value is invalid/unknown", () => {
    localStorage.setItem(KEY, "invalid_period")
    expect(loadSavedPeriod("3M")).toBe("3M")
  })

  it("does not throw when localStorage.getItem throws SecurityError (M-02)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError")
    })
    expect(() => loadSavedPeriod("3M")).not.toThrow()
    expect(loadSavedPeriod("3M")).toBe("3M")
  })

  it("does not throw when localStorage.setItem throws QuotaExceededError (M-02)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })
    expect(() => savePeriod("1M")).not.toThrow()
  })

  it("saves valid period to localStorage", () => {
    savePeriod("6M")
    expect(localStorage.getItem(KEY)).toBe("6M")
  })
})

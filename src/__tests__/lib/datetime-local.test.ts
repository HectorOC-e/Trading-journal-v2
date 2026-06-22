import { describe, it, expect } from "vitest"
import { localDateISO, localHour, monthStartISO, weekStartISO, addDaysISO } from "@/lib/datetime/local"

describe("datetime/local", () => {
  describe("localDateISO", () => {
    it("resolves a 23:00-local instant to the local day, not the UTC next day", () => {
      // 2026-06-19 23:30 in America/Tegucigalpa (UTC-6) == 2026-06-20 05:30 UTC.
      const t = new Date("2026-06-20T05:30:00Z")
      expect(localDateISO(t, "America/Tegucigalpa")).toBe("2026-06-19")
      expect(localDateISO(t, "UTC")).toBe("2026-06-20")
    })

    it("falls back to UTC date for an invalid timezone", () => {
      const t = new Date("2026-06-20T05:30:00Z")
      expect(localDateISO(t, "Not/AZone")).toBe("2026-06-20")
    })
  })

  describe("localHour", () => {
    it("returns the hour in the given timezone", () => {
      const t = new Date("2026-06-20T05:30:00Z")
      expect(localHour(t, "UTC")).toBe(5)
      expect(localHour(t, "America/Tegucigalpa")).toBe(23) // UTC-6
    })
  })

  describe("calendar-date helpers", () => {
    it("monthStartISO pins to the first of the month", () => {
      expect(monthStartISO("2026-06-19")).toBe("2026-06-01")
    })

    it("weekStartISO returns the Monday of the week", () => {
      // 2026-06-19 is a Friday → Monday is 2026-06-15.
      expect(weekStartISO("2026-06-19")).toBe("2026-06-15")
      // A Monday maps to itself.
      expect(weekStartISO("2026-06-15")).toBe("2026-06-15")
      // A Sunday maps back to the prior Monday.
      expect(weekStartISO("2026-06-21")).toBe("2026-06-15")
    })

    it("addDaysISO shifts forward and backward across month boundaries", () => {
      expect(addDaysISO("2026-06-19", -90)).toBe("2026-03-21")
      expect(addDaysISO("2026-06-30", 1)).toBe("2026-07-01")
      expect(addDaysISO("2026-06-19", 0)).toBe("2026-06-19")
    })
  })
})

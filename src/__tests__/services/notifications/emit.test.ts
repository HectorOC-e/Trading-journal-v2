import { describe, it, expect, vi } from "vitest"
import { emitNotification, passesPreferences, inQuietHours } from "@/server/services/notifications/emit"

const at = (iso: string) => new Date(iso)

describe("inQuietHours", () => {
  const tz = "UTC"
  it("returns false when no window configured", () => {
    expect(inQuietHours({ quietStart: null, quietEnd: null, timezone: tz }, at("2026-06-16T23:30:00Z"))).toBe(false)
  })
  it("handles a same-day window (13:00–18:00)", () => {
    const p = { quietStart: "13:00", quietEnd: "18:00", timezone: tz }
    expect(inQuietHours(p, at("2026-06-16T14:00:00Z"))).toBe(true)
    expect(inQuietHours(p, at("2026-06-16T19:00:00Z"))).toBe(false)
  })
  it("handles a past-midnight window (22:00–07:00)", () => {
    const p = { quietStart: "22:00", quietEnd: "07:00", timezone: tz }
    expect(inQuietHours(p, at("2026-06-16T23:30:00Z"))).toBe(true)
    expect(inQuietHours(p, at("2026-06-16T03:00:00Z"))).toBe(true)
    expect(inQuietHours(p, at("2026-06-16T08:00:00Z"))).toBe(false)
  })
})

describe("passesPreferences", () => {
  const now = at("2026-06-16T12:00:00Z")
  const base = { muted: false, minPriority: "P3", channels: ["in_app"], quietStart: null, quietEnd: null, timezone: "UTC" }

  it("P0 always passes, ignoring muting / minPriority / quiet hours", () => {
    expect(passesPreferences("P0", { ...base, muted: true, minPriority: "P0", quietStart: "00:00", quietEnd: "23:59" }, now)).toBe(true)
  })
  it("passes when no pref row exists", () => {
    expect(passesPreferences("P2", null, now)).toBe(true)
  })
  it("blocks when muted", () => {
    expect(passesPreferences("P1", { ...base, muted: true }, now)).toBe(false)
  })
  it("blocks below minPriority", () => {
    expect(passesPreferences("P3", { ...base, minPriority: "P2" }, now)).toBe(false)
    expect(passesPreferences("P1", { ...base, minPriority: "P2" }, now)).toBe(true)
  })
  it("blocks when in_app channel disabled", () => {
    expect(passesPreferences("P1", { ...base, channels: ["email"] }, now)).toBe(false)
  })
})

function mockPrisma(over: { pref?: unknown; existing?: unknown } = {}) {
  return {
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(over.pref ?? null) },
    notification: {
      findFirst: vi.fn().mockResolvedValue(over.existing ?? null),
      create:    vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "new", ...data })),
      update:    vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "existing", ...data })),
    },
  }
}

describe("emitNotification", () => {
  it("no-ops on ephemeral (persist:false) codes", async () => {
    const p = mockPrisma()
    const r = await emitNotification(p as never, "u1", "TRADE_SAVED", { params: { symbol: "EURUSD", detail: "+1R" } })
    expect(r).toBeNull()
    expect(p.notification.create).not.toHaveBeenCalled()
  })

  it("creates a persisted row for a persistable code", async () => {
    const p = mockPrisma()
    const r = await emitNotification(p as never, "u1", "ACCOUNT_LOCKED", {
      params: { name: "FTMO", reason: "Límite diario" }, sourceId: "acc1", dedupeKey: "lock:acc1",
    })
    expect(p.notification.create).toHaveBeenCalledOnce()
    expect(r).toMatchObject({ code: "ACCOUNT_LOCKED", type: "CRITICAL", priority: "P0", title: "Cuenta FTMO bloqueada", href: "/cuentas" })
  })

  it("updates (dedupe) instead of stacking when a row with the key exists", async () => {
    const p = mockPrisma({ existing: { id: "existing" } })
    await emitNotification(p as never, "u1", "ACCOUNT_LOCKED", { params: { name: "X", reason: "y" }, dedupeKey: "lock:acc1" })
    expect(p.notification.update).toHaveBeenCalledOnce()
    expect(p.notification.create).not.toHaveBeenCalled()
  })

  it("respects preferences (muted blocks a non-P0)", async () => {
    const p = mockPrisma({ pref: { muted: true, minPriority: "P3", channels: ["in_app"], quietStart: null, quietEnd: null, timezone: "UTC" } })
    const r = await emitNotification(p as never, "u1", "RISK_LIMIT_EXCEEDED", { params: { current: "-1.6%", limit: "-2%", name: "X" } })
    expect(r).toBeNull()
    expect(p.notification.create).not.toHaveBeenCalled()
  })
})

import { expect, it, vi } from "vitest"
const { emitNotification } = vi.hoisted(() => ({ emitNotification: vi.fn() }))
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification }))
import { evaluateAndLock } from "@/domains/trading/services/risk-enforcement"

function fixture(locked: boolean) {
  const account = { id: "a", type: "DEMO_PERSONAL", initialBalance: 1000, locked, lockReason: locked ? "MANUAL" : "", ddDailyPct: 5, ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: 5, ddModel: "FIXED" }
  const db = { trade: { findMany: vi.fn().mockResolvedValue([{ accountId: "a", status: "CLOSED", pnl: -100, date: new Date("2026-11-16"), events: [] }]) }, account: { update: vi.fn().mockResolvedValue({ name: "Demo", type: "DEMO_PERSONAL" }) }, accountLog: { create: vi.fn() } }
  return { account, db }
}

it("risk recomputation reports a breach without replacing a permanent manual lock", async () => {
  const { account, db } = fixture(true)
  expect(await evaluateAndLock(db as never, "owner", account, "2026-11-16")).not.toBeNull()
  expect(db.account.update).not.toHaveBeenCalled()
  expect(db.accountLog.create).not.toHaveBeenCalled()
})

it("new account lock notifications carry the verified Demo provenance", async () => {
  emitNotification.mockClear()
  const { account, db } = fixture(false)
  await evaluateAndLock(db as never, "owner", account, "2026-11-16")
  expect(emitNotification.mock.calls[0][3]).toMatchObject({ params: { mode: "DEMO" }, dedupeKey: "lock:DEMO:a" })
})

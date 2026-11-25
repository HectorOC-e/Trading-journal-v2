import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { emptyBacktestWork, type BacktestReport } from "@/domains/learning/backtest-session"
import { backtestSessionsRouter } from "@/server/trpc/routers/backtest-sessions"
import { dropUser, makeUser, prisma } from "./_helpers"

// The caller already has a verified user ID. These fixtures have no captures,
// so the only external boundary is PostgreSQL and Storage is intentionally absent.
const supabase = { storage: null } as unknown as SupabaseClient
const caller = (userId: string) => backtestSessionsRouter.createCaller({ userId, prisma, supabase })
const plan = { title: "Confirmación QA", hypothesis: "Esperar el cierre", symbols: "EURUSD", timeframe: "M15", from: "2024-01-01", to: "2024-01-31",
  rules: "Cierre", invalidation: "Nivel inicial", exitRules: "Salida al invalidador", assumptions: "Sin costo",
  objectives: [{ title: "Operaciones cerradas", criterion: "Una operación", metric: "closed" as const, threshold: 1, minSample: 1 }] }

let owner: string, other: string
beforeEach(async () => { owner = await makeUser(); other = await makeUser() })
afterEach(async () => { await Promise.all([dropUser(owner), dropUser(other)]) })
afterAll(async () => { await prisma.$disconnect() })

async function trade(userId: string, mode: "BACKTEST" | "DEMO" | "REAL") {
  const account = await prisma.account.create({ data: { userId, name: `QA ${mode}`, broker: "QA", type: mode === "DEMO" ? "DEMO_PERSONAL" : mode === "REAL" ? "PERSONAL" : "BACKTEST", allowedSymbols: [] } })
  return prisma.trade.create({ data: { userId, accountId: account.id, operationalMode: mode, symbol: "EURUSD", direction: "LONG", date: new Date("2024-01-02"), openTime: "09:00", session: "London", entry: 1.1, stop: 1.09, target: 1.12, size: 1, closePrice: 1.12, status: "CLOSED", rMultiple: 2, pnl: 100, tags: [], screenshotUrls: [], events: { create: { userId, type: "PARTIAL_CLOSE", notes: "Parcial de prueba", price: 1.11, contracts: 0.5 } } } })
}

describe("backtest sessions on PostgreSQL", () => {
  it("rejects Demo, Real, foreign evidence and cross-account session reads", async () => {
    const { id } = await caller(owner).create({ plan, setupId: null, criterion: null })
    await caller(owner).start({ id, revision: 1 })
    const rows = await Promise.all([trade(owner, "DEMO"), trade(owner, "REAL"), trade(other, "BACKTEST")])
    for (const row of rows) await expect(caller(owner).save({ id, revision: 2, work: { ...emptyBacktestWork, tradeIds: [row.id] } })).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(caller(other).get({ id })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated")
      await tx.backtestSession.findMany()
    })).rejects.toThrow()
  })

  it("freezes a deduplicated snapshot and publishes only one report for a concurrent retry", async () => {
    const api = caller(owner)
    const { id } = await api.create({ plan, setupId: null, criterion: null })
    await api.start({ id, revision: 1 })
    const item = await trade(owner, "BACKTEST")
    const practice = await prisma.learningPractice.create({ data: { userId: owner, title: "Confirmar la entrada", date: new Date("2026-01-22"), durationMin: 35, exercise: "Revisar el cierre", kind: "REVIEW", operationalMode: "BACKTEST" } })
    await prisma.practiceTradeLink.create({ data: { userId: owner, practiceId: practice.id, tradeId: item.id, role: "REVIEWED" } })
    const work = { ...emptyBacktestWork, tradeIds: [item.id], practiceIds: [practice.id], conclusion: "Un cierre con datos", nextStep: "Probar dos casos nuevos", tradeNotes: { [item.id]: { entryReason: "Ruptura confirmada", exitReason: "Objetivo de precio", compliant: true } } }
    await api.save({ id, revision: 2, work })
    const first = await api.preview({ id })
    const base = { id, revision: 3, requestId: randomUUID(), signature: first.signature }
    const closes = await Promise.all([api.close(base), api.close(base)])
    expect(closes.map(row => row.number)).toEqual([1, 1])
    expect(first.report.metrics.closed).toBe(1)
    expect(first.report.practices[0]).toMatchObject({ date: "2026-01-22", duration: 35 })
    await prisma.trade.update({ where: { id: item.id }, data: { rMultiple: -1, pnl: -50 } })
    await api.reopen({ id, revision: 4 })
    const second = await api.preview({ id })
    expect(second.changes).toEqual(["Operación actualizada · EURUSD"])
    await expect(api.close({ ...base, revision: 5, requestId: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" })
    await api.close({ id, revision: 5, requestId: randomUUID(), signature: second.signature })
    const reports = await prisma.backtestSessionReport.findMany({ where: { userId: owner, sessionId: id }, orderBy: { number: "asc" } })
    expect(reports.map(row => [(row.snapshot as unknown as BacktestReport).metrics.expectancy, row.number])).toEqual([[2, 1], [-1, 2]])
    await expect(caller(other).report({ id, number: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

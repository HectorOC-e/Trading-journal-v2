import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn().mockResolvedValue({ source: "none" }) }))
import { prisma, makeUser, dropUser } from "./_helpers"
import { persistInsights } from "@/domains/analytics/insights/insight-store"
import { createCommitmentFromInsight, evaluateCommitment } from "@/server/services/behavior/commitment-service"
import { getImprovement } from "@/server/services/improvement/improvement-service"
import { recordImprovementSnapshot, getImprovementSeries } from "@/server/services/improvement/improvement-snapshot-service"
import { getCalibration, getMoodTrend, submitCheckin } from "@/server/services/psychology/psychology-service"
import { runRules } from "@/domains/rules/engine"
import { memoryHandler } from "@/domains/cognitive/events/handlers/memory-handler"

let userId: string
const date = new Date().toISOString().slice(0, 10)
const computed = [{ fingerprint: "off-plan", type: "off-plan", category: "risk", severity: "warning", title: "Plan", detail: "Evidence", evidence: "n=1", sampleSize: 1 }]

beforeAll(async () => {
  userId = await makeUser()
  for (const [type, pnl, offPlan] of [["PERSONAL", 100, false], ["DEMO_PERSONAL", -500, true]] as const) {
    const account = await prisma.account.create({ data: { userId, name: type, broker: "QA", type, initialBalance: 1000, allowedSymbols: [] } })
    await prisma.trade.create({ data: { userId, accountId: account.id, direction: "LONG", symbol: "EURUSD", entry: 1.1, stop: 1.09, target: 1.12, size: 1, date: new Date(date), openTime: "09:30", session: "London", tags: offPlan ? ["Off-plan"] : [], screenshotUrls: [], status: "CLOSED", pnl, rMultiple: pnl / 100, confidenceRating: offPlan ? 5 : 1 } })
  }
})
afterAll(async () => { if (userId) await dropUser(userId); await prisma.$disconnect() })

describe("derived action isolation on private local PostgreSQL", () => {
  it("Demo recomputation cannot resolve an existing Real insight", async () => {
    await persistInsights(userId, computed, prisma, "REAL")
    await persistInsights(userId, computed, prisma, "DEMO")
    await persistInsights(userId, [], prisma, "DEMO")
    expect(await prisma.insight.count({ where: { userId, operationalMode: "REAL", status: "active", fingerprint: "REAL:off-plan" } })).toBe(1)
    expect(await prisma.insight.count({ where: { userId, operationalMode: "DEMO", status: "resolved" } })).toBe(1)
  })

  it("Real commitment verification ignores Demo off-plan evidence", async () => {
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, operationalMode: "REAL" } })
    const c = await createCommitmentFromInsight(prisma, userId, insight.id, { mode: "REAL" })
    await prisma.commitment.update({ where: { id: c.id }, data: { startAt: new Date(date), endAt: new Date(Date.now() + 86_400_000) } })
    expect((await evaluateCommitment(prisma, userId, c.id)).status).toBe("kept")
    const check = await prisma.commitmentCheck.findFirstOrThrow({ where: { commitmentId: c.id } })
    expect(check.observedValue).toBe(0)
    expect(await prisma.commitment.count({ where: { userId, operationalMode: "DEMO" } })).toBe(0)
  })

  it("check-ins, session mood and daily improvement snapshots coexist by mode", async () => {
    for (const [mode, mood] of [["REAL", 5], ["DEMO", 2]] as const) {
      for (let i = 0; i < 5; i++) await submitCheckin(prisma, userId, { mode, mood, energy: 5, sleep: 5 })
      await prisma.tradingSessionLog.upsert({ where: { userId_date_session_operationalMode: { userId, date: new Date(date), session: "London", operationalMode: mode } }, create: { userId, date: new Date(date), session: "London", operationalMode: mode, preMood: mood }, update: { preMood: mood } })
      expect(await recordImprovementSnapshot(prisma, userId, mode)).toBe(true)
      expect(await getImprovementSeries(prisma, userId, 90, mode)).toHaveLength(1)
    }
    expect(await prisma.improvementScore.count({ where: { userId } })).toBe(2)
    const real = await getImprovement(prisma, userId, "REAL")
    const demo = await getImprovement(prisma, userId, "DEMO")
    expect(real.inputs.disciplineRolling).toBe(1)
    expect(demo.inputs.disciplineRolling).toBe(0)
    expect(real.keptRate).toBe(1)
    expect(demo.keptRate).toBeNull()
    expect((await getCalibration(prisma, userId, "REAL")).baseline).toBe(1)
    expect((await getCalibration(prisma, userId, "DEMO")).baseline).toBe(0)
    expect((await getMoodTrend(prisma, userId, "REAL")).windows[0].avgMood).toBe(5)
    expect((await getMoodTrend(prisma, userId, "DEMO")).windows[0].avgMood).toBe(2)
  })

  it("a derived Demo rule never blocks Real and an explicit manual global rule still does", async () => {
    await prisma.rule.create({ data: { userId, operationalMode: "DEMO", sourceInsightId: (await prisma.insight.findFirstOrThrow({ where: { userId, operationalMode: "DEMO" } })).id, name: "Demo only", trigger: "TRADE_PRE_CREATE", mode: "enforce", actions: [{ type: "BLOCK" }] } })
    await prisma.rule.create({ data: { userId, operationalMode: null, description: "Creada desde una intervención del coach.", name: "Legacy auto", trigger: "TRADE_PRE_CREATE", mode: "enforce", actions: [{ type: "BLOCK" }] } })
    expect((await runRules(prisma, userId, "TRADE_PRE_CREATE", () => ({}), "REAL")).blocked).toBe(false)
    expect((await runRules(prisma, userId, "TRADE_PRE_CREATE", () => ({}), "DEMO")).blocked).toBe(true)
    await prisma.rule.create({ data: { userId, operationalMode: null, globalManual: true, sourceInsightId: null, sourceCommitmentId: null, name: "Manual global", trigger: "TRADE_PRE_CREATE", mode: "enforce", actions: [{ type: "BLOCK" }] } })
    expect((await runRules(prisma, userId, "TRADE_PRE_CREATE", () => ({}), "REAL")).blocked).toBe(true)
  })

  it("outbox memories persist the verified source world without invoking an embedding provider", async () => {
    const event = await prisma.domainEvent.findFirstOrThrow({ where: { userId, type: "commitment.created" } })
    await memoryHandler(prisma, { id: event.id, userId, type: "commitment.created", payload: event.payload })
    expect(await prisma.memoryEpisode.count({ where: { userId, sourceId: event.id, operationalMode: "REAL" } })).toBe(1)
    expect(await prisma.memoryEpisode.count({ where: { userId, operationalMode: "DEMO" } })).toBe(0)
  })
})

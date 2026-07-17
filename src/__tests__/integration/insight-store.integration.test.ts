import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { persistInsights } from "@/domains/analytics/insights/insight-store"
import type { ComputedInsight } from "@/domains/analytics/insights/insight-reconcile"

function ci(fp: string, over: Partial<ComputedInsight> = {}): ComputedInsight {
  return {
    fingerprint: fp,
    type: fp,
    category: "pattern",
    severity: "info",
    title: `t-${fp}`,
    detail: "d",
    evidence: "e",
    sampleSize: 20,
    ...over,
  }
}

let userId: string
beforeEach(async () => {
  userId = await makeUser()
})
afterEach(async () => {
  await dropUser(userId)
})

describe("persistInsights (integration, real Postgres)", () => {
  it("creates insights and emits insight.created in the same transaction", async () => {
    const r = await persistInsights(userId, [ci("intraday-decay"), ci("oversizing")], prisma)
    expect(r.created).toBe(2)
    const insights = await prisma.insight.findMany({ where: { userId } })
    expect(insights).toHaveLength(2)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(2)
  })

  it("touches survivors without emitting new events or duplicating rows", async () => {
    await persistInsights(userId, [ci("intraday-decay")], prisma)
    await new Promise((r) => setTimeout(r, 5))
    const r = await persistInsights(userId, [ci("intraday-decay")], prisma)
    expect(r.created).toBe(0)
    expect(r.touched).toBe(1)
    const insights = await prisma.insight.findMany({ where: { userId } })
    expect(insights).toHaveLength(1)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(1) // touch does not re-emit
  })

  it("resolves a disappeared insight and emits insight.resolved", async () => {
    await persistInsights(userId, [ci("intraday-decay")], prisma)
    const r = await persistInsights(userId, [ci("oversizing")], prisma)
    expect(r.created).toBe(1)
    expect(r.resolved).toBe(1)
    const gone = await prisma.insight.findFirst({ where: { userId, type: "intraday-decay" } })
    expect(gone?.status).toBe("resolved")
    expect(gone?.resolvedAt).not.toBeNull()
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.resolved" } })
    expect(events).toHaveLength(1)
  })

  it("rolls back atomically: a mid-transaction failure leaves no insight and no event (FREEZE-D6)", async () => {
    // Second insight has a null NOT-NULL column → the create throws inside the
    // transaction AFTER the first insight+event were written. A real rollback
    // must leave both tables empty. (Mocks cannot prove this.)
    const bad = ci("oversizing", { sampleSize: null as unknown as number })
    await expect(persistInsights(userId, [ci("intraday-decay"), bad], prisma)).rejects.toBeTruthy()
    expect(await prisma.insight.count({ where: { userId } })).toBe(0)
    expect(await prisma.domainEvent.count({ where: { userId } })).toBe(0)
  })
})

import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/domains/cognitive/events/event-bus", () => ({ publishEvent: vi.fn() }))
vi.mock("@/server/services/memory/memory-episode-service", () => ({ recordEpisode: vi.fn(), recordEpisodeOnce: vi.fn() }))

import { persistInsights } from "@/domains/analytics/insights/insight-store"
import { createCommitmentFromInsight, evaluateCommitment, proposeCommitment, evaluateRuledCommitmentsOnTrade } from "@/server/services/behavior/commitment-service"
import { linkRule, suggestRulesFromInsights } from "@/server/services/behavior/rule-suggestion-service"
import { getCalibration, getMoodTrend, submitCheckin } from "@/server/services/psychology/psychology-service"
import { getImprovementSeries } from "@/server/services/improvement/improvement-snapshot-service"
import { runRules } from "@/domains/rules/engine"
import { getImprovement } from "@/server/services/improvement/improvement-service"
import { getTodayFeed } from "@/server/services/today/today-service"
import { getDailyPlan } from "@/server/services/today/daily-plan-service"
import { respondIntervention, runIntervention } from "@/server/services/intervention/intervention-service"
import { recordEpisode, recordEpisodeOnce } from "@/server/services/memory/memory-episode-service"
import { memoryHandler } from "@/domains/cognitive/events/handlers/memory-handler"

describe("derived operational worlds", () => {
  it("Demo recomputation cannot resolve an active Real insight and persists its own provenance", async () => {
    const updates: unknown[] = [], creates: any[] = []
    const client: any = {
      insight: {
        findMany: vi.fn(({ where }) => Promise.resolve(where.operationalMode === "DEMO" ? [] : [{ id: "real", fingerprint: "REAL:off-plan", status: "active" }])),
        create: vi.fn(({ data }) => { creates.push(data); return Promise.resolve({ id: "demo" }) }),
        update: vi.fn(args => { updates.push(args); return Promise.resolve({}) }),
      },
      $transaction: (fn: any) => fn(client),
    }
    await persistInsights("owner", [{ fingerprint: "off-plan", type: "off-plan", category: "risk", severity: "warning", title: "Plan", detail: "d", evidence: "e", sampleSize: 12 }], client, "DEMO")
    expect(updates).toEqual([])
    expect(creates[0]).toMatchObject({ operationalMode: "DEMO", fingerprint: "DEMO:off-plan" })
  })

  it("a legacy insight cannot create an actionable commitment", async () => {
    const db: any = { insight: { findFirstOrThrow: vi.fn().mockResolvedValue({ id: "legacy", type: "off-plan", operationalMode: null }) }, $transaction: vi.fn().mockResolvedValue({ id: "unexpected" }) }
    await expect(createCommitmentFromInsight(db, "owner", "legacy")).rejects.toThrow(/modalidad|provenance/i)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it("a coach proposal records Demo rather than defaulting to Real", async () => {
    const db: any = { commitment: { create: vi.fn().mockResolvedValue({ id: "demo", text: "Plan" }) } }
    await proposeCommitment(db, "owner", "stay_on_plan", "DEMO")
    expect(db.commitment.create.mock.calls[0][0].data.operationalMode).toBe("DEMO")
  })

  it("Demo off-plan trades do not break a Real commitment", async () => {
    const c = { id: "real", operationalMode: "REAL", status: "active", archivedAt: null, metricKey: "offPlanTrades", target: 0, comparator: "<=", keptCount: 0, startAt: new Date("2026-11-01"), endAt: new Date("2026-12-01") }
    const writes: any[] = []
    const db: any = {
      commitment: { findFirstOrThrow: vi.fn().mockResolvedValue(c), update: vi.fn(({ data }) => { writes.push(data); return Promise.resolve({}) }) },
      trade: { findMany: vi.fn(({ where }) => Promise.resolve(where.operationalMode === "REAL" ? [] : [{ id: "demo", date: new Date("2026-11-02"), pnl: -10, tags: ["Off-plan"] }])) },
      commitmentCheck: { create: vi.fn() }, reinforcement: { create: vi.fn() },
      $transaction: (fn: any) => fn(db),
    }
    const result = await evaluateCommitment(db, "owner", "real", { early: true })
    expect(result.status).toBe("active")
    expect(writes).toEqual([])
    expect(db.trade.findMany.mock.calls[0][0].where.operationalMode).toBe("REAL")
  })

  it("legacy commitments are inert even on a manual evaluation", async () => {
    const db: any = { commitment: { findFirstOrThrow: vi.fn().mockResolvedValue({ status: "active", operationalMode: null }) }, trade: { findMany: vi.fn() } }
    await expect(evaluateCommitment(db, "owner", "legacy")).rejects.toThrow(/modalidad|provenance/i)
    expect(db.trade.findMany).not.toHaveBeenCalled()
  })

  it("per-trade evaluation requires a verified matching account and trade", async () => {
    const db: any = { account: { findFirst: vi.fn().mockResolvedValue({ type: "DEMO_PERSONAL" }) }, trade: { findFirst: vi.fn().mockResolvedValue({ operationalMode: "REAL" }) }, commitment: { findMany: vi.fn().mockResolvedValue([]) } }
    await evaluateRuledCommitmentsOnTrade(db, "owner", { accountId: "demo", tradeId: "real" })
    expect(db.commitment.findMany).not.toHaveBeenCalled()
  })

  it("a derived rule keeps the commitment's modality", async () => {
    const db: any = { commitment: { findFirstOrThrow: vi.fn().mockResolvedValue({ id: "demo", metricKey: "tradesPerDayBeyond2", sourceInsightId: "i", operationalMode: "DEMO" }), update: vi.fn() }, rule: { create: vi.fn().mockResolvedValue({ id: "r" }) }, $transaction: (fn: any) => fn(db) }
    await linkRule(db, "owner", "demo")
    expect(db.rule.create.mock.calls[0][0].data.operationalMode).toBe("DEMO")
  })

  it("suggestions query and persist only the requested world", async () => {
    const db: any = { insight: { findMany: vi.fn().mockResolvedValue([{ id: "i", type: "revenge-trading", operationalMode: "DEMO" }]) }, ruleSuggestion: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() } }
    await suggestRulesFromInsights(db, "owner", "DEMO")
    expect(db.insight.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
    expect(db.ruleSuggestion.create.mock.calls[0][0].data.operationalMode).toBe("DEMO")
  })

  it("rule execution selects matching rules and explicitly manual globals", async () => {
    const db: any = { rule: { findMany: vi.fn().mockResolvedValue([]) } }
    await runRules(db, "owner", "TRADE_PRE_CREATE", () => ({}), "DEMO")
    expect(db.rule.findMany.mock.calls[0][0].where).toMatchObject({ userId: "owner", OR: [{ operationalMode: "DEMO" }, { operationalMode: null, globalManual: true, sourceInsightId: null, sourceCommitmentId: null }] })
  })

  it("a legacy automatic rule with deleted FKs and edited description is never promoted to a manual global block", async () => {
    const db: any = { rule: { findMany: vi.fn(({ where }) => {
      const global = where.OR?.find((entry: any) => entry.operationalMode === null)
      return Promise.resolve(global?.globalManual === true ? [] : [{ id: "old-auto", globalManual: false, description: "Edited by user", sourceInsightId: null, sourceCommitmentId: null, name: "Legacy intervention", conditions: {}, actions: [{ type: "BLOCK" }] }])
    }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) } }
    expect((await runRules(db, "owner", "TRADE_PRE_CREATE", () => ({}), "REAL")).blocked).toBe(false)
  })

  it("calibration, mood and newly recorded check-ins use one modality", async () => {
    const db: any = { trade: { findMany: vi.fn().mockResolvedValue([]) }, tradingSessionLog: { findMany: vi.fn().mockResolvedValue([]) }, preSessionCheckin: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "c" }) } }
    await getCalibration(db, "owner", "BACKTEST")
    await getMoodTrend(db, "owner", "BACKTEST")
    await submitCheckin(db, "owner", { mood: 4, energy: 4, sleep: 4, mode: "BACKTEST" })
    for (const read of [db.trade.findMany, db.tradingSessionLog.findMany, db.preSessionCheckin.findMany]) expect(read.mock.calls[0][0].where.operationalMode).toBe("BACKTEST")
    expect(db.preSessionCheckin.create.mock.calls[0][0].data.operationalMode).toBe("BACKTEST")
  })

  it("improvement history never substitutes another mode's snapshots", async () => {
    const db: any = { improvementScore: { findMany: vi.fn().mockResolvedValue([]) } }
    await getImprovementSeries(db, "owner", 90, "DEMO")
    expect(db.improvementScore.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
  })

  it("improvement computes discipline and kept rate from the same mode", async () => {
    const db: any = { user: { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: {} }) }, account: { findMany: vi.fn().mockResolvedValue([]) }, trade: { findMany: vi.fn().mockResolvedValue([]) }, commitment: { findMany: vi.fn().mockResolvedValue([]) } }
    await getImprovement(db, "owner", "DEMO")
    expect(db.trade.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
    expect(db.commitment.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
  })

  it("improvement converts monetary costs and identifies unknown currency instead of summing it as USD", async () => {
    const db: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: { EUR: 2 } }) },
      trade: { findMany: vi.fn().mockResolvedValue([
        { pnl: 100, rMultiple: 1, tags: [], account: { currency: "USD" } },
        { pnl: -100, rMultiple: -1, tags: ["Off-plan"], account: { currency: "EUR" } },
        { pnl: -50000, rMultiple: -1, tags: ["Off-plan"], account: { currency: "ZAR" } },
      ]) }, commitment: { findMany: vi.fn().mockResolvedValue([]) },
    }
    const result = await getImprovement(db, "owner", "DEMO")
    expect(result.indisciplineCost).toBe(300)
    expect(result.excludedCurrencies).toEqual(["ZAR"])
  })

  it("Today scopes every derived signal before its limit", async () => {
    const read = () => ({ findMany: vi.fn().mockResolvedValue([]) })
    const db: any = { insight: read(), commitment: read(), ruleSuggestion: read(), reinforcement: read(), account: read(), feedIgnore: read() }
    await getTodayFeed(db, "owner", "BACKTEST")
    for (const source of [db.insight, db.commitment, db.ruleSuggestion]) expect(source.findMany.mock.calls[0][0].where.operationalMode).toBe("BACKTEST")
    expect(db.reinforcement.findMany.mock.calls[0][0].where.commitment).toMatchObject({ userId: "owner", operationalMode: "BACKTEST" })
    expect(db.account.findMany.mock.calls[0][0].where.type).toEqual({ in: ["BACKTEST"] })
  })

  it("the daily plan separates operational commitments and accounts while labelling shared study", async () => {
    const read = () => ({ findMany: vi.fn().mockResolvedValue([]) })
    const db: any = { user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "UTC" }) }, commitment: read(), account: read(), learningResource: read(), studySession: read(), learningPractice: { aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 }, _sum: { durationMin: 0 } }) } }
    const plan = await getDailyPlan(db, "owner", new Date("2026-11-16"), "DEMO")
    expect(db.commitment.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
    expect(db.account.findMany.mock.calls[0][0].where.type).toEqual({ in: ["DEMO_PERSONAL", "DEMO_PROP"] })
    expect(plan.studyScope).toBe("SHARED")
  })

  it("legacy interventions cannot materialize a new blocking rule", async () => {
    const db: any = { intervention: { findFirstOrThrow: vi.fn().mockResolvedValue({ id: "legacy", operationalMode: null, suggestedAction: { kind: "cooldown" } }) }, $transaction: vi.fn().mockResolvedValue(undefined) }
    await expect(respondIntervention(db, "owner", "legacy", "accepted")).rejects.toThrow(/modalidad/i)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it("Demo intervention fatigue cannot suppress a Real intervention", async () => {
    const db: any = {
      account: { findFirst: vi.fn().mockResolvedValue({ type: "PERSONAL", initialBalance: 1000, ddDailyPct: 5 }) },
      trade: { findMany: vi.fn().mockResolvedValue([]) },
      intervention: { count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null) },
    }
    await runIntervention(db, "owner", "real", "2026-11-16")
    expect(db.intervention.count.mock.calls[0][0].where.operationalMode).toBe("REAL")
    expect(db.intervention.findFirst.mock.calls[0][0].where.operationalMode).toBe("REAL")
  })

  it("a red Demo check-in records a memory with structured provenance", async () => {
    vi.mocked(recordEpisode).mockClear()
    await submitCheckin({ preSessionCheckin: { create: vi.fn().mockResolvedValue({ id: "c" }) } } as never, "owner", { mode: "DEMO", mood: 1, energy: 1, sleep: 1 })
    expect(vi.mocked(recordEpisode).mock.calls[0][2]).toMatchObject({ operationalMode: "DEMO" })
  })

  it("outbox commitment memories use the persisted source mode and skip legacy sources", async () => {
    vi.mocked(recordEpisodeOnce).mockClear()
    const db: any = { commitment: { findFirst: vi.fn().mockResolvedValue({ text: "Plan", metricKey: "offPlanTrades", comparator: "<=", target: 0, window: "week", operationalMode: "BACKTEST" }) } }
    const event = { id: "event", userId: "owner", type: "commitment.created" as const, payload: { commitmentId: "c" } }
    await memoryHandler(db, event)
    expect(vi.mocked(recordEpisodeOnce).mock.calls[0][2]).toMatchObject({ operationalMode: "BACKTEST" })
    vi.mocked(recordEpisodeOnce).mockClear()
    db.commitment.findFirst.mockResolvedValue({ operationalMode: null })
    await memoryHandler(db, event)
    expect(recordEpisodeOnce).not.toHaveBeenCalled()
  })
})

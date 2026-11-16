import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/memory/memory-episode-service", () => ({ recordEpisode: vi.fn() }))
const { emitNotification } = vi.hoisted(() => ({ emitNotification: vi.fn() }))
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification }))

import { behaviorRouter } from "@/server/trpc/routers/behavior"
import { psychologyRouter } from "@/server/trpc/routers/psychology"
import { tradingSessionsRouter } from "@/server/trpc/routers/trading-sessions"
import { rulesRouter } from "@/server/trpc/routers/rules"
import { interventionRouter } from "@/server/trpc/routers/intervention"
import { insightCreatedHandler } from "@/domains/cognitive/events/handlers/notification-handler"

const caller = (r: any, prisma: any) => r.createCaller({ userId: "owner", prisma, supabase: {} })

describe("derived mode at API boundaries", () => {
  it("behavior list excludes another mode before limiting and accepts explicit Demo", async () => {
    const prisma = { insight: { findMany: vi.fn().mockResolvedValue([]) } }
    await caller(behaviorRouter, prisma).openInsights({ mode: "DEMO" })
    expect(prisma.insight.findMany.mock.calls[0][0].where.operationalMode).toBe("DEMO")
  })

  it("psychology read forwards the selected mode", async () => {
    const prisma = { preSessionCheckin: { findFirst: vi.fn().mockResolvedValue(null) } }
    await caller(psychologyRouter, prisma).latestCheckin({ mode: "BACKTEST" })
    expect(prisma.preSessionCheckin.findFirst.mock.calls[0][0].where.operationalMode).toBe("BACKTEST")
  })

  it("session writes cannot overwrite the same day's mood in another world", async () => {
    const prisma = { tradingSessionLog: { upsert: vi.fn().mockResolvedValue({ id: "demo" }) } }
    await caller(tradingSessionsRouter, prisma).log({ mode: "DEMO", date: "2026-11-16", session: "London", preMood: 2 })
    expect(prisma.tradingSessionLog.upsert.mock.calls[0][0]).toMatchObject({
      where: { userId_date_session_operationalMode: { userId: "owner", operationalMode: "DEMO", session: "London" } },
      create: { operationalMode: "DEMO" },
    })
  })

  it("rules list exposes unclassified legacy rules for explicit scope review", async () => {
    const prisma = { rule: { findMany: vi.fn().mockResolvedValue([]) } }
    await caller(rulesRouter, prisma).list({ mode: "DEMO" })
    expect(prisma.rule.findMany.mock.calls[0][0].where.OR).toEqual([{ operationalMode: "DEMO" }, { operationalMode: null }])
  })

  it.each([null, "DEMO"] as const)("manual rule creation declares global sharing only for explicit NULL (%s)", async operationalMode => {
    const prisma = { rule: { create: vi.fn().mockResolvedValue({ id: "r" }) } }
    await caller(rulesRouter, prisma).create({ name: "Manual protection", operationalMode })
    expect(prisma.rule.create.mock.calls[0][0].data).toMatchObject({ operationalMode, globalManual: operationalMode === null })
  })

  it("system default initialization marks its explicitly shared manual definitions", async () => {
    const prisma = { rule: { count: vi.fn().mockResolvedValue(0), createMany: vi.fn().mockResolvedValue({ count: 8 }) } }
    await caller(rulesRouter, prisma).seedDefaults()
    const data = prisma.rule.createMany.mock.calls[0][0].data
    expect(data).toHaveLength(8)
    expect(data.every((row: { globalManual: boolean }) => row.globalManual)).toBe(true)
  })

  it("explicit legacy assignment scopes only the owner's unclassified non-global rule", async () => {
    const prisma = { rule: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } }
    await caller(rulesRouter, prisma).assignMode({ id: "00000000-0000-4000-8000-000000000001", mode: "DEMO" })
    expect(prisma.rule.updateMany.mock.calls[0][0]).toMatchObject({ where: { userId: "owner", operationalMode: null, globalManual: false }, data: { operationalMode: "DEMO" } })
  })

  it("explicit assignment cannot reclassify an already scoped or foreign rule", async () => {
    const prisma = { rule: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } }
    await expect(caller(rulesRouter, prisma).assignMode({ id: "00000000-0000-4000-8000-000000000001", mode: "DEMO" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("editing a derived rule cannot reclassify it as an explicitly global manual rule", async () => {
    const prisma = { rule: { update: vi.fn().mockResolvedValue({ id: "r" }) } }
    await caller(rulesRouter, prisma).update({ id: "00000000-0000-4000-8000-000000000001", name: "Updated", operationalMode: null })
    expect(prisma.rule.update.mock.calls[0][0].data.operationalMode).toBeUndefined()
  })

  it("an intervention overlay reads only the selected world", async () => {
    const prisma = { intervention: { findFirst: vi.fn().mockResolvedValue(null) } }
    await caller(interventionRouter, prisma).active({ mode: "DEMO" })
    expect(prisma.intervention.findFirst.mock.calls[0][0].where.operationalMode).toBe("DEMO")
  })

  it("insight notifications identify Demo and cannot share a Real dedupe key", async () => {
    emitNotification.mockClear()
    const prisma: any = { insight: { findFirst: vi.fn().mockResolvedValue({ title: "Demo evidence", operationalMode: "DEMO" }) } }
    await insightCreatedHandler(prisma, { id: "e", userId: "owner", type: "insight.created", payload: { insightId: "i" } })
    expect(emitNotification.mock.calls[0][3]).toMatchObject({ params: { mode: "DEMO" }, dedupeKey: "insight:DEMO:i", href: "/analytics?mode=DEMO" })
  })

  it("an old unclassified insight cannot emit a new operational notification", async () => {
    emitNotification.mockClear()
    await insightCreatedHandler({ insight: { findFirst: vi.fn().mockResolvedValue({ title: "Legacy", operationalMode: null }) } } as never, { id: "old", userId: "owner", type: "insight.created", payload: { insightId: "old" } })
    expect(emitNotification).not.toHaveBeenCalled()
  })
})

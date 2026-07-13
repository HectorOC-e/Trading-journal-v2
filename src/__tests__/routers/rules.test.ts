import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { appRouter } from "@/server/trpc/root"

const USER_ID = "00000000-0000-0000-0000-000000000001"

function caller(over: Record<string, unknown> = {}) {
  const prisma = {
    rule: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: "r1", sourceAutomationId: null, sourceCommitmentId: null, sourceInsightId: null,
        lastFiredAt: null, createdAt: new Date(), updatedAt: new Date(), ...data,
      })),
      findMany: vi.fn().mockResolvedValue([]),
      ...over,
    },
  }
  return { c: appRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: USER_ID }), prisma }
}

const base = {
  name: "Test", trigger: "TRADE_CREATED" as const,
  conditions: { field: "riskPct", cmp: "gt" as const, value: 2 },
  actions: [{ type: "NOTIFY" as const, params: { message: "hi" } }],
}

describe("rules router — executable CRUD (post-G2)", () => {
  it("creates a valid executable rule with derived mode/severity", async () => {
    const { c } = caller()
    const r = await c.rules.createExecutable(base)
    expect(r.id).toBe("r1")
    expect(r.trigger).toBe("TRADE_CREATED")
    expect(r.mode).toBe("warn")
    expect(r.severity).toBe("MEDIA")
  })

  it("accepts a nested condition tree", async () => {
    const { c } = caller()
    await expect(c.rules.createExecutable({
      ...base,
      conditions: { op: "and", children: [
        { field: "riskPct", cmp: "gt", value: 2 },
        { op: "or", children: [{ field: "winRate", cmp: "lt", value: 50 }, { field: "drawdownPct", cmp: "gt", value: 10 }] },
      ] },
    })).resolves.toBeTruthy()
  })

  it("rejects BLOCK on a non-pre trigger", async () => {
    const { c } = caller()
    await expect(c.rules.createExecutable({
      ...base, trigger: "TRADE_CREATED", actions: [{ type: "BLOCK" }],
    })).rejects.toThrow()
  })

  it("allows BLOCK on TRADE_PRE_CREATE and derives enforce/CRÍTICA", async () => {
    const { c } = caller()
    const r = await c.rules.createExecutable({
      ...base, trigger: "TRADE_PRE_CREATE", actions: [{ type: "BLOCK", params: { message: "no" } }],
    })
    expect(r.mode).toBe("enforce")
    expect(r.severity).toBe("CRÍTICA")
  })

  it("createFromTemplate clones a known template", async () => {
    const { c } = caller()
    const r = await c.rules.createFromTemplate({ templateId: "psychology-revenge" })
    expect(r.trigger).toBe("TRADE_PRE_CREATE")
    expect(r.mode).toBe("enforce")
  })

  it("createFromTemplate rejects an unknown template", async () => {
    const { c } = caller()
    await expect(c.rules.createFromTemplate({ templateId: "nope" })).rejects.toThrow()
  })

  it("templates lists built-ins (base + protección fusionadas)", async () => {
    const { c } = caller()
    const t = await c.rules.templates()
    expect(t.length).toBeGreaterThan(0)
    expect(t.find((x) => x.id === "risk-management")).toBeTruthy()
    expect(t.find((x) => x.id === "daily-loss-stop")).toBeTruthy()
  })

  it("list serializes rows to the flat shape (Json fields cast)", async () => {
    const row = {
      id: "r9", name: "N", description: "", severity: "CRÍTICA", isSystem: false,
      enabled: true, mode: "enforce", trigger: "TRADE_PRE_CREATE",
      conditions: { field: "riskPct", cmp: "gt", value: 2 }, actions: [{ type: "BLOCK" }],
      priority: 0, category: "", sourceAutomationId: null, sourceCommitmentId: "cm1",
      sourceInsightId: null, lastFiredAt: null, createdAt: new Date(), updatedAt: new Date(),
    }
    const { c } = caller({ findMany: vi.fn().mockResolvedValue([row]) })
    const rows = await c.rules.list()
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe("enforce")
    expect(rows[0].sourceCommitmentId).toBe("cm1")
    expect(rows[0].actions).toEqual([{ type: "BLOCK" }])
  })
})

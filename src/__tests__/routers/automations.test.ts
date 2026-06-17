import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { appRouter } from "@/server/trpc/root"

const USER_ID = "00000000-0000-0000-0000-000000000001"

function caller(over: Record<string, unknown> = {}) {
  const prisma = {
    automation: {
      create:    vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "a1", ...data })),
      findMany:  vi.fn().mockResolvedValue([]),
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

describe("automations router", () => {
  it("creates a valid automation", async () => {
    const { c } = caller()
    const r = await c.automations.create(base)
    expect(r.id).toBe("a1")
    expect(r.trigger).toBe("TRADE_CREATED")
  })

  it("accepts a nested condition tree", async () => {
    const { c } = caller()
    await expect(c.automations.create({
      ...base,
      conditions: { op: "and", children: [
        { field: "riskPct", cmp: "gt", value: 2 },
        { op: "or", children: [{ field: "winRate", cmp: "lt", value: 50 }, { field: "drawdownPct", cmp: "gt", value: 10 }] },
      ] },
    })).resolves.toBeTruthy()
  })

  it("rejects BLOCK on a non-pre trigger", async () => {
    const { c } = caller()
    await expect(c.automations.create({
      ...base, trigger: "TRADE_CREATED", actions: [{ type: "BLOCK" }],
    })).rejects.toThrow()
  })

  it("allows BLOCK on TRADE_PRE_CREATE", async () => {
    const { c } = caller()
    await expect(c.automations.create({
      ...base, trigger: "TRADE_PRE_CREATE", actions: [{ type: "BLOCK", params: { message: "no" } }],
    })).resolves.toBeTruthy()
  })

  it("createFromTemplate clones a known template", async () => {
    const { c } = caller()
    const r = await c.automations.createFromTemplate({ templateId: "psychology-revenge" })
    expect(r.trigger).toBe("TRADE_PRE_CREATE")
  })

  it("createFromTemplate rejects an unknown template", async () => {
    const { c } = caller()
    await expect(c.automations.createFromTemplate({ templateId: "nope" })).rejects.toThrow()
  })

  it("templates lists built-ins", async () => {
    const { c } = caller()
    const t = await c.automations.templates()
    expect(t.length).toBeGreaterThan(0)
    expect(t.find((x) => x.id === "risk-management")).toBeTruthy()
  })
})

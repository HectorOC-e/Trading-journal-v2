import { describe, it, expect, vi } from "vitest"
import { systemTagDefs, ensureTagsSeeded, ensureTagRows } from "@/server/services/tags/seed"
import { VIOLATION_TAGS, QUALITY_TAGS } from "@/types"

describe("systemTagDefs", () => {
  it("derives system tags from the canonical constants", () => {
    const defs = systemTagDefs()
    const names = defs.map((d) => d.name)
    for (const v of VIOLATION_TAGS) expect(names).toContain(v)
    for (const q of QUALITY_TAGS) expect(names).toContain(q)
    expect(defs.find((d) => d.name === "Off-plan")?.semantic).toBe("violation")
    expect(defs.find((d) => d.name === "A+")?.semantic).toBe("quality")
    // every system tag carries appearance
    for (const d of defs) { expect(d.color).toMatch(/^#/); expect(d.icon).toBeTruthy() }
  })
})

function mockPrisma(over: { count?: number; distinct?: string[] } = {}) {
  return {
    tag: {
      count:      vi.fn().mockResolvedValue(over.count ?? 0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn().mockResolvedValue((over.distinct ?? []).map((tag) => ({ tag }))),
  }
}

describe("ensureTagsSeeded", () => {
  it("no-ops when the user already has tags", async () => {
    const p = mockPrisma({ count: 3 })
    const r = await ensureTagsSeeded(p as never, "u1")
    expect(r).toEqual({ seeded: false })
    expect(p.tag.createMany).not.toHaveBeenCalled()
  })

  it("seeds system tags + backfills distinct non-system trade strings", async () => {
    const p = mockPrisma({ count: 0, distinct: ["A+", "FOMO", "Off-plan", "Breakout"] })
    const r = await ensureTagsSeeded(p as never, "u1")
    expect(r.seeded).toBe(true)
    const data = p.tag.createMany.mock.calls[0][0].data as { name: string; isSystem?: boolean }[]
    const names = data.map((d) => d.name)
    // system tags present and flagged
    expect(data.find((d) => d.name === "Off-plan")?.isSystem).toBe(true)
    // user strings backfilled, but NOT duplicating system names (A+/Off-plan)
    expect(names).toContain("FOMO")
    expect(names).toContain("Breakout")
    expect(names.filter((n) => n === "Off-plan")).toHaveLength(1)
    expect(names.filter((n) => n === "A+")).toHaveLength(1)
  })
})

describe("ensureTagRows", () => {
  it("creates rows (skipDuplicates) for trimmed, unique, non-empty names", async () => {
    const p = mockPrisma()
    await ensureTagRows(p as never, "u1", ["A+", "A+", " FOMO ", ""])
    const arg = p.tag.createMany.mock.calls[0][0]
    expect(arg.skipDuplicates).toBe(true)
    expect(arg.data.map((d: { name: string }) => d.name).sort()).toEqual(["A+", "FOMO"])
  })

  it("no-ops on empty input", async () => {
    const p = mockPrisma()
    await ensureTagRows(p as never, "u1", ["", "  "])
    expect(p.tag.createMany).not.toHaveBeenCalled()
  })
})

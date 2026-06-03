import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const USER_ID = "550e8400-e29b-41d4-a716-446655440001"

function makeMockPrisma() {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(0),
  }
}

const mockSupabase = { auth: {} }

describe("tradeTags.list", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("returns tags sorted by count descending with bigint converted to number", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { tag: "breakout", count: BigInt(5) },
      { tag: "reversal", count: BigInt(2) },
    ])
    const result = await caller.tradeTags.list()
    expect(result).toEqual([
      { tag: "breakout", count: 5 },
      { tag: "reversal", count: 2 },
    ])
    expect(typeof result[0].count).toBe("number")
  })

  it("returns empty array when user has no tags", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([])
    const result = await caller.tradeTags.list()
    expect(result).toEqual([])
  })
})

describe("tradeTags.rename", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("executes rename and returns ok", async () => {
    const result = await caller.tradeTags.rename({ oldTag: "breakout", newTag: "BO" })
    expect(mockPrisma.$executeRaw).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true })
  })

  it("rejects when oldTag equals newTag", async () => {
    await expect(caller.tradeTags.rename({ oldTag: "tag", newTag: "tag" })).rejects.toThrow()
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
  })

  it("rejects when newTag exceeds 30 characters", async () => {
    await expect(caller.tradeTags.rename({ oldTag: "a", newTag: "a".repeat(31) })).rejects.toThrow()
  })
})

describe("tradeTags.delete", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("executes delete and returns ok", async () => {
    const result = await caller.tradeTags.delete("breakout")
    expect(mockPrisma.$executeRaw).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true })
  })

  it("rejects empty string input", async () => {
    await expect(caller.tradeTags.delete("")).rejects.toThrow()
  })
})

describe("tradeTags.merge", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("executes merge and returns ok", async () => {
    const result = await caller.tradeTags.merge({ dyingTag: "BO", survivingTag: "breakout" })
    expect(mockPrisma.$executeRaw).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true })
  })

  it("rejects when dyingTag equals survivingTag", async () => {
    await expect(caller.tradeTags.merge({ dyingTag: "tag", survivingTag: "tag" })).rejects.toThrow()
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
  })

  it("rejects empty dyingTag", async () => {
    await expect(caller.tradeTags.merge({ dyingTag: "", survivingTag: "breakout" })).rejects.toThrow()
  })

  it("rejects empty survivingTag", async () => {
    await expect(caller.tradeTags.merge({ dyingTag: "BO", survivingTag: "" })).rejects.toThrow()
  })
})

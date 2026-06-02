/**
 * TASK-030d: UserPreferences Router Tests
 * Tests CRUD operations, validation, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"
import { TRPCError } from "@trpc/server"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const USER_ID = "550e8400-e29b-41d4-a716-446655440001"

const BASE_PREFS = {
  userId:       USER_ID,
  theme:        "system",
  accentHue:    null,
  colorScheme:  "default",
  defaultTab:   "portfolio",
  kpiOrder:     [] as string[],
  kpiHidden:    [] as string[],
  defaultGrain: "daily",
  tableDensity: "comfortable",
  dateFormat:   "DD/MM/YYYY",
  numberLocale: "es-HN",
  createdAt:    new Date(),
  updatedAt:    new Date(),
}

function makeMockPrisma() {
  return {
    userPreferences: {
      findUnique: vi.fn(),
      upsert:     vi.fn(),
    },
  }
}

const mockSupabase = { auth: { updateUser: vi.fn() } }

describe("preferences.get", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller     = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("returns stored preferences when they exist", async () => {
    mockPrisma.userPreferences.findUnique.mockResolvedValue(BASE_PREFS)
    const result = await caller.preferences.get()
    expect(result.theme).toBe("system")
    expect(result.tableDensity).toBe("comfortable")
    expect(result.userId).toBe(USER_ID)
  })

  it("returns defaults when no preferences row exists", async () => {
    mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
    const result = await caller.preferences.get()
    expect(result.theme).toBe("system")
    expect(result.kpiOrder).toEqual([])
    expect(result.numberLocale).toBe("es-HN")
  })

  it("returns custom preferences when user has set them", async () => {
    mockPrisma.userPreferences.findUnique.mockResolvedValue({
      ...BASE_PREFS,
      theme:        "dark",
      accentHue:    240,
      tableDensity: "compact",
    })
    const result = await caller.preferences.get()
    expect(result.theme).toBe("dark")
    expect(result.accentHue).toBe(240)
    expect(result.tableDensity).toBe("compact")
  })
})

describe("preferences.update", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller     = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("upserts preferences with provided values", async () => {
    mockPrisma.userPreferences.upsert.mockResolvedValue({ ...BASE_PREFS, theme: "dark" })
    const result = await caller.preferences.update({ theme: "dark" })
    expect(result.theme).toBe("dark")
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where:  { userId: USER_ID },
      create: { userId: USER_ID, theme: "dark" },
      update: { theme: "dark" },
    })
  })

  it("accepts valid accent hue 0–360", async () => {
    mockPrisma.userPreferences.upsert.mockResolvedValue({ ...BASE_PREFS, accentHue: 180 })
    const result = await caller.preferences.update({ accentHue: 180 })
    expect(result.accentHue).toBe(180)
  })

  it("accepts accentHue = null (remove accent)", async () => {
    mockPrisma.userPreferences.upsert.mockResolvedValue({ ...BASE_PREFS, accentHue: null })
    await expect(caller.preferences.update({ accentHue: null })).resolves.not.toThrow()
  })

  it("rejects accentHue < 0", async () => {
    await expect(caller.preferences.update({ accentHue: -1 })).rejects.toThrow()
  })

  it("rejects accentHue > 360", async () => {
    await expect(caller.preferences.update({ accentHue: 361 })).rejects.toThrow()
  })

  it("rejects invalid theme", async () => {
    await expect(caller.preferences.update({ theme: "purple" as never })).rejects.toThrow()
  })

  it("rejects invalid colorScheme", async () => {
    await expect(caller.preferences.update({ colorScheme: "rainbow" as never })).rejects.toThrow()
  })

  it("rejects invalid tableDensity", async () => {
    await expect(caller.preferences.update({ tableDensity: "ultra" as never })).rejects.toThrow()
  })

  it("partial update — only theme changes", async () => {
    mockPrisma.userPreferences.upsert.mockResolvedValue({ ...BASE_PREFS, theme: "light" })
    await caller.preferences.update({ theme: "light" })
    const call = mockPrisma.userPreferences.upsert.mock.calls[0][0]
    expect(call.update).toEqual({ theme: "light" })
    expect(call.update.tableDensity).toBeUndefined()
  })
})

import { describe, it, expect, vi } from "vitest"
import {
  validateProfileUpdate,
  normalizeProfileInput,
  invalidateAnalyticsCacheIfNeeded,
  PROFILE_PUBLIC_FIELDS,
} from "@/domains/profile/services/profile-service"
import { TRPCError } from "@trpc/server"
import type { PrismaClient } from "@/lib/generated/prisma/client"

function makePrisma(): PrismaClient {
  return {
    tradeStatsCache: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as PrismaClient
}

describe("validateProfileUpdate", () => {
  it("passes valid input without throwing", () => {
    expect(() => validateProfileUpdate({ name: "John", timezone: "America/New_York", baseCurrency: "USD" }))
      .not.toThrow()
  })

  it("throws BAD_REQUEST when name is empty string", () => {
    expect(() => validateProfileUpdate({ name: "   " }))
      .toThrow(TRPCError)
  })

  it("throws BAD_REQUEST when timezone is invalid IANA", () => {
    expect(() => validateProfileUpdate({ timezone: "Not/ATimezone" }))
      .toThrow(TRPCError)
  })

  it("accepts valid IANA timezone", () => {
    expect(() => validateProfileUpdate({ timezone: "America/Tegucigalpa" })).not.toThrow()
    expect(() => validateProfileUpdate({ timezone: "Europe/London" })).not.toThrow()
    expect(() => validateProfileUpdate({ timezone: "UTC" })).not.toThrow()
  })

  it("throws BAD_REQUEST for non-3-letter currency code", () => {
    expect(() => validateProfileUpdate({ baseCurrency: "US" })).toThrow(TRPCError)
    expect(() => validateProfileUpdate({ baseCurrency: "USDD" })).toThrow(TRPCError)
  })

  it("accepts valid 3-letter currency code (case-insensitive)", () => {
    expect(() => validateProfileUpdate({ baseCurrency: "USD" })).not.toThrow()
    expect(() => validateProfileUpdate({ baseCurrency: "eur" })).not.toThrow()
    expect(() => validateProfileUpdate({ baseCurrency: "HNL" })).not.toThrow()
  })

  it("ignores undefined fields (partial update)", () => {
    expect(() => validateProfileUpdate({})).not.toThrow()
    expect(() => validateProfileUpdate({ emailNotifications: false })).not.toThrow()
  })
})

describe("normalizeProfileInput", () => {
  it("trims whitespace from name", () => {
    expect(normalizeProfileInput({ name: "  John  " }).name).toBe("John")
  })

  it("uppercases baseCurrency", () => {
    expect(normalizeProfileInput({ baseCurrency: "usd" }).baseCurrency).toBe("USD")
  })

  it("trims timezone", () => {
    expect(normalizeProfileInput({ timezone: " UTC " }).timezone).toBe("UTC")
  })

  it("preserves unmodified fields", () => {
    const input = { emailNotifications: true, weeklyGoalMinutes: 300 }
    expect(normalizeProfileInput(input)).toEqual(input)
  })

  it("handles undefined values without error", () => {
    expect(normalizeProfileInput({})).toEqual({
      name: undefined,
      timezone: undefined,
      baseCurrency: undefined,
    })
  })
})

describe("invalidateAnalyticsCacheIfNeeded", () => {
  it("deletes cache when baseCurrency changes", async () => {
    const prisma = makePrisma()
    await invalidateAnalyticsCacheIfNeeded(prisma, "user-1", { baseCurrency: "EUR" })

    expect(prisma.tradeStatsCache.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
  })

  it("deletes cache when timezone changes", async () => {
    const prisma = makePrisma()
    await invalidateAnalyticsCacheIfNeeded(prisma, "user-1", { timezone: "Europe/London" })

    expect(prisma.tradeStatsCache.deleteMany).toHaveBeenCalled()
  })

  it("does NOT delete cache when only name changes", async () => {
    const prisma = makePrisma()
    await invalidateAnalyticsCacheIfNeeded(prisma, "user-1", { name: "New Name" })

    expect(prisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled()
  })

  it("does NOT delete cache for emailNotifications change", async () => {
    const prisma = makePrisma()
    await invalidateAnalyticsCacheIfNeeded(prisma, "user-1", { emailNotifications: false })

    expect(prisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled()
  })
})

describe("PROFILE_PUBLIC_FIELDS", () => {
  it("includes expected safe fields", () => {
    expect(PROFILE_PUBLIC_FIELDS.id).toBe(true)
    expect(PROFILE_PUBLIC_FIELDS.email).toBe(true)
    expect(PROFILE_PUBLIC_FIELDS.name).toBe(true)
    expect(PROFILE_PUBLIC_FIELDS.timezone).toBe(true)
    expect(PROFILE_PUBLIC_FIELDS.baseCurrency).toBe(true)
  })

  it("does not expose internal system fields (no role access check fields)", () => {
    // This test documents what should NOT be in PROFILE_PUBLIC_FIELDS
    // If you ever add adminRole, internalFlag, etc., they must NOT appear here
    const fields = Object.keys(PROFILE_PUBLIC_FIELDS)
    expect(fields).not.toContain("updatedAt")
    expect(fields).not.toContain("password")
  })
})

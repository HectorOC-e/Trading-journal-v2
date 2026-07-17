/**
 * B-05 — the dashboard cache must not outlive the data it summarizes.
 *
 * `dashboardStats` caches on [userId, cacheKey] for CACHE_TTL_MS. Only trade
 * mutations dropped that cache; accounts, setups and markets did not, even though
 * the dashboard reads all three. With the cache off in production (0 rows) that
 * was invisible — it was a trap armed for whoever turned the flag on.
 *
 * The static guard is the point: 18 mutations across 3 routers is exactly the
 * shape of thing that drifts, and forgetting one is how this bug happened.
 */
import { describe, it, expect, vi } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const ROUTERS = path.resolve(__dirname, "../../server/trpc/routers")

/** Routers whose mutations all change data the dashboard reads. */
const MUST_INVALIDATE = ["accounts.ts", "setups.ts", "markets.ts"]

describe("dashboard cache invalidation — static guard", () => {
  it.each(MUST_INVALIDATE)("%s builds every mutation from dashboardMutation", (file) => {
    const src = readFileSync(path.join(ROUTERS, file), "utf8")

    // Every procedure that ends in .mutation( must have been built from the
    // invalidating builder, never from bare protectedProcedure.
    const procedures = [...src.matchAll(/(protectedProcedure|dashboardMutation)([\s\S]*?)\.(mutation|query)\(/g)]
    const offenders = procedures
      .filter(m => m[3] === "mutation" && m[1] !== "dashboardMutation")
      .map(m => m[0].slice(0, 60))

    expect(offenders).toEqual([])
  })

  it("the guard actually sees mutations (not vacuously passing)", () => {
    const total = MUST_INVALIDATE.reduce((n, file) => {
      const src = readFileSync(path.join(ROUTERS, file), "utf8")
      return n + [...src.matchAll(/\.mutation\(/g)].length
    }, 0)
    expect(total).toBeGreaterThanOrEqual(15)
  })
})

describe("dashboardMutation middleware", () => {
  it("drops the cache after a successful mutation when the cache is on", async () => {
    vi.resetModules()
    const invalidateCache = vi.fn()
    vi.doMock("@/domains/analytics/services/analytics-cache", () => ({
      isCacheEnabled: () => true,
      invalidateCache,
      getCachedStats: vi.fn(),
      setCachedStats: vi.fn(),
    }))
    vi.doMock("@/lib/prisma", () => ({ prisma: {} }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

    const { dashboardMutation, router } = await import("@/server/trpc/init")
    const r = router({ touch: dashboardMutation.mutation(() => "ok") })
    const caller = r.createCaller({ prisma: {}, supabase: {}, userId: "u1" } as never)

    await expect(caller.touch()).resolves.toBe("ok")
    expect(invalidateCache).toHaveBeenCalledWith(expect.anything(), "u1")
  })

  it("does not touch the cache when the mutation throws", async () => {
    vi.resetModules()
    const invalidateCache = vi.fn()
    vi.doMock("@/domains/analytics/services/analytics-cache", () => ({
      isCacheEnabled: () => true,
      invalidateCache,
      getCachedStats: vi.fn(),
      setCachedStats: vi.fn(),
    }))
    vi.doMock("@/lib/prisma", () => ({ prisma: {} }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

    const { dashboardMutation, router } = await import("@/server/trpc/init")
    const r = router({ boom: dashboardMutation.mutation(() => { throw new Error("nope") }) })
    const caller = r.createCaller({ prisma: {}, supabase: {}, userId: "u1" } as never)

    await expect(caller.boom()).rejects.toThrow()
    expect(invalidateCache).not.toHaveBeenCalled()
  })

  it("skips the delete entirely when the cache is off", async () => {
    vi.resetModules()
    const invalidateCache = vi.fn()
    vi.doMock("@/domains/analytics/services/analytics-cache", () => ({
      isCacheEnabled: () => false,
      invalidateCache,
      getCachedStats: vi.fn(),
      setCachedStats: vi.fn(),
    }))
    vi.doMock("@/lib/prisma", () => ({ prisma: {} }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

    const { dashboardMutation, router } = await import("@/server/trpc/init")
    const r = router({ touch: dashboardMutation.mutation(() => "ok") })
    const caller = r.createCaller({ prisma: {}, supabase: {}, userId: "u1" } as never)

    await caller.touch()
    expect(invalidateCache).not.toHaveBeenCalled()
  })
})

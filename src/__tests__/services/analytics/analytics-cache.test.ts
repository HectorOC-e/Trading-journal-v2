import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCachedStats, setCachedStats, invalidateCache, CACHE_TTL_MS } from "@/domains/analytics/services/analytics-cache"

// ── Minimal mock for PrismaClient["tradeStatsCache"] ─────────────────────────

type CacheRow = {
  userId:     string
  period:     string
  accountId:  string | null
  statsJson:  unknown
  computedAt: Date
}

function makeDb(initial: CacheRow[] = []) {
  const store = new Map<string, CacheRow>(
    initial.map(r => [`${r.userId}:${r.period}`, r]),
  )
  return {
    tradeStatsCache: {
      findUnique: vi.fn(({ where }: { where: { userId_period: { userId: string; period: string } } }) => {
        return Promise.resolve(store.get(`${where.userId_period.userId}:${where.userId_period.period}`) ?? null)
      }),
      upsert: vi.fn(({ where, create, update }: {
        where: { userId_period: { userId: string; period: string } }
        create: CacheRow
        update: Partial<CacheRow>
      }) => {
        const key = `${where.userId_period.userId}:${where.userId_period.period}`
        const existing = store.get(key)
        const row = existing ? { ...existing, ...update } : create
        store.set(key, row)
        return Promise.resolve(row)
      }),
      deleteMany: vi.fn(({ where }: { where: { userId: string } }) => {
        for (const key of store.keys()) {
          if (key.startsWith(`${where.userId}:`)) store.delete(key)
        }
        return Promise.resolve({ count: 0 })
      }),
    },
    _store: store,
  }
}

// ── getCachedStats ────────────────────────────────────────────────────────────

describe("getCachedStats", () => {
  it("returns null when no row exists", async () => {
    const db = makeDb()
    const result = await getCachedStats(db, "user-1", "3M")
    expect(result).toBeNull()
  })

  it("returns parsed data when row is within TTL", async () => {
    const stats = { netPnl: 500, wins: 10 }
    const db    = makeDb([{
      userId:     "user-1",
      period:     "3M",
      accountId:  null,
      statsJson:  stats,
      computedAt: new Date(), // just now → within TTL
    }])
    const result = await getCachedStats<typeof stats>(db, "user-1", "3M")
    expect(result).toEqual(stats)
  })

  it("returns null when row is older than TTL", async () => {
    const stats = { netPnl: 500 }
    const db    = makeDb([{
      userId:     "user-1",
      period:     "ALL",
      accountId:  null,
      statsJson:  stats,
      computedAt: new Date(Date.now() - CACHE_TTL_MS - 1000), // expired
    }])
    const result = await getCachedStats(db, "user-1", "ALL")
    expect(result).toBeNull()
  })

  it("does not return data for a different period", async () => {
    const db = makeDb([{
      userId:     "user-1",
      period:     "1M",
      accountId:  null,
      statsJson:  { foo: 1 },
      computedAt: new Date(),
    }])
    const result = await getCachedStats(db, "user-1", "3M")
    expect(result).toBeNull()
  })

  it("does not return data for a different user", async () => {
    const db = makeDb([{
      userId:     "user-A",
      period:     "3M",
      accountId:  null,
      statsJson:  { foo: 1 },
      computedAt: new Date(),
    }])
    const result = await getCachedStats(db, "user-B", "3M")
    expect(result).toBeNull()
  })
})

// ── setCachedStats ────────────────────────────────────────────────────────────

describe("setCachedStats", () => {
  it("stores stats and subsequent getCachedStats returns them (cache miss → hit)", async () => {
    const db    = makeDb()
    const stats = { netPnl: 200, winRate: 55 }

    // Cache miss
    expect(await getCachedStats(db, "user-1", "1M")).toBeNull()

    // Store
    await setCachedStats(db, "user-1", "1M", stats)

    // Cache hit
    const hit = await getCachedStats<typeof stats>(db, "user-1", "1M")
    expect(hit).toEqual(stats)
  })

  it("overwrites an existing entry with fresh data", async () => {
    const db   = makeDb()
    const old  = { netPnl: 100 }
    const next = { netPnl: 999 }

    await setCachedStats(db, "user-1", "3M", old)
    await setCachedStats(db, "user-1", "3M", next)

    const hit = await getCachedStats<typeof next>(db, "user-1", "3M")
    expect(hit).toEqual(next)
  })
})

// ── invalidateCache ───────────────────────────────────────────────────────────

describe("invalidateCache", () => {
  it("removes all cached entries for the user", async () => {
    const db = makeDb([
      { userId: "user-1", period: "1M",  accountId: null, statsJson: {}, computedAt: new Date() },
      { userId: "user-1", period: "ALL", accountId: null, statsJson: {}, computedAt: new Date() },
      { userId: "user-2", period: "3M",  accountId: null, statsJson: {}, computedAt: new Date() },
    ])

    await invalidateCache(db, "user-1")

    expect(await getCachedStats(db, "user-1", "1M")).toBeNull()
    expect(await getCachedStats(db, "user-1", "ALL")).toBeNull()
    // Other users' entries must survive
    expect(await getCachedStats(db, "user-2", "3M")).not.toBeNull()
  })

  it("invalidation before setCachedStats results in fresh miss", async () => {
    const db    = makeDb()
    const stats = { netPnl: 500 }
    await setCachedStats(db, "user-1", "3M", stats)

    // Closing a trade invalidates
    await invalidateCache(db, "user-1")

    expect(await getCachedStats(db, "user-1", "3M")).toBeNull()
  })
})

// ── TTL boundary ──────────────────────────────────────────────────────────────

describe("CACHE_TTL_MS boundary", () => {
  it("is exactly 5 minutes", () => {
    expect(CACHE_TTL_MS).toBe(300_000)
  })

  it("entry exactly at TTL boundary is stale", async () => {
    const db = makeDb([{
      userId:     "user-1",
      period:     "6M",
      accountId:  null,
      statsJson:  { v: 1 },
      computedAt: new Date(Date.now() - CACHE_TTL_MS), // exactly at boundary → expired
    }])
    expect(await getCachedStats(db, "user-1", "6M")).toBeNull()
  })

  it("entry well before TTL boundary is still fresh", async () => {
    const db = makeDb([{
      userId:     "user-1",
      period:     "6M",
      accountId:  null,
      statsJson:  { v: 1 },
      computedAt: new Date(Date.now() - CACHE_TTL_MS + 5_000), // 5s before expiry (safe margin)
    }])
    expect(await getCachedStats(db, "user-1", "6M")).not.toBeNull()
  })
})

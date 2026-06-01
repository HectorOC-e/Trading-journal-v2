// 5-minute TTL enforced at application layer
export const CACHE_TTL_MS = 5 * 60 * 1000

type CacheRow = { userId: string; period: string; statsJson: unknown; computedAt: unknown }

interface CacheDelegate {
  findUnique(args: { where: { userId_period: { userId: string; period: string } } }): Promise<CacheRow | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsert(args: any): Promise<CacheRow>
  deleteMany(args: { where: { userId: string } }): Promise<unknown>
}

interface CacheDb {
  tradeStatsCache: CacheDelegate
}

export function isCacheEnabled(): boolean {
  return process.env.ANALYTICS_CACHE_ENABLED === "true"
}

export async function getCachedStats<T>(
  db: CacheDb,
  userId: string,
  period: string,
): Promise<T | null> {
  const row = await db.tradeStatsCache.findUnique({
    where: { userId_period: { userId, period } },
  })
  if (!row) return null
  const ageMs = Date.now() - (row.computedAt as Date).getTime()
  if (ageMs >= CACHE_TTL_MS) return null
  return row.statsJson as T
}

export async function setCachedStats<T>(
  db: CacheDb,
  userId: string,
  period: string,
  stats: T,
): Promise<void> {
  await db.tradeStatsCache.upsert({
    where:  { userId_period: { userId, period } },
    create: { userId, period, statsJson: stats as object, computedAt: new Date() },
    update: { statsJson: stats as object, computedAt: new Date() },
  })
}

// Invalidate all cached periods for a user (called on trade mutations)
export async function invalidateCache(
  db: CacheDb,
  userId: string,
): Promise<void> {
  await db.tradeStatsCache.deleteMany({ where: { userId } })
}

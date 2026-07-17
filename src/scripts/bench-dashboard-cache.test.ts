/**
 * B-05 load test — does TradeStatsCache pay for itself at 1000+ trades?
 *
 * Not part of the normal suite: it needs a real Postgres, so it is inert unless
 * BENCH=1.
 *
 * Two modes:
 *   - seed mode (default) writes BENCH_TRADES synthetic trades, measures, deletes
 *     them. Point DATABASE_URL at a LOCAL stack (`npx supabase start`), NEVER
 *     production — it creates and drops thousands of rows.
 *   - BENCH_USER_ID=<uuid> measures an existing user and seeds nothing. Read-only
 *     while the cache is off, so it is safe against production and is the only way
 *     to get a number for the workload that actually exists.
 *
 *   BENCH=1 DATABASE_URL=postgresql://... pnpm exec vitest run scripts/bench-dashboard-cache.test.ts
 *
 * Optional: BENCH_TRADES (default 1000), BENCH_REPS (default 5).
 */
import { describe, it, beforeAll, afterAll } from "vitest"
import { randomUUID } from "crypto"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"

const N_TRADES = Number(process.env.BENCH_TRADES ?? 1000)
const REPS     = Number(process.env.BENCH_REPS   ?? 5)

// Built in beforeAll, not at module scope: this project drives Prisma through the
// PrismaPg adapter, so constructing a client without one throws at import — which
// would fail collection for everyone, benchmarking or not.
let prisma: PrismaClient
let userId: string
let seeded = true

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

async function timed(fn: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now()
  await fn()
  return performance.now() - t0
}

describe.skipIf(!process.env.BENCH)("dashboardStats cache benchmark", () => {
  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    })

    // Measuring an existing user: seed nothing, delete nothing.
    if (process.env.BENCH_USER_ID) {
      userId = process.env.BENCH_USER_ID
      seeded = false
      return
    }

    userId = randomUUID()
    const accountId = randomUUID()

    await prisma.user.create({
      data: { id: userId, email: `bench-${userId}@example.test`, name: "Bench", timezone: "UTC", baseCurrency: "USD" },
    })
    await prisma.account.create({
      data: {
        id: accountId, userId, name: "Bench Account", broker: "Bench",
        type: "LIVE", status: "ACTIVE", initialBalance: 100000, currency: "USD",
      },
    })
    const setup = await prisma.setup.create({
      data: { userId, name: "Bench Setup", abbreviation: "BENCH", status: "ACTIVE" },
    })

    // Spread over ~2 years so every period bucket (7d..ALL) has data.
    const now = Date.now()
    const rows = Array.from({ length: N_TRADES }, (_, i) => {
      const at    = new Date(now - Math.floor((i / N_TRADES) * 730) * 86_400_000)
      const win   = i % 3 !== 0
      const entry = 100 + (i % 50)
      return {
        userId, accountId, setupId: setup.id,
        symbol: ["EURUSD", "US30", "NAS100", "XAUUSD"][i % 4],
        direction: i % 2 ? "LONG" : "SHORT",
        status: "CLOSED",
        entry, stop: entry * 0.985, target: entry * 1.03, size: 1,
        closePrice: win ? entry * 1.02 : entry * 0.99,
        pnl: win ? 200 : -100,
        rMultiple: win ? 2 : -1,
        date: at, openTime: "09:30", closeTime: "11:00",
        session: ["Asia", "London", "New York", "London Close"][i % 4],
        createdAt: at,
      }
    })
    for (let i = 0; i < rows.length; i += 500) {
      await prisma.trade.createMany({ data: rows.slice(i, i + 500) })
    }
  }, 300_000)

  afterAll(async () => {
    if (!prisma) return
    if (seeded && userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {})
    await prisma.$disconnect()
  })

  it("reports cold vs warm timings", async () => {
    const call = () => getDashboardStats(prisma, userId, { period: "ALL" })
    const n = seeded ? N_TRADES : await prisma.trade.count({ where: { userId } })

    process.env.ANALYTICS_CACHE_ENABLED = "false"
    await call() // warm up connections/plan cache so run 1 is not the outlier
    const off: number[] = []
    for (let i = 0; i < REPS; i++) off.push(await timed(call))

    console.log(`\n── dashboardStats(ALL), ${n} trades, n=${REPS} ──`)
    console.log(`cache OFF  median : ${median(off).toFixed(1)} ms`)

    if (!seeded) {
      // Existing user (possibly production): stay read-only. The cache-on phase
      // would write rows for a real account, so it is the seed run's job.
      console.log("(existing user → read-only, cache-on phase skipped)")
      return
    }

    process.env.ANALYTICS_CACHE_ENABLED = "true"
    await prisma.tradeStatsCache.deleteMany({ where: { userId } })
    const cold = await timed(call)
    const warm: number[] = []
    for (let i = 0; i < REPS; i++) warm.push(await timed(call))

    const rows = await prisma.tradeStatsCache.count({ where: { userId } })

    console.log(`cache cold        : ${cold.toFixed(1)} ms`)
    console.log(`cache WARM median : ${median(warm).toFixed(1)} ms`)
    console.log(`speedup off→warm  : ${(median(off) / median(warm)).toFixed(1)}x`)
    console.log(`cache rows written: ${rows}`)
  }, 300_000)
})

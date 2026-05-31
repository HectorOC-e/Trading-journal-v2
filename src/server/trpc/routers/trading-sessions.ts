import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const tradingSessionsRouter = router({
  log: protectedProcedure
    .input(z.object({
      date:        z.string(),
      session:     z.enum(["London", "New York", "Asia", "London Close"]),
      preMood:     z.number().int().min(1).max(5).optional(),
      energyLevel: z.number().int().min(1).max(5).optional(),
      notes:       z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.tradingSessionLog.upsert({
        where:  { userId_date_session: { userId: ctx.userId, date: new Date(input.date), session: input.session } },
        create: {
          userId:      ctx.userId,
          date:        new Date(input.date),
          session:     input.session,
          preMood:     input.preMood,
          energyLevel: input.energyLevel,
          notes:       input.notes,
        },
        update: {
          preMood:     input.preMood,
          energyLevel: input.energyLevel,
          notes:       input.notes,
        },
      })
    }),

  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.tradingSessionLog.findMany({
        where: { userId: ctx.userId, date: new Date(input.date) },
        orderBy: { createdAt: "asc" },
      })
      return rows.map(r => ({
        ...r,
        date:      (r.date as Date).toISOString().slice(0, 10),
        createdAt: r.createdAt.toISOString(),
      }))
    }),

  moodCorrelation: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch all session logs with mood data
      const sessions = await ctx.prisma.tradingSessionLog.findMany({
        where: { userId: ctx.userId, preMood: { not: null } },
        select: { date: true, session: true, preMood: true },
      })

      if (sessions.length < 10) return null

      // Fetch closed trades for the same user
      const trades = await ctx.prisma.trade.findMany({
        where:  { userId: ctx.userId, status: "CLOSED" },
        select: { date: true, session: true, pnl: true },
      })

      // Group trades by (date, session) for join
      const tradeMap = new Map<string, { wins: number; total: number }>()
      for (const t of trades) {
        const key = `${(t.date as Date).toISOString().slice(0, 10)}::${t.session}`
        const cur = tradeMap.get(key) ?? { wins: 0, total: 0 }
        cur.total++
        if (Number(t.pnl ?? 0) > 0) cur.wins++
        tradeMap.set(key, cur)
      }

      // Buckets: 1-2 = low, 3 = mid, 4-5 = high
      const buckets: Record<"low" | "mid" | "high", { wins: number; total: number }> = {
        low:  { wins: 0, total: 0 },
        mid:  { wins: 0, total: 0 },
        high: { wins: 0, total: 0 },
      }

      for (const s of sessions) {
        const dateKey = (s.date as Date).toISOString().slice(0, 10)
        const key     = `${dateKey}::${s.session}`
        const counts  = tradeMap.get(key)
        if (!counts) continue

        const mood   = s.preMood!
        const bucket = mood <= 2 ? "low" : mood === 3 ? "mid" : "high"
        buckets[bucket].wins  += counts.wins
        buckets[bucket].total += counts.total
      }

      const toRow = (label: string, b: { wins: number; total: number }) => ({
        label,
        sessions: b.total,
        winRate:  b.total > 0 ? parseFloat((b.wins / b.total * 100).toFixed(1)) : null,
      })

      return {
        rows: [
          toRow("Estado ≤ 2 (bajo)", buckets.low),
          toRow("Estado 3 (medio)",  buckets.mid),
          toRow("Estado ≥ 4 (alto)", buckets.high),
        ],
        totalSessions: sessions.length,
      }
    }),
})

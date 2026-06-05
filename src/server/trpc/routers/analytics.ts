import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generateInsights } from "@/domains/analytics/services/insights-engine"

const PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const
type Period = typeof PERIODS[number]

const PeriodInput = z.object({ period: z.enum(PERIODS).default("3M") })

function resolveWindow(period: Period): { from: Date; to: Date } | undefined {
  if (period === "ALL") return undefined
  const to = new Date()
  const from = new Date()
  switch (period) {
    case "7d": from.setDate(to.getDate() - 7); break
    case "1M": from.setMonth(to.getMonth() - 1); break
    case "3M": from.setMonth(to.getMonth() - 3); break
    case "6M": from.setMonth(to.getMonth() - 6); break
    case "1Y": from.setFullYear(to.getFullYear() - 1); break
  }
  return { from, to }
}

export const analyticsRouter = router({
  // "WHAT is happening" — consolidated cross-domain sections.
  overview: protectedProcedure
    .input(PeriodInput)
    .query(async ({ ctx, input }) => {
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period))
      // strip raw payload (only needed by the insights engine / AI) to keep the wire small
      const { raw: _raw, ...sections } = bundle
      void _raw
      return sections
    }),

  // "WHY is it happening" — deterministic cross-domain insights (no LLM).
  insights: protectedProcedure
    .input(PeriodInput)
    .query(async ({ ctx, input }) => {
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period))
      return generateInsights({
        trades:      bundle.raw.trades,
        setups:      bundle.raw.setupsMeta,
        accounts:    bundle.raw.accountsMeta,
        withdrawals: bundle.raw.withdrawals,
      })
    }),
})

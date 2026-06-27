import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generateInsights } from "@/domains/analytics/services/insights-engine"
import { generatePsychologyInsights } from "@/domains/analytics/services/psychology-insights"
import { summarizeInstitutional } from "@/domains/analytics/institutional/institutional-summary"

const PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const
type Period = typeof PERIODS[number]

const PeriodInput = z.object({
  period: z.enum(PERIODS).default("3M"),
  // Fold demo/backtest accounts into the financial sections. Off by default;
  // psychology always counts them regardless.
  includePractice: z.boolean().optional().default(false),
})

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
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period), input.includePractice)
      // strip raw payload (only needed by the insights engine / AI) to keep the wire small
      const { raw: _raw, ...sections } = bundle
      void _raw
      return sections
    }),

  // Institutional metrics (S3) surfaced for ANALIZAR: R distribution, risk ratios
  // (Sortino/Calmar/Kelly) and the equity drawdown curve. Deterministic (P2).
  institutional: protectedProcedure
    .input(PeriodInput)
    .query(async ({ ctx, input }) => {
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period), input.includePractice)
      return summarizeInstitutional(
        bundle.raw.trades.map((t) => ({ rMultiple: t.rMultiple, pnl: t.pnl, date: t.date })),
      )
    }),

  // "WHY is it happening" — deterministic cross-domain insights (no LLM).
  insights: protectedProcedure
    .input(PeriodInput)
    .query(async ({ ctx, input }) => {
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period), input.includePractice)
      return generateInsights({
        trades:      bundle.raw.trades,
        setups:      bundle.raw.setupsMeta,
        accounts:    bundle.raw.accountsMeta,
        withdrawals: bundle.raw.withdrawals,
      })
    }),

  // Psychology Intelligence — behavioural patterns/biases/habits (deterministic).
  psychologyInsights: protectedProcedure
    .input(PeriodInput)
    .query(async ({ ctx, input }) => {
      const bundle = await buildAnalyticsBundle(ctx.userId, ctx.prisma, resolveWindow(input.period))
      // Psychology always counts practice (demo/backtest) accounts: behaviour is real.
      return generatePsychologyInsights(bundle.raw.allTrades)
    }),
})

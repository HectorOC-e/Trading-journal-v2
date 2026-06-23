import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { WeeklyReview } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate } from "@/lib/formulas"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import { loadWeeklyReport, aiMetaOf } from "@/server/services/reviews/report-data"
import { loadReviewInsights, loadReviewAnalytics } from "@/server/services/reviews/review-insights"
import { buildAnalysisPrompt, runReviewAnalysis } from "@/server/services/reviews/review-ai"
import { sendReviewEmail } from "@/server/services/email/send-review"
import { emailFailureMessage } from "@/server/services/email/resend-client"

const WeeklyReviewInput = z.object({
  accountId:        z.string().uuid().optional().nullable(),
  weekLabel:        z.string().min(1),
  weekRange:        z.string().min(1),
  weekStart:        z.string().datetime({ offset: true }).or(z.string().date()),
  weekEnd:          z.string().datetime({ offset: true }).or(z.string().date()),
  tradeCount:       z.number().int().min(0).default(0),
  netPnl:           z.number().default(0),
  winRate:          z.number().min(0).max(100).default(0),
  disciplineScore:  z.number().int().min(0).max(100).default(0),
  executiveSummary: z.string().default(""),
  whatWorked:       z.string().default(""),
  toImprove:        z.string().default(""),
  status:           z.enum(["draft", "submitted"]).default("draft"),
})

type SerializedReview = Omit<
  WeeklyReview,
  "netPnl" | "winRate" | "weekStart" | "weekEnd" | "createdAt" | "updatedAt"
> & {
  netPnl:    number
  winRate:   number
  weekStart: string
  weekEnd:   string
  createdAt: string
  updatedAt: string
}

function serializeReview(r: WeeklyReview): SerializedReview {
  return {
    ...r,
    netPnl:    r.netPnl.toNumber(),
    winRate:   r.winRate.toNumber(),
    weekStart: r.weekStart.toISOString().slice(0, 10),
    weekEnd:   r.weekEnd.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export const weeklyReviewsRouter = router({
  list: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.prisma.weeklyReview.findMany({
        where: {
          userId:    ctx.userId,
          ...(input?.accountId ? { accountId: input.accountId } : {}),
        },
        orderBy: { weekStart: "desc" },
      })
      return reviews.map(serializeReview)
    }),

  getByWeek: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.weeklyReview.findFirst({
        where: { userId: ctx.userId, weekStart: new Date(input.weekStart) },
      })
    ),

  // Visual report for one week (same pattern as monthlyReviews.report): KPIs +
  // deltas vs the prior week, day-by-day P&L trend, best/worst day, discipline,
  // setups, P&L por cuenta, and the saved review narrative if present.
  report: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { report, saved } = await loadWeeklyReport(ctx.prisma, ctx.userId, input.weekStart)
      const analytics = await loadReviewAnalytics(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart })
      return { ...report, ai: aiMetaOf(saved), status: saved?.status ?? "draft", analytics }
    }),

  // Deterministic insight cards for the week (same engine as /analytics).
  insights: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(({ ctx, input }) => loadReviewInsights(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart })),

  // T-XI: AI analysis of the computed weekly report. Persists to the review row
  // (creating a draft when none exists) so it's reused and embeddable in the email.
  generateAnalysis: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const aiCall = await resolveAiCall(ctx.prisma, ctx.userId, "weekly_reviews")
      const candidates = usableCandidates(aiCall)
      if (candidates.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configura un proveedor de IA y su API key en Ajustes → Configuración de IA para generar el análisis.",
        })
      }

      const { report, saved } = await loadWeeklyReport(ctx.prisma, ctx.userId, input.weekStart)
      if (report.kpis.trades === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en esta semana para analizar." })
      }
      const insights = await loadReviewInsights(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart })

      let analysis: string
      try {
        analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(report.weekLabel, "weekly", report, insights))
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al generar el análisis. Inténtalo de nuevo." })
      }
      if (!analysis) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El análisis llegó vacío. Inténtalo de nuevo." })

      const at = new Date()
      if (saved) {
        await ctx.prisma.weeklyReview.update({ where: { id: saved.id }, data: { aiAnalysis: analysis, aiAnalysisAt: at } })
      } else {
        const weekStart = new Date(input.weekStart + "T00:00:00")
        const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
        await ctx.prisma.weeklyReview.create({
          data: {
            userId: ctx.userId,
            weekStart, weekEnd,
            weekLabel: report.weekLabel,
            weekRange: report.weekLabel,
            aiAnalysis: analysis, aiAnalysisAt: at,
            status: "draft",
          },
        })
      }
      return { analysis, at: at.toISOString() }
    }),

  // Manual "send by email" — bypasses quiet-hours/dedupe but requires the master
  // email switch (the click is the opt-in). Cron uses the same service (Phase 4).
  sendEmail: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, email: true, name: true, emailNotifications: true, timezone: true },
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" })

      const { status, error } = await sendReviewEmail({ prisma: ctx.prisma }, user, { kind: "weekly", weekStart: input.weekStart }, { manual: true })
      if (status === "ineligible") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activa los correos en tu perfil para recibir la review." })
      if (status === "empty")      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en esta semana para enviar." })
      if (status === "send_failed") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: emailFailureMessage(error) })
      return { status }
    }),

  create: protectedProcedure
    .input(WeeklyReviewInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.weeklyReview.create({
        data: {
          ...input,
          weekStart: new Date(input.weekStart),
          weekEnd:   new Date(input.weekEnd),
          userId:    ctx.userId,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(WeeklyReviewInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, weekStart, weekEnd, ...rest } = input
      return ctx.prisma.weeklyReview.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
          ...(weekEnd   ? { weekEnd:   new Date(weekEnd)   } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.weeklyReview.delete({ where: { id: input, userId: ctx.userId } })
    ),

  computedDisciplineScore: protectedProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.weekStart)
      const to   = new Date(input.weekEnd)
      to.setDate(to.getDate() + 1) // make end inclusive (discipline-service uses lt: to)
      const result = await computeDisciplineScore(ctx.prisma, ctx.userId, { from, to })
      return {
        score:     result.score,
        breakdown: {
          execution:  result.executionScore,
          learning:   result.learningScore,
          adherence:  result.adherenceScore,
        },
        detail: result.detail,
      }
    }),

  // T-IX-004: Auto pre-fill data for a new weekly review
  prefill: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      weekEnd:   z.string(),
      accountId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId
      const from   = new Date(input.weekStart)
      const to     = new Date(input.weekEnd)
      to.setDate(to.getDate() + 1) // make end inclusive

      const [trades, computedScore] = await Promise.all([
        ctx.prisma.trade.findMany({
          where: {
            userId,
            status: "CLOSED",
            ...(input.accountId ? { accountId: input.accountId } : {}),
            date: { gte: from, lt: to },
          },
          select: { pnl: true, rMultiple: true, setupId: true, tags: true },
        }),
        computeDisciplineScore(ctx.prisma, userId, { from, to }, input.accountId),
      ])

      const tradeCount = trades.length
      const netPnl     = parseFloat(trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0).toFixed(2))
      const wins       = trades.filter(t => isWin({ pnl: Number(t.pnl ?? 0) })).length
      const winRate    = parseFloat(calcWinRate(wins, tradeCount).toFixed(2))

      // Find best and worst setup by total P&L
      const bySetup: Record<string, number> = {}
      for (const t of trades) {
        if (!t.setupId) continue
        bySetup[t.setupId] = (bySetup[t.setupId] ?? 0) + Number(t.pnl ?? 0)
      }
      const setupEntries = Object.entries(bySetup)
      const topSetupId   = setupEntries.length > 0
        ? setupEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
        : null
      const worstSetupId = setupEntries.length > 0
        ? setupEntries.reduce((a, b) => b[1] < a[1] ? b : a)[0]
        : null

      return {
        tradeCount,
        netPnl,
        winRate,
        disciplineScore: computedScore.score ?? 0,
        topSetupId,
        worstSetupId,
      }
    }),

  // Save notes (maps to executiveSummary) and/or finalize. Upserts the weekly review
  // row (auto-first: the row may not exist yet when the report is just an auto-draft).
  saveReview: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      notes:     z.string().max(5000).optional(),
      status:    z.enum(["draft", "submitted"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: { executiveSummary?: string; status?: string } = {}
      if (input.notes !== undefined) data.executiveSummary = input.notes
      if (input.status) data.status = input.status

      const ws = new Date(input.weekStart + "T00:00:00")
      const existing = await ctx.prisma.weeklyReview.findFirst({
        where: { userId: ctx.userId, weekStart: ws },
        select: { id: true },
      })
      if (existing) {
        const row = await ctx.prisma.weeklyReview.update({
          where: { id: existing.id }, data,
          select: { status: true, executiveSummary: true },
        })
        return { status: row.status, notes: row.executiveSummary }
      }
      const we = new Date(ws); we.setDate(ws.getDate() + 6)
      const label = `Semana del ${ws.toLocaleDateString("es", { day: "numeric", month: "short" })}`
      const row = await ctx.prisma.weeklyReview.create({
        data: {
          userId: ctx.userId, weekStart: ws, weekEnd: we, weekLabel: label, weekRange: label,
          executiveSummary: input.notes ?? "", status: input.status ?? "draft",
        },
        select: { status: true, executiveSummary: true },
      })
      return { status: row.status, notes: row.executiveSummary }
    }),
})

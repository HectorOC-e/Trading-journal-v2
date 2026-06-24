import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { MonthlyReview } from "@/lib/generated/prisma/client"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { loadMonthlyReport, aiMetaOf } from "@/server/services/reviews/report-data"
import { loadReviewInsights, loadReviewAnalytics } from "@/server/services/reviews/review-insights"
import { buildAnalysisPrompt, runReviewAnalysis } from "@/server/services/reviews/review-ai"
import { loadMonthlyCardStats } from "@/server/services/reviews/monthly-card-stats"
import { computePillars } from "@/server/services/reviews/pillars"
import { deriveLetterTitle, deriveStructuredThemes, type MonthlyTheme } from "@/server/services/reviews/monthly-letter"
import { evaluateGoal } from "@/server/services/reviews/goal-eval"
import { deriveGrade, deriveVerdict } from "@/server/services/reviews/verdict"
import { sendReviewEmail } from "@/server/services/email/send-review"
import { emailFailureMessage } from "@/server/services/email/resend-client"

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const monthLabelOf = (year: number, month: number) => `${MONTHS_ES[month - 1]} ${year}`

// Override the recursive Prisma `Json` type for keyThemesRich with a concrete shape —
// otherwise tRPC's output inference hits TS2589 ("type instantiation excessively deep").
type SerializedMonthlyReview = Omit<MonthlyReview, "createdAt" | "updatedAt" | "keyThemesRich"> & {
  createdAt: string
  updatedAt: string
  keyThemesRich: MonthlyTheme[] | null
}

function serializeMonthlyReview(r: MonthlyReview): SerializedMonthlyReview {
  return {
    ...r,
    keyThemesRich: (r.keyThemesRich as MonthlyTheme[] | null) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

const MonthlyReviewInput = z.object({
  year:         z.number().int().min(2000).max(2100),
  month:        z.number().int().min(1).max(12),
  summary:      z.string().default(""),
  keyThemes:    z.array(z.string().min(1).max(100)).max(20).default([]),
  goalsSet:     z.array(z.string().min(1).max(200)).max(20).default([]),
  goalsMet:     z.array(z.string().min(1).max(200)).max(20).default([]),
  overallScore: z.number().int().min(0).max(100).optional().nullable(),
  weeklyIds:    z.array(z.string().uuid()).default([]),
})

export const monthlyReviewsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const reviews = await ctx.prisma.monthlyReview.findMany({
        where:   { userId: ctx.userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      })
      const serialized = reviews.map(serializeMonthlyReview)
      // Batched per-month metrics for the "Ediciones" covers.
      const stats = await loadMonthlyCardStats(ctx.prisma, ctx.userId, serialized.map(r => ({ year: r.year, month: r.month })))
      const byKey = new Map(serialized.map(r => [`${r.year}-${r.month}`, r]))
      return serialized.map(r => {
        const s = stats.get(`${r.year}-${r.month}`)
        const netPnl = s?.netPnl ?? 0
        const grade = deriveGrade({ disciplineScore: r.overallScore, winRate: s?.winRate ?? 0, netPnl, profitFactor: s?.profitFactor ?? 0, trades: s?.trades ?? 0 })
        // delta vs the previous calendar month, if that review exists in the list.
        const prevMonth = r.month === 1 ? 12 : r.month - 1
        const prevYear  = r.month === 1 ? r.year - 1 : r.year
        const prev = byKey.get(`${prevYear}-${prevMonth}`)
        const prevNet = prev ? (stats.get(`${prevYear}-${prevMonth}`)?.netPnl ?? 0) : null
        const goalsPct = s && s.goalsTotal > 0 ? Math.round(((s.goalsDone + 0.5 * s.goalsPartial) / s.goalsTotal) * 100) : 0
        return {
          ...r,
          monthLabel: monthLabelOf(r.year, r.month),
          gradeLetter: grade.letter,
          gradeTone: grade.tone,
          netPnl,
          totalR: s?.totalR ?? 0,
          trades: s?.trades ?? 0,
          weeks: s?.weeks ?? [],
          goalsTotal: s?.goalsTotal ?? 0,
          goalsPct,
          deltaPnl: prevNet != null ? parseFloat((netPnl - prevNet).toFixed(2)) : null,
        }
      })
    }),

  get: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.prisma.monthlyReview.findFirst({
        where: { userId: ctx.userId, year: input.year, month: input.month },
      })
      return review ? serializeMonthlyReview(review) : null
    }),

  upsert: protectedProcedure
    .input(MonthlyReviewInput)
    .mutation(async ({ ctx, input }) => {
      const { year, month, ...data } = input
      const review = await ctx.prisma.monthlyReview.upsert({
        where:  { userId_year_month: { userId: ctx.userId, year, month } },
        create: { ...data, year, month, userId: ctx.userId },
        update: data,
      })
      return serializeMonthlyReview(review)
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(MonthlyReviewInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, year: _y, month: _m, ...data } = input
      const review = await ctx.prisma.monthlyReview.update({
        where: { id, userId: ctx.userId },
        data,
      })
      return serializeMonthlyReview(review)
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.monthlyReview.findFirst({
        where: { id: input, userId: ctx.userId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Monthly review not found" })
      }
      await ctx.prisma.monthlyReview.delete({ where: { id: input, userId: ctx.userId } })
      return { ok: true }
    }),

  // Full visual report for a month (trades-based, FX-normalized, deltas vs prev month)
  report: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const { report, saved } = await loadMonthlyReport(ctx.prisma, ctx.userId, input.year, input.month)
      const analytics = await loadReviewAnalytics(ctx.prisma, ctx.userId, { kind: "monthly", year: input.year, month: input.month })

      // "Carta del Gestor" computed slice.
      const pillars = computePillars({
        trades: report.kpis.trades, winRate: report.kpis.winRate, profitFactor: report.kpis.profitFactor,
        expectancy: analytics.expectancy, disciplineScore: report.kpis.disciplineScore, byEmotion: analytics.byEmotion,
      })
      const letterTitle = saved?.letterTitle
        ?? deriveLetterTitle(monthLabelOf(input.year, input.month), { netPnl: report.kpis.netPnl, winRate: report.kpis.winRate, disciplineScore: report.kpis.disciplineScore, trades: report.kpis.trades })
      const themes: MonthlyTheme[] = (saved?.keyThemesRich as MonthlyTheme[] | null) ?? deriveStructuredThemes(report)
      const verdict = deriveVerdict({ aiAnalysis: saved?.aiAnalysis ?? null, netPnl: report.kpis.netPnl, winRate: report.kpis.winRate, disciplineScore: report.kpis.disciplineScore, trades: report.kpis.trades })

      // Goals — stored rows, with a live AI proposal applied to unconfirmed ones (not persisted).
      const goalRows = await ctx.prisma.monthlyGoal.findMany({
        where: { userId: ctx.userId, year: input.year, month: input.month },
        orderBy: { sortOrder: "asc" },
      })
      const goalCtx = { violations: report.discipline.violations, trades: report.kpis.trades, netPnl: report.kpis.netPnl, winRate: report.kpis.winRate }
      const goals = goalRows.map(g => {
        if (g.userConfirmed) return { id: g.id, text: g.text, status: g.status, note: g.note, userConfirmed: true }
        const proposal = evaluateGoal(g.text, goalCtx)
        return { id: g.id, text: g.text, status: proposal?.status ?? g.status, note: proposal?.note ?? g.note, userConfirmed: false }
      })

      return { ...report, ai: aiMetaOf(saved), status: saved?.status ?? "draft", analytics, pillars, letterTitle, themes, verdict, goals }
    }),

  // Deterministic insight cards for the month (same engine as /analytics).
  insights: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(({ ctx, input }) => loadReviewInsights(ctx.prisma, ctx.userId, { kind: "monthly", year: input.year, month: input.month })),

  // Save notes (maps to summary) and/or finalize. Upserts by (userId, year, month)
  // so it works even when the report is just an auto-draft with no saved row yet.
  saveReview: protectedProcedure
    .input(z.object({
      year:   z.number().int().min(2000).max(2100),
      month:  z.number().int().min(1).max(12),
      notes:  z.string().max(5000).optional(),
      status: z.enum(["draft", "submitted"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: { summary?: string; status?: string } = {}
      if (input.notes !== undefined) data.summary = input.notes
      if (input.status) data.status = input.status
      const row = await ctx.prisma.monthlyReview.upsert({
        where:  { userId_year_month: { userId: ctx.userId, year: input.year, month: input.month } },
        create: { userId: ctx.userId, year: input.year, month: input.month, summary: input.notes ?? "", status: input.status ?? "draft" },
        update: data,
        select: { status: true, summary: true },
      })
      return { status: row.status, notes: row.summary }
    }),

  // T-XI: AI analysis of the computed monthly report. Upserts onto the month's review.
  generateAnalysis: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const aiCall = await resolveAiCall(ctx.prisma, ctx.userId, "weekly_reviews")
      const candidates = usableCandidates(aiCall)
      if (candidates.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configura un proveedor de IA y su API key en Ajustes → Configuración de IA para generar el análisis.",
        })
      }

      const { report } = await loadMonthlyReport(ctx.prisma, ctx.userId, input.year, input.month)
      if (report.kpis.trades === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en este mes para analizar." })
      }
      const insights = await loadReviewInsights(ctx.prisma, ctx.userId, { kind: "monthly", year: input.year, month: input.month })

      const periodLabel = `${String(input.month).padStart(2, "0")}/${input.year}`
      let analysis: string
      try {
        analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(periodLabel, "monthly", report, insights))
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al generar el análisis. Inténtalo de nuevo." })
      }
      if (!analysis) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El análisis llegó vacío. Inténtalo de nuevo." })

      const at = new Date()
      await ctx.prisma.monthlyReview.upsert({
        where:  { userId_year_month: { userId: ctx.userId, year: input.year, month: input.month } },
        create: { userId: ctx.userId, year: input.year, month: input.month, aiAnalysis: analysis, aiAnalysisAt: at },
        update: { aiAnalysis: analysis, aiAnalysisAt: at },
      })
      return { analysis, at: at.toISOString() }
    }),

  // Manual "send by email" for the month's review. See weeklyReviews.sendEmail.
  sendEmail: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, email: true, name: true, emailNotifications: true, timezone: true },
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" })

      const { status, error } = await sendReviewEmail({ prisma: ctx.prisma }, user, { kind: "monthly", year: input.year, month: input.month }, { manual: true })
      if (status === "ineligible") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activa los correos en tu perfil para recibir la review." })
      if (status === "empty")      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en este mes para enviar." })
      if (status === "send_failed") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: emailFailureMessage(error) })
      return { status }
    }),

  // Aggregate weekly reviews for the given month to suggest fields
  prefill: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { year, month } = input
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd   = new Date(year, month, 1)   // exclusive

      const weeklyReviews = await ctx.prisma.weeklyReview.findMany({
        where: {
          userId:    ctx.userId,
          weekStart: { gte: monthStart, lt: monthEnd },
        },
        select: {
          id:              true,
          disciplineScore: true,
          whatWorked:      true,
          toImprove:       true,
          netPnl:          true,
          winRate:         true,
          tradeCount:      true,
        },
        orderBy: { weekStart: "asc" },
      })

      if (!weeklyReviews.length) {
        return {
          weeklyIds:    [],
          overallScore: null,
          keyThemes:    [],
          netPnl:       0,
          winRate:      0,
          tradeCount:   0,
        }
      }

      const totalNetPnl   = weeklyReviews.reduce((s, r) => s + r.netPnl.toNumber(), 0)
      const avgWinRate    = weeklyReviews.reduce((s, r) => s + r.winRate.toNumber(), 0) / weeklyReviews.length
      const totalTrades   = weeklyReviews.reduce((s, r) => s + r.tradeCount, 0)
      // Filter disciplineScore > 0: a score of 0 means "unscored/draft" in WeeklyReview, not a real zero.
      const scores        = weeklyReviews.map(r => r.disciplineScore).filter(s => s > 0)
      const avgScore      = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

      // Collect unique whatWorked / toImprove entries as theme suggestions
      const whatWorkedItems = weeklyReviews
        .map(r => r.whatWorked?.trim())
        .filter((s): s is string => Boolean(s))
        .slice(0, 5)

      return {
        weeklyIds:    weeklyReviews.map(r => r.id),
        overallScore: avgScore,
        keyThemes:    whatWorkedItems,
        netPnl:       parseFloat(totalNetPnl.toFixed(2)),
        winRate:      parseFloat(avgWinRate.toFixed(2)),
        tradeCount:   totalTrades,
      }
    }),
})

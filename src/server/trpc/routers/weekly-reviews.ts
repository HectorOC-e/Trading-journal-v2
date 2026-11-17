import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import { ensureWeeklyReviewEnvelope } from "@/server/services/reviews/envelopes"
import { saveReviewModeAnalysis } from "@/server/services/reviews/mode-snapshots"
import { fxFactor,parseFxRates,hasFxConversion } from "@/lib/fx"
import { createReviewCommitment, planReviewPractice, loadReviewFollowUp } from "@/server/services/reviews/continuity"
import { reviewSourceSchema } from "@/domains/learning/review-source"
import { localDateISO, safeTimeZone } from "@/lib/datetime/local"
import { writeReviewText } from "@/server/services/retrieval/review-write"
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { WeeklyReview } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate } from "@/lib/formulas"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import { loadWeeklyReport, aiMetaOf } from "@/server/services/reviews/report-data"
import { scheduleEmbedding } from "@/server/services/retrieval/pipeline"
import { loadWeeklyCardStats } from "@/server/services/reviews/card-stats"
import { loadReviewInsights, loadReviewAnalytics } from "@/server/services/reviews/review-insights"
import { loadReviewsOverview } from "@/server/services/reviews/overview"
import { loadLearningSummary } from "@/server/services/reviews/learning-summary"
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
  createCommitment: protectedProcedure.input(z.object({ id: z.string().uuid(), mode:operationalModeSchema.default("REAL"), source: reviewSourceSchema, insightType: z.enum(["intraday-decay", "revenge-trading", "oversizing", "off-plan"]) })).mutation(({ctx,input}) => createReviewCommitment(ctx.prisma,ctx.userId,input)),
  planPractice: protectedProcedure.input(z.object({ id: z.string().uuid(), mode:operationalModeSchema.default("REAL"), source: reviewSourceSchema, resourceId: z.string().uuid(), date: z.string().date(), plannedMin: z.number().int().min(5).max(480) })).mutation(async ({ctx,input}) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({where:{id:ctx.userId},select:{timezone:true}})
    if(input.date < localDateISO(new Date(),safeTimeZone(user.timezone))) throw new TRPCError({code:"BAD_REQUEST",message:"Elige hoy o una fecha futura."})
    return planReviewPractice(ctx.prisma,ctx.userId,input)
  }),
  followUp: protectedProcedure.input(z.object({weekStart:z.string().date(),mode:operationalModeSchema.default("REAL")})).query(({ctx,input}) => loadReviewFollowUp(ctx.prisma,ctx.userId,input.weekStart,input.mode)),
  list: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional(),mode:operationalModeSchema.default("REAL") }).optional())
    .query(async ({ ctx, input }) => {
      if(input?.accountId)await scopedTradeWhere(ctx.prisma,ctx.userId,{mode:input.mode,accountId:input.accountId,includeArchived:true})
      const reviews = await ctx.prisma.weeklyReview.findMany({
        where: {
          userId:    ctx.userId,
          ...(input?.accountId ? { accountId: input.accountId } : {}),
        },
        orderBy: { weekStart: "desc" },
      })
      const serialized = reviews.map(serializeReview)
      // Batched live metrics per week (one trade query) for the rich cards. Auto-draft
      // rows can carry stale 0s (created before finalize), so the computed P&L/WR/trades
      // override the stored values; discipline stays from the row (set at finalize).
      const stats = await loadWeeklyCardStats(ctx.prisma, ctx.userId, serialized.map(r => r.weekStart),input?.mode ?? "REAL")
      const mode=input?.mode ?? "REAL"
      const snapshots=await ctx.prisma.reviewModeSnapshot.findMany({where:{userId:ctx.userId,kind:"WEEKLY",mode,evidenceHash:{not:""},periodKey:{in:serialized.map(r=>r.weekStart)}},select:{periodKey:true,metrics:true}})
      const scores=new Map(snapshots.map(row=>[row.periodKey,(row.metrics as {disciplineScore?:number}).disciplineScore ?? null]))
      return serialized.map(r => {
        const s = stats.get(r.weekStart)
        return {
          ...r,
          operationalMode:mode, aiAnalysis:null,aiAnalysisAt:null,disciplineScore:scores.get(r.weekStart)??null,
          netPnl:       s?.netPnl ?? 0,
          winRate:      s?.winRate ?? 0,
          tradeCount:   s?.trades ?? 0,
          profitFactor: s?.profitFactor ?? 0,
          avgR:         s?.avgR ?? 0,
          spark:        s?.spark ?? [],
        }
      })
    }),

  // Trayectoria panel for the unified index: per-week grade series + from→to trend
  // stats + recurring-pattern cards. Window = whole history, or the active year/month.
  overview: protectedProcedure
    .input(z.object({ mode:operationalModeSchema.default("REAL"),year: z.number().int().optional(), month: z.number().int().min(1).max(12).optional() }).optional())
    .query(({ ctx, input }) => loadReviewsOverview(ctx.prisma, ctx.userId, input ?? undefined)),

  getByWeek: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .query(async ({ctx,input})=>(await loadWeeklyReport(ctx.prisma,ctx.userId,input.weekStart,input.mode)).saved),

  // Visual report for one week (same pattern as monthlyReviews.report): KPIs +
  // deltas vs the prior week, day-by-day P&L trend, best/worst day, discipline,
  // setups, P&L por cuenta, and the saved review narrative if present.
  report: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .query(async ({ ctx, input }) => {
      const { report, saved, pendingEmotion, scope } = await loadWeeklyReport(ctx.prisma, ctx.userId, input.weekStart,input.mode)
      const analytics = await loadReviewAnalytics(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart, mode:input.mode })
      // Live discipline so the hero/report show a real score even before finalize
      // (auto-draft rows store 0). Only when the week has trades.
      if (report.kpis.trades > 0 && (report.kpis.disciplineScore == null || report.kpis.disciplineScore === 0)) {
        const from = new Date(input.weekStart + "T00:00:00Z")
        const to   = new Date(from); to.setDate(from.getDate() + 7)
        const disc = await computeDisciplineScore(ctx.prisma, ctx.userId, { from, to },undefined,input.mode)
        report.kpis.disciplineScore = disc.score ?? report.kpis.disciplineScore
      }
      // `pendingEmotion` viaja hasta el VM: la semana de la review ES la ventana
      // de 7 días, así que el panel de Psicología puede ofrecer el gesto en vez
      // de una instrucción sin salida.
      return { ...report, scope, userId: ctx.userId, ai: aiMetaOf(saved), status: saved?.status ?? "draft", analytics, pendingEmotion }
    }),

  // Light learning summary for the week (study minutes, streak, repasos).
  learningSummary: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .query(({ ctx, input }) => {
      const from = new Date(input.weekStart + "T00:00:00Z")
      const to   = new Date(from); to.setDate(from.getDate() + 7)
      return loadLearningSummary(ctx.prisma, ctx.userId, { from, to })
    }),

  // Deterministic insight cards for the week (same engine as /analytics).
  insights: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .query(({ ctx, input }) => loadReviewInsights(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart, mode:input.mode })),

  // T-XI: AI analysis of the computed weekly report. Persists to the review row
  // (creating a draft when none exists) so it's reused and embeddable in the email.
  generateAnalysis: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .mutation(async ({ ctx, input }) => {
      const aiCall = await resolveAiCall(ctx.prisma, ctx.userId, "weekly_reviews")
      const candidates = usableCandidates(aiCall)
      if (candidates.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configura un proveedor de IA y su API key en Ajustes → Configuración de IA para generar el análisis.",
        })
      }

      const { report, saved, snapshot, evidenceHash } = await loadWeeklyReport(ctx.prisma, ctx.userId, input.weekStart,input.mode)
      if (report.kpis.trades === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en esta semana para analizar." })
      }
      const insights = await loadReviewInsights(ctx.prisma, ctx.userId, { kind: "weekly", weekStart: input.weekStart, mode:input.mode })

      let analysis: string
      try {
        // "interactive": lo dispara el trader desde la review y espera el resultado.
        analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(`${input.mode} · ${report.weekLabel}`, "weekly", {...report,saved:null}, insights), "interactive")
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al generar el análisis. Inténtalo de nuevo." })
      }
      if (!analysis) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El análisis llegó vacío. Inténtalo de nuevo." })

      if(!saved)await ensureWeeklyReviewEnvelope(ctx.prisma,ctx.userId,input.weekStart)
      return saveReviewModeAnalysis(ctx.prisma,snapshot,evidenceHash,analysis)
    }),

  // Manual "send by email" — bypasses quiet-hours/dedupe but requires the master
  // email switch (the click is the opt-in). Cron uses the same service (Phase 4).
  sendEmail: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, email: true, name: true, emailNotifications: true, timezone: true },
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" })

      const { status, error } = await sendReviewEmail({ prisma: ctx.prisma }, user, { kind: "weekly", weekStart: input.weekStart, mode:input.mode }, { manual: true })
      if (status === "ineligible") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activa los correos en tu perfil para recibir la review." })
      if (status === "empty")      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No hay trades en esta semana para enviar." })
      if (status === "send_failed") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: emailFailureMessage(error) })
      return { status }
    }),

  create: protectedProcedure
    .input(WeeklyReviewInput)
    .mutation(({ ctx, input }) =>
      writeReviewText(ctx.prisma, "weekly_reviews", input.executiveSummary !== undefined, tx => tx.weeklyReview.create({
        data: {
          ...input,
          weekStart: new Date(input.weekStart),
          weekEnd:   new Date(input.weekEnd),
          userId:    ctx.userId,
        },
      }))
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(WeeklyReviewInput.partial().extend({
      // Zod 4 defaults must apply to creates only; PATCH preserves omitted fields.
      tradeCount: WeeklyReviewInput.shape.tradeCount.removeDefault().optional(),
      netPnl: WeeklyReviewInput.shape.netPnl.removeDefault().optional(),
      winRate: WeeklyReviewInput.shape.winRate.removeDefault().optional(),
      disciplineScore: WeeklyReviewInput.shape.disciplineScore.removeDefault().optional(),
      executiveSummary: WeeklyReviewInput.shape.executiveSummary.removeDefault().optional(),
      whatWorked: WeeklyReviewInput.shape.whatWorked.removeDefault().optional(),
      toImprove: WeeklyReviewInput.shape.toImprove.removeDefault().optional(),
      status: WeeklyReviewInput.shape.status.removeDefault().optional(),
    })))
    .mutation(({ ctx, input }) => {
      const { id, weekStart, weekEnd, ...rest } = input
      return writeReviewText(ctx.prisma, "weekly_reviews", input.executiveSummary !== undefined, tx => tx.weeklyReview.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
          ...(weekEnd   ? { weekEnd:   new Date(weekEnd)   } : {}),
        },
      }))
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.weeklyReview.delete({ where: { id: input, userId: ctx.userId } })
    ),

  computedDisciplineScore: protectedProcedure
    .input(z.object({ weekStart: z.string().date(), weekEnd: z.string().date(), mode:operationalModeSchema.default("REAL") }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.weekStart)
      const to   = new Date(input.weekEnd)
      to.setDate(to.getDate() + 1) // make end inclusive (discipline-service uses lt: to)
      const result = await computeDisciplineScore(ctx.prisma, ctx.userId, { from, to },undefined,input.mode)
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
      mode:operationalModeSchema.default("REAL"),
      weekStart: z.string().date(),
      weekEnd:   z.string(),
      accountId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId
      const from   = new Date(input.weekStart)
      const to     = new Date(input.weekEnd)
      to.setDate(to.getDate() + 1) // make end inclusive

      const [tradeRows, computedScore,profile] = await Promise.all([
        ctx.prisma.trade.findMany({
          where: {
            ...await scopedTradeWhere(ctx.prisma,userId,{mode:input.mode,accountId:input.accountId,includeArchived:true}),
            status: "CLOSED",
            ...(input.accountId ? { accountId: input.accountId } : {}),
            date: { gte: from, lt: to },
          },
          select: { pnl: true, rMultiple: true, setupId: true, tags: true, account:{select:{currency:true}} },
        }),
        computeDisciplineScore(ctx.prisma, userId, { from, to }, input.accountId,input.mode),
        ctx.prisma.user.findUnique({where:{id:userId},select:{baseCurrency:true,fxRates:true}}),
      ])

      const base=profile?.baseCurrency ?? "USD",rates=parseFxRates(profile?.fxRates)
      const trades=tradeRows.filter(t=>hasFxConversion(t.account.currency,base,rates)).map(t=>({...t,pnl:Number(t.pnl??0)*fxFactor(t.account.currency,base,rates)}))
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
      mode:operationalModeSchema.default("REAL"),
      weekStart: z.string().date(),
      notes:     z.string().max(5000).optional(),
      status:    z.enum(["draft", "submitted"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: { executiveSummary?: string; status?: string } = {}
      if (input.notes !== undefined) data.executiveSummary = input.notes
      if (input.status) data.status = input.status

      const envelope=await ensureWeeklyReviewEnvelope(ctx.prisma,ctx.userId,input.weekStart)
      const row=await writeReviewText(ctx.prisma,"weekly_reviews",input.notes!==undefined,tx=>tx.weeklyReview.update({
        where:{id:envelope.id,userId:ctx.userId},data,select:{id:true,status:true,executiveSummary:true},
      }))
      if(input.notes!==undefined)scheduleEmbedding(ctx.prisma,ctx.userId,"weekly_reviews",row.id,input.notes)
      return {status:row.status,notes:row.executiveSummary}
    }),
})

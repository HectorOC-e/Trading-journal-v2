import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { WeeklyReview } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate } from "@/lib/formulas"
import { streamChat }        from "@/lib/ai/chat"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import { loadWeeklyReport, aiMetaOf } from "@/server/services/reviews/report-data"
import { buildAnalysisPrompt, runReviewAnalysis } from "@/server/services/reviews/review-ai"
import { sendReviewEmail } from "@/server/services/email/send-review"

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
      return { ...report, ai: aiMetaOf(saved) }
    }),

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

      let analysis: string
      try {
        analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(report.weekLabel, "weekly", report))
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
      if (status === "send_failed") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error ?? "No se pudo enviar el correo." })
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

  // T-IX: Auto-generate weekly review narrative from trade data
  generateSummary: protectedProcedure
    .input(z.object({
      weekStart:  z.string(),
      weekEnd:    z.string(),
      accountId:  z.string().uuid().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve the user's configured provider + key (persisted first, then env).
      const aiCall = await resolveAiCall(ctx.prisma, ctx.userId, "weekly_reviews")
      const candidates = usableCandidates(aiCall)
      if (candidates.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configura un proveedor de IA y su API key en Ajustes → Configuración de IA para generar el resumen.",
        })
      }

      const start = new Date(input.weekStart)
      const end   = new Date(input.weekEnd)

      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId:    ctx.userId,
          status:    "CLOSED",
          date:      { gte: start, lte: end },
          ...(input.accountId ? { accountId: input.accountId } : {}),
        },
        select: {
          symbol: true, direction: true, pnl: true, rMultiple: true,
          tags: true, notes: true, session: true,
          setup: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      })

      if (!trades.length) {
        return {
          executiveSummary: "Sin trades registrados esta semana.",
          whatWorked:       "",
          toImprove:        "",
        }
      }

      const netPnl  = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0)
      const wins    = trades.filter(t => isWin({ pnl: Number(t.pnl ?? 0) })).length
      const winRate = Math.round(calcWinRate(wins, trades.length))
      const tradeLines = trades.slice(0, 15).map(t =>
        `  • ${t.symbol} ${t.direction} ${Number(t.pnl ?? 0) >= 0 ? "+" : ""}$${Number(t.pnl ?? 0).toFixed(2)}` +
        `${t.rMultiple != null ? ` (${Number(t.rMultiple).toFixed(2)}R)` : ""}` +
        `${t.tags.length ? ` [${(t.tags as string[]).join(", ")}]` : ""}` +
        `${t.notes ? ` | "${t.notes.slice(0, 60)}"` : ""}`
      ).join("\n")

      const prompt = `Eres un coach de trading. Basándote en los siguientes trades de la semana, genera un resumen ejecutivo breve (2-3 oraciones), qué funcionó bien, y qué mejorar. Responde SOLO con JSON con las claves: executiveSummary, whatWorked, toImprove.

Trades (${trades.length} total, WR ${winRate}%, P&L neto $${netPnl.toFixed(2)}):
${tradeLines}

JSON:`

      try {
        // Try each usable candidate (primary then fallback); each carries its own
        // provider + model + key resolved from the user's persisted config.
        let stream: ReadableStream<Uint8Array> | null = null
        let streamErr: unknown
        for (const c of candidates) {
          try {
            stream = await streamChat({
              provider: c.provider,
              apiKey:   c.apiKey,
              model:    c.model,
              messages: [{ role: "user", content: prompt }],
            })
            break
          } catch (e) {
            streamErr = e
          }
        }
        if (!stream) throw streamErr ?? new Error("AI stream failed")
        const reader  = stream.getReader()
        const decoder = new TextDecoder()
        let   raw     = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          raw += decoder.decode(value, { stream: true })
        }

        // Extract JSON from response
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error("no JSON in response")
        const parsed = JSON.parse(match[0]) as {
          executiveSummary?: string
          whatWorked?: string
          toImprove?: string
        }
        return {
          executiveSummary: parsed.executiveSummary ?? "",
          whatWorked:       parsed.whatWorked       ?? "",
          toImprove:        parsed.toImprove        ?? "",
        }
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al generar el resumen. Inténtalo de nuevo." })
      }
    }),
})

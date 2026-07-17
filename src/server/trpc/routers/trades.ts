import { z } from "zod"
import { EMOTION_VALUES } from "@/domains/trading/emotions"
import { router, protectedProcedure } from "../init"
import { semanticSearch, backfillEmbeddings } from "@/server/services/trades/embedding-service"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"
import { listTrades, getRuleViolationStats, getEmotionFeedback, getPatternInsights } from "@/server/services/trades/trade-read-service"
import { createTrade, updateTrade, closeTrade, addTradeEvent, deleteTrade, saveTradeChecklistResult } from "@/server/services/trades/trade-write-service"

export type { SerializedTrade } from "@/server/services/trades/serializers"

export const tradesRouter = router({
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
      from:      z.string().optional(),
      to:        z.string().optional(),
      limit:     z.number().int().min(1).max(200).default(50),
      cursor:    z.string().uuid().optional(),
    }).optional())
    .query(({ ctx, input }) => listTrades(ctx.prisma, ctx.userId, input)),

  dashboardStats: protectedProcedure
    .input(z.object({
      accountId:       z.string().uuid().optional(),
      from:            z.string().optional(),
      to:              z.string().optional(),
      period:          z.enum(["7d", "1M", "3M", "6M", "1Y", "ALL"]).optional().default("3M"),
      // Include demo/backtest ("practice") accounts in the financial/performance
      // aggregates. Off by default so unreal money never inflates real stats.
      // Behavioural metrics (discipline) always count practice regardless.
      includePractice: z.boolean().optional().default(false),
    }).optional())
    .query(({ ctx, input }) => getDashboardStats(ctx.prisma, ctx.userId, input)),

  create: protectedProcedure
    .input(z.object({
      accountId:       z.string().uuid(),
      setupId:         z.string().uuid().optional(),
      direction:       z.enum(["LONG", "SHORT"]),
      symbol:          z.string().min(1),
      entry:           z.number(),
      stop:            z.number(),
      target:          z.number(),
      size:            z.number().positive(),
      date:            z.string(),
      openTime:        z.string(),
      session:         z.enum(["London", "New York", "Asia", "London Close"]),
      tags:            z.array(z.string().min(1).max(30)).max(20).default([]),
      notes:           z.string().default(""),
      screenshotUrls:  z.array(z.string()).default([]),
      pnl:             z.number().optional(),
      closePrice:      z.number().optional(),
      closeTime:       z.string().optional(),
      commission:      z.number().optional(),
      status:          z.enum(["OPEN", "CLOSED", "CANCELLED"]).default("OPEN"),
      // Psychology fields (TASK-034)
      emotionBefore:   z.enum(EMOTION_VALUES).optional().nullable(),
      confidenceRating: z.number().int().min(1).max(5).optional().nullable(),
      executionQuality: z.number().int().min(1).max(5).optional().nullable(),
      fomoFlag:        z.boolean().optional(),
      revengeFlag:     z.boolean().optional(),
      // Pre-trade planning field (TASK-074)
      planNotes:       z.string().max(500).optional().nullable(),
      // Capture v3 (Sprint 2, C7 / FREEZE-E1) — all optional, additive.
      riskPct:         z.number().optional().nullable(), // derived client-side via deriveRiskPct (#27)
      maeR:            z.number().optional().nullable(), // max adverse excursion in R (#35)
      mfeR:            z.number().optional().nullable(), // max favorable excursion in R (#35)
      regime:          z.enum(["trend", "range", "volatile"]).optional().nullable(), // E5.C6
    }))
    .mutation(({ ctx, input }) => createTrade(ctx.prisma, ctx.userId, input)),

  update: protectedProcedure
    .input(z.object({
      id:               z.string().uuid(),
      notes:            z.string().optional(),
      tags:             z.array(z.string().min(1).max(30)).max(20).optional(),
      pnl:              z.number().optional(),
      rMultiple:        z.number().optional(),
      screenshotUrls:   z.array(z.string()).optional(),
      entry:            z.number().optional(),
      stop:             z.number().optional(),
      target:           z.number().optional(),
      size:             z.number().optional(),
      session:          z.string().optional(),
      setupId:          z.string().uuid().optional().nullable(),
      // Psychology fields (TASK-034)
      emotionBefore:    z.enum(EMOTION_VALUES).optional().nullable(),
      confidenceRating: z.number().int().min(1).max(5).optional().nullable(),
      executionQuality: z.number().int().min(1).max(5).optional().nullable(),
      fomoFlag:         z.boolean().optional(),
      revengeFlag:      z.boolean().optional(),
      // Pre-trade planning field (TASK-074)
      planNotes:        z.string().max(500).optional().nullable(),
      // Trade-capture v3 (S2) — post-hoc correction of excursions / market regime (#35, E5.C6)
      maeR:             z.number().optional().nullable(),
      mfeR:             z.number().optional().nullable(),
      regime:           z.enum(["trend", "range", "volatile"]).optional().nullable(),
    }))
    .mutation(({ ctx, input }) => updateTrade(ctx.prisma, ctx.userId, input)),

  close: protectedProcedure
    .input(z.object({
      id:         z.string().uuid(),
      closePrice: z.number(),
      closeTime:  z.string().optional(),
      commission: z.number(),
      // Trade-capture v3 (S2) — excursions known at close + market regime (#35, E5.C6)
      maeR:       z.number().optional().nullable(),
      mfeR:       z.number().optional().nullable(),
      regime:     z.enum(["trend", "range", "volatile"]).optional().nullable(),
      // S2/OI-2: the last honest moment to record the entry emotion when it was
      // skipped at open. Never overwrites one already recorded.
      emotionBefore: z.enum(EMOTION_VALUES).optional().nullable(),
    }))
    .mutation(({ ctx, input }) => closeTrade(ctx.prisma, ctx.userId, input)),

  addEvent: protectedProcedure
    .input(z.object({
      tradeId:   z.string().uuid(),
      type:      z.enum(["STOP_MOVE", "TRAIL_STOP", "TAKE_PROFIT_MOVE", "PARTIAL_CLOSE", "SCALE_IN", "NOTE"]),
      price:     z.number().optional(),
      contracts: z.number().optional(),
      notes:     z.string().default(""),
      timestamp: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => addTradeEvent(ctx.prisma, ctx.userId, input)),

  // @deprecated — replaced by dashboardStats (Sprint 1). No callers remain. Kept for type-compatibility only; returns empty result.
  stats: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
    }).optional())
    .query(() => {
      return { total: 0, wins: 0, losses: 0, be: 0, winRate: 0, avgR: 0, netPnl: 0, pnlMonth: 0, expectancy: 0, aplusRate: 0, profitFactor: 0 }
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) => deleteTrade(ctx.prisma, ctx.supabase, ctx.userId, input)),

  ruleViolationStats: protectedProcedure
    .input(z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    }).optional())
    .query(({ ctx, input }) => getRuleViolationStats(ctx.prisma, ctx.userId, input)),

  saveChecklistResult: protectedProcedure
    .input(z.object({
      tradeId:      z.string().uuid(),
      setupId:      z.string().uuid().optional(),
      itemsChecked: z.array(z.string()),
      itemsTotal:   z.number().int().min(0),
    }))
    .mutation(({ ctx, input }) => saveTradeChecklistResult(ctx.prisma, ctx.userId, input)),

  // Emotion incentive (DELTA D10): the trader's historical WR/avgR for a given
  // pre-trade emotion, so capturing it returns value in the moment. Null below the
  // minimum sample (handled in feedbackForEmotion) — no misleading small-n claim.
  emotionFeedback: protectedProcedure
    .input(z.object({ emotion: z.string().min(1) }))
    .query(({ ctx, input }) => getEmotionFeedback(ctx.prisma, ctx.userId, input.emotion)),

  // T-VI-002: Behavioral pattern insights
  patternInsights: protectedProcedure
    .query(({ ctx }) => getPatternInsights(ctx.prisma, ctx.userId)),

  // T-VI-004: Semantic search (pgvector)
  semanticSearch: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      limit: z.number().int().min(1).max(20).default(10),
    }))
    .query(({ ctx, input }) => semanticSearch(ctx.prisma, ctx.userId, { query: input.query, limit: input.limit })),

  // Backfill: embed trade notes that were written before semantic search existed
  // (or before a key was configured). Idempotent — only touches rows whose notes
  // are non-empty and notes_embedding IS NULL. Call repeatedly until remaining=0.
  backfillEmbeddings: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }).optional())
    .mutation(({ ctx, input }) => backfillEmbeddings(ctx.prisma, ctx.userId, input?.limit ?? 200)),
})

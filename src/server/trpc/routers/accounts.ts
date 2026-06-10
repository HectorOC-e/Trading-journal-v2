import { z } from "zod"
import { TRPCError } from "@trpc/server"
import type { Prisma } from "@/lib/generated/prisma/client"
import { router, protectedProcedure } from "../init"
import type { AccountLogPayload } from "@/types"

type RawAccount = Prisma.AccountGetPayload<Record<string, never>>

const ACCOUNT_TYPES = ["PERSONAL", "PROP_FIRM", "DEMO_PERSONAL", "DEMO_PROP", "BACKTEST", "QA"] as const
const ACCOUNT_STATUSES = ["ACTIVE", "PAUSED", "INACTIVE", "LOST"] as const
const PHASES = ["PHASE_1", "PHASE_2", "FUNDED", "NONE"] as const

const AccountInput = z.object({
  name:             z.string().min(1),
  broker:           z.string().min(1),
  type:             z.enum(ACCOUNT_TYPES),
  initialBalance:   z.number().default(0),
  currency:         z.string().default("USD"),
  timezone:         z.string().default("America/New_York"),
  ddDailyPct:       z.number().optional(),
  ddWeeklyPct:      z.number().optional(),
  ddMonthlyPct:     z.number().optional(),
  ddTotalPct:       z.number().optional(),
  targetPct:        z.number().optional(),
  ddModel:          z.enum(["FIXED", "TRAILING"]).optional(),
  phase:            z.enum(PHASES).optional(),
  maxTradesPerDay:  z.number().int().optional(),
  allowedSymbols:   z.array(z.string()).default([]),
  minTradingDays:   z.number().int().optional(),
})

const isPropFirmType = (type: string) => type === "PROP_FIRM" || type === "DEMO_PROP"

function serializeAccount(a: RawAccount) {
  return {
    ...a,
    initialBalance: Number(a.initialBalance),
    ddDailyPct:    a.ddDailyPct  != null ? Number(a.ddDailyPct)  : null,
    ddWeeklyPct:   a.ddWeeklyPct != null ? Number(a.ddWeeklyPct) : null,
    ddMonthlyPct:  a.ddMonthlyPct!= null ? Number(a.ddMonthlyPct): null,
    ddTotalPct:    a.ddTotalPct  != null ? Number(a.ddTotalPct)  : null,
    targetPct:     a.targetPct   != null ? Number(a.targetPct)   : null,
    lockedAt:      a.lockedAt != null ? a.lockedAt.toISOString() : null,
    lastSyncedBalance: a.lastSyncedBalance != null ? Number(a.lastSyncedBalance) : null,
    lastSyncedAt:      a.lastSyncedAt != null ? a.lastSyncedAt.toISOString() : null,
    createdAt:     a.createdAt.toISOString(),
    updatedAt:     a.updatedAt.toISOString(),
  }
}

export const accountsRouter = router({
  list: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.account.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.includeInactive ? {} : { status: { in: ["ACTIVE", "PAUSED"] } }),
        },
        orderBy: { createdAt: "asc" },
      })
      return rows.map(serializeAccount)
    }),

  create: protectedProcedure
    .input(AccountInput)
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.create({
        data: {
          ...input,
          userId: ctx.userId,
          phase: isPropFirmType(input.type) ? (input.phase ?? "PHASE_1") : "NONE",
        },
      })
      const createdPayload: AccountLogPayload = {
        event:          "CREATED",
        initialBalance: Number(account.initialBalance),
        currency:       account.currency,
        name:           account.name,
        type:           account.type,
      }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: account.id, event: "CREATED", payload: createdPayload },
      })
      return serializeAccount(account) // TD-031: serialize Decimal fields
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(AccountInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const account = await ctx.prisma.account.update({ where: { id, userId: ctx.userId }, data })
      return serializeAccount(account) // TD-031
    }),

  changeStatus: protectedProcedure
    .input(z.object({
      id:         z.string().uuid(),
      status:     z.enum(ACCOUNT_STATUSES),
      statusNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.status === "LOST" && !input.statusNote?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Se requiere una nota al marcar la cuenta como PERDIDA" })
      }
      const prev = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.userId },
        select: { status: true },
      })
      const account = await ctx.prisma.account.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { status: input.status, statusNote: input.statusNote ?? "" },
      })
      const changeStatusPayload: AccountLogPayload = {
        event: "STATUS_CHANGE", from: prev.status, to: input.status, note: input.statusNote ?? "",
      }
      await ctx.prisma.accountLog.create({
        data: {
          userId:    ctx.userId,
          accountId: input.id,
          event:     "STATUS_CHANGE",
          payload:   changeStatusPayload,
        },
      })
      return serializeAccount(account) // TD-031
    }),

  // ── HALLAZGO 1B — manual lock / unlock with audit ──────────────────────────
  lock: protectedProcedure
    .input(z.object({
      id:     z.string().uuid(),
      reason: z.string().min(1).max(200).default("MANUAL"),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { locked: true, lockReason: input.reason, lockedAt: new Date() },
      })
      const payload: AccountLogPayload = { event: "LOCKED", reason: input.reason, auto: false }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input.id, event: "LOCKED", payload },
      })
      return serializeAccount(account)
    }),

  unlock: protectedProcedure
    .input(z.object({
      id:   z.string().uuid(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { locked: false, lockReason: "", lockedAt: null },
      })
      const payload: AccountLogPayload = { event: "UNLOCKED", note: input.note ?? "Desbloqueo manual" }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input.id, event: "UNLOCKED", payload },
      })
      return serializeAccount(account)
    }),

  changePhase: protectedProcedure
    .input(z.object({
      id:              z.string().uuid(),
      phase:           z.enum(PHASES),
      note:            z.string().optional(),
      // New rules for the incoming phase (inherit + adjust flow)
      newRules:        z.object({
        initialBalance:  z.number().optional(),
        ddDailyPct:      z.number().optional(),
        ddWeeklyPct:     z.number().optional(),
        ddMonthlyPct:    z.number().optional(),
        ddTotalPct:      z.number().optional(),
        targetPct:       z.number().optional(),
        maxTradesPerDay: z.number().int().optional(),
        minTradingDays:  z.number().int().optional(),
        allowedSymbols:  z.array(z.string()).optional(),
      }).optional(),
      // Whether the system detected the objective was met (false = manual override)
      objectiveMet:    z.boolean().default(false),
      // If not met, user must confirm manually
      manualOverride:  z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.objectiveMet && !input.manualOverride) {
        throw new Error("El objetivo no ha sido alcanzado. Confirma la promoción manual.")
      }
      const prev = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.userId },
      })
      const updateData = {
        phase: input.phase,
        ...(input.newRules ?? {}),
      }
      const account = await ctx.prisma.account.update({
        where: { id: input.id, userId: ctx.userId },
        data:  updateData,
      })
      const phasePayload = {
        event:          "PHASE_CHANGE" as const,
        from:           prev.phase ?? "NONE",
        to:             input.phase,
        note:           input.note ?? "",
        objectiveMet:   input.objectiveMet,
        manualOverride: input.manualOverride,
        prevRules: {
          initialBalance: Number(prev.initialBalance),
          ddDailyPct:     prev.ddDailyPct   != null ? Number(prev.ddDailyPct)   : null,
          ddWeeklyPct:    prev.ddWeeklyPct  != null ? Number(prev.ddWeeklyPct)  : null,
          ddMonthlyPct:   prev.ddMonthlyPct != null ? Number(prev.ddMonthlyPct) : null,
          ddTotalPct:     prev.ddTotalPct   != null ? Number(prev.ddTotalPct)   : null,
          targetPct:      prev.targetPct    != null ? Number(prev.targetPct)    : null,
        },
        newRules: input.newRules ?? null,
      } satisfies AccountLogPayload
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input.id, event: "PHASE_CHANGE", payload: phasePayload },
      })
      return serializeAccount(account) // TD-031
    }),

  archive: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const prev = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input, userId: ctx.userId },
        select: { status: true },
      })
      const account = await ctx.prisma.account.update({
        where: { id: input, userId: ctx.userId },
        data:  { status: "INACTIVE" },
      })
      const archivePayload: AccountLogPayload = { event: "STATUS_CHANGE", from: prev.status, to: "INACTIVE", note: "Archivada" }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input, event: "STATUS_CHANGE", payload: archivePayload },
      })
      return serializeAccount(account) // TD-031
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.account.delete({ where: { id: input, userId: ctx.userId } })
    ),

  syncBalance: protectedProcedure
    .input(z.object({
      accountId:     z.string().uuid(),
      actualBalance: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.accountId, userId: ctx.userId },
        select: { id: true, initialBalance: true },
      })

      const trades = await ctx.prisma.trade.findMany({
        where: { accountId: input.accountId, userId: ctx.userId, status: "CLOSED" },
        select: { pnl: true, date: true },
        orderBy: { date: "asc" },
      })

      const { computeRunningBalance } = await import("@/domains/trading/services/account-service")
      const tradeEquity = computeRunningBalance(
        Number(account.initialBalance),
        trades.map(t => ({
          pnl:  t.pnl != null ? Number(t.pnl) : null,
          date: (t.date as Date).toISOString().slice(0, 10),
        })),
      )

      // Adjustments already applied by previous syncs — the new correction is
      // measured from the *adjusted* equity so repeated syncs don't double-count
      // and the running balance always reconciles to the broker.
      const priorLogs = await ctx.prisma.accountLog.findMany({
        where:  { accountId: input.accountId, userId: ctx.userId, event: "BALANCE_CORRECTION" },
        select: { payload: true },
      })
      const priorAdjustments = priorLogs.reduce((sum, log) => {
        const p = log.payload as { variance?: number }
        return sum + (typeof p.variance === "number" ? p.variance : 0)
      }, 0)

      const currentEquity = tradeEquity + priorAdjustments
      // Incremental adjustment needed to make displayed equity match the broker.
      const variance = input.actualBalance - currentEquity

      const payload: AccountLogPayload = {
        event:    "BALANCE_CORRECTION",
        variance,
        note:     "Manual sync",
      }

      await ctx.prisma.accountLog.create({
        data: {
          userId:    ctx.userId,
          accountId: input.accountId,
          event:     "BALANCE_CORRECTION",
          payload:   payload as object,
        },
      })

      // Remember the broker balance + when, for "última sincronización" display.
      await ctx.prisma.account.update({
        where: { id: input.accountId, userId: ctx.userId },
        data:  { lastSyncedBalance: input.actualBalance, lastSyncedAt: new Date() },
      })

      return {
        computedBalance: parseFloat(currentEquity.toFixed(2)),
        actualBalance:   input.actualBalance,
        variance:        parseFloat(variance.toFixed(2)),
      }
    }),

  getBalanceVariance: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const logs = await ctx.prisma.accountLog.findMany({
        where:   { accountId: input, userId: ctx.userId, event: "BALANCE_CORRECTION" },
        select:  { payload: true },
      })
      const totalVariance = logs.reduce((sum, log) => {
        const p = log.payload as { variance?: number }
        return sum + (typeof p.variance === "number" ? p.variance : 0)
      }, 0)
      return { totalVariance: parseFloat(totalVariance.toFixed(2)) }
    }),
})

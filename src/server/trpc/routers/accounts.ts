import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { AccountLogPayload } from "@/types"

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

export const accountsRouter = router({
  list: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.account.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.includeInactive ? {} : { status: { in: ["ACTIVE", "PAUSED"] } }),
        },
        orderBy: { createdAt: "asc" },
      })
    ),

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
      return account
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(AccountInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.account.update({ where: { id, userId: ctx.userId }, data })
    }),

  changeStatus: protectedProcedure
    .input(z.object({
      id:         z.string().uuid(),
      status:     z.enum(ACCOUNT_STATUSES),
      statusNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.status === "LOST" && !input.statusNote?.trim()) {
        throw new Error("Se requiere una nota al marcar la cuenta como PERDIDA")
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
      return account
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
      const phasePayload: AccountLogPayload = {
        event:          "PHASE_CHANGE",
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
        } as Record<string, unknown>,
        newRules: (input.newRules as Record<string, unknown>) ?? null,
      }
      // Prisma's InputJsonValue doesn't accept Record<string, unknown> structurally; cast is safe at runtime
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input.id, event: "PHASE_CHANGE", payload: phasePayload as never },
      })
      return account
    }),

  archive: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.update({
        where: { id: input, userId: ctx.userId },
        data:  { status: "INACTIVE" },
      })
      const archivePayload: AccountLogPayload = { event: "STATUS_CHANGE", from: account.status, to: "INACTIVE", note: "Archivada" }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input, event: "STATUS_CHANGE", payload: archivePayload },
      })
      return account
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.account.delete({ where: { id: input, userId: ctx.userId } })
    ),
})

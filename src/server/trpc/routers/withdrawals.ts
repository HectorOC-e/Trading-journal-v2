import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { AccountLogPayload } from "@/types"

const WithdrawalStatus = z.enum(["SOLICITADO", "EN_PROCESO", "PAGADO", "RECHAZADO"])

export const withdrawalsRouter = router({
  list: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.withdrawal.findMany({
        where: {
          userId:    ctx.userId,
          accountId: input?.accountId,
        },
        include: { account: { select: { name: true, currency: true } } },
        orderBy: { date: "desc" },
      })
    ),

  create: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      amount:    z.number().positive(),
      currency:  z.string().default("USD"),
      date:      z.string(), // ISO date string
      note:      z.string().default(""),
      reference: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const withdrawal = await ctx.prisma.withdrawal.create({
        data: {
          userId:    ctx.userId,
          accountId: input.accountId,
          amount:    input.amount,
          currency:  input.currency,
          date:      new Date(input.date),
          note:      input.note,
          reference: input.reference,
          status:    "SOLICITADO",
        },
      })
      const withdrawalPayload: AccountLogPayload = {
        event: "WITHDRAWAL", amount: input.amount, currency: input.currency,
        status: "SOLICITADO", withdrawalId: withdrawal.id, reference: input.reference || undefined,
      }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: input.accountId, event: "WITHDRAWAL", payload: withdrawalPayload },
      })
      return withdrawal
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id:        z.string().uuid(),
      status:    WithdrawalStatus,
      reference: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const withdrawal = await ctx.prisma.withdrawal.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { status: input.status, reference: input.reference ?? undefined },
      })
      const withdrawalStatusPayload: AccountLogPayload = {
        event: "WITHDRAWAL_STATUS", withdrawalId: input.id, status: input.status,
        reference: input.reference,
      }
      await ctx.prisma.accountLog.create({
        data: { userId: ctx.userId, accountId: withdrawal.accountId, event: "WITHDRAWAL_STATUS", payload: withdrawalStatusPayload },
      })
      return withdrawal
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.withdrawal.delete({ where: { id: input, userId: ctx.userId } })
    ),
})

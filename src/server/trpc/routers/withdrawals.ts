import { z } from "zod"
import { router, protectedProcedure, dashboardMutation } from "../init"
import { createWithdrawal, changeWithdrawalStatus, deleteWithdrawal } from "@/server/services/accounts/withdrawal-service"

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

  create: dashboardMutation
    .input(z.object({
      requestId: z.string().uuid().optional(),
      accountId: z.string().uuid(),
      amount: z.number().positive().max(9999999999.99).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-5, 'El monto admite hasta dos decimales'),
      currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('USD'),
      date: z.string().date(),
      note: z.string().max(5000).default(''),
      reference: z.string().max(500).default(''),
    }))
    .mutation(({ctx,input}) => createWithdrawal(ctx.prisma, ctx.userId, input)),
  updateStatus: dashboardMutation
    .input(z.object({id: z.string().uuid(), status: WithdrawalStatus, reference: z.string().max(500).optional()}))
    .mutation(({ctx,input}) => changeWithdrawalStatus(ctx.prisma, ctx.userId, input)),
  delete: dashboardMutation
    .input(z.string().uuid())
    .mutation(({ctx,input}) => deleteWithdrawal(ctx.prisma, ctx.userId, input)),
})

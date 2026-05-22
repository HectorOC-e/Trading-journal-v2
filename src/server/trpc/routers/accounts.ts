import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const accountsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.account.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "asc" },
    })
  ),

  create: protectedProcedure
    .input(z.object({
      name:           z.string().min(1),
      broker:         z.string().min(1),
      type:           z.enum(["PERSONAL", "PROP_FIRM", "DEMO", "QA"]),
      initialBalance: z.number().default(0),
      currency:       z.string().default("USD"),
      timezone:       z.string().default("America/New_York"),
      pfMaxDrawdownPct:   z.number().optional(),
      pfDailyLossPct:     z.number().optional(),
      pfMaxTradesPerDay:  z.number().optional(),
      pfTargetPct:        z.number().optional(),
      pfAllowedSymbols:   z.array(z.string()).default([]),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.account.create({ data: { ...input, userId: ctx.userId } })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.account.update({ where: { id, userId: ctx.userId }, data })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.account.delete({ where: { id: input, userId: ctx.userId } })
    ),
})

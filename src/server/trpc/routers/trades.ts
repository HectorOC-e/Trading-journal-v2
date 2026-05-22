import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const tradesRouter = router({
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
      from:      z.string().optional(), // ISO date
      to:        z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.accountId && { accountId: input.accountId }),
          ...(input?.setupId   && { setupId: input.setupId }),
          ...(input?.from || input?.to ? {
            date: {
              ...(input.from && { gte: new Date(input.from) }),
              ...(input.to   && { lte: new Date(input.to) }),
            }
          } : {}),
        },
        include: { account: true, setup: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      })
    }),

  create: protectedProcedure
    .input(z.object({
      accountId:  z.string().uuid(),
      setupId:    z.string().uuid().optional(),
      direction:  z.enum(["LONG", "SHORT"]),
      symbol:     z.string().min(1),
      entry:      z.number(),
      stop:       z.number(),
      target:     z.number(),
      size:       z.number().positive(),
      date:       z.string(), // ISO date
      openTime:   z.string(), // HH:MM
      session:    z.enum(["London", "New York", "Asia", "London Close"]),
      tags:       z.array(z.string()).default([]),
      notes:      z.string().default(""),
      rMultiple:  z.number().optional(),
      pnl:        z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.trade.create({
        data: { ...input, userId: ctx.userId, date: new Date(input.date) },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id:    z.string().uuid(),
      notes: z.string().optional(),
      tags:  z.array(z.string()).optional(),
      pnl:   z.number().optional(),
      rMultiple: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.trade.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.trade.delete({ where: { id: input, userId: ctx.userId } })
    }),
})

import { z } from "zod"
import { router, protectedProcedure } from "../init"

const SetupInput = z.object({
  name:             z.string().min(1),
  abbreviation:     z.string().min(1).max(4),
  market:           z.string().default(""),
  direction:        z.enum(["LONG", "SHORT", "AMBAS"]).default("AMBAS"),
  status:           z.enum(["ACTIVO", "PAUSADO"]).default("ACTIVO"),
  description:      z.string().default(""),
  color:            z.string().default("#4f6ef7"),
  aplusChecklist:   z.array(z.string()).default([]),
  standardChecklist: z.array(z.string()).default([]),
})

export const setupsRouter = router({
  list: protectedProcedure
    .input(z.object({
      market: z.string().optional(),
      status: z.enum(["ACTIVO", "PAUSADO"]).optional(),
    }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.setup.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.market ? { market: input.market } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      })
    ),

  create: protectedProcedure
    .input(SetupInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.create({
        data: { ...input, userId: ctx.userId },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(SetupInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.setup.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  toggleStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(["ACTIVO", "PAUSADO"]) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { status: input.status },
      })
    ),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.delete({ where: { id: input, userId: ctx.userId } })
    ),
})

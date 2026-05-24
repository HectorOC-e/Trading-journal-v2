import { z } from "zod"
import { router, protectedProcedure } from "../init"

const RESOURCE_TYPES = [
  "LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA",
] as const

const LearningResourceInput = z.object({
  title:           z.string().min(1),
  type:            z.enum(RESOURCE_TYPES),
  author:          z.string().default(""),
  source:          z.string().default(""),
  date:            z.string().date(),
  notes:           z.string().default(""),
  tags:            z.array(z.string()).default([]),
  markedForReview: z.boolean().default(false),
  progressPct:     z.number().int().min(0).max(100).optional().nullable(),
})

function serializeResource(r: {
  date:      Date | string
  createdAt: Date | string
  updatedAt: Date | string
  [key: string]: unknown
}) {
  return {
    ...r,
    date:      r.date      instanceof Date ? r.date.toISOString().slice(0, 10) : (r.date as string),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : (r.createdAt as string),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : (r.updatedAt as string),
  }
}

export const learningResourcesRouter = router({
  list: protectedProcedure
    .input(z.object({
      type:            z.enum(RESOURCE_TYPES).optional(),
      markedForReview: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const resources = await ctx.prisma.learningResource.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.type            ? { type: input.type }                         : {}),
          ...(input?.markedForReview !== undefined
            ? { markedForReview: input.markedForReview }
            : {}),
        },
        orderBy: { date: "desc" },
      })
      return resources.map(serializeResource)
    }),

  create: protectedProcedure
    .input(LearningResourceInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.learningResource.create({
        data: { ...input, date: new Date(input.date), userId: ctx.userId },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(LearningResourceInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, date, ...rest } = input
      return ctx.prisma.learningResource.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(date ? { date: new Date(date) } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.learningResource.delete({ where: { id: input, userId: ctx.userId } })
    ),

  toggleMarkedForReview: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id: input, userId: ctx.userId },
        select: { markedForReview: true },
      })
      return ctx.prisma.learningResource.update({
        where: { id: input, userId: ctx.userId },
        data:  { markedForReview: !resource.markedForReview },
      })
    }),
})

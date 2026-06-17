import { z } from "zod"
import { router, protectedProcedure } from "../init"

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const
const CATEGORIES = ["Cuenta", "Reglas", "Reviews", "Aprendizaje", "Trading", "Sistema"] as const

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        cursor:    z.string().uuid().nullish(),
        limit:     z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
        includeArchived: z.boolean().default(false),
        category:  z.enum(CATEGORIES).optional(),
        priority:  z.enum(PRIORITIES).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      const rows = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.includeArchived ? {} : { archivedAt: null }),
          ...(input?.unreadOnly ? { readAt: null } : {}),
          ...(input?.category ? { category: input.category } : {}),
          ...(input?.priority ? { priority: input.priority } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })
      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
    }),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.count({
      where: { userId: ctx.userId, readAt: null, archivedAt: null },
    }),
  ),

  markRead: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.notification.updateMany({
        where: { id: input, userId: ctx.userId, readAt: null },
        data:  { readAt: new Date() },
      }),
    ),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null, archivedAt: null },
      data:  { readAt: new Date() },
    }),
  ),

  archive: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.notification.updateMany({
        where: { id: input, userId: ctx.userId },
        data:  { archivedAt: new Date(), readAt: new Date() },
      }),
    ),

  preferences: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.notificationPreference.findMany({ where: { userId: ctx.userId } }),
    ),

    update: protectedProcedure
      .input(
        z.object({
          category:    z.enum(CATEGORIES),
          channels:    z.array(z.string()).optional(),
          minPriority: z.enum(PRIORITIES).optional(),
          muted:       z.boolean().optional(),
          quietStart:  z.string().regex(/^\d{2}:\d{2}$/).nullish(),
          quietEnd:    z.string().regex(/^\d{2}:\d{2}$/).nullish(),
          timezone:    z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { category, ...rest } = input
        return ctx.prisma.notificationPreference.upsert({
          where:  { userId_category: { userId: ctx.userId, category } },
          create: { userId: ctx.userId, category, ...rest },
          update: rest,
        })
      }),
  }),
})

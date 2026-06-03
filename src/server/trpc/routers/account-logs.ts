import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const accountLogsRouter = router({
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      cursor:    z.string().uuid().optional(),
      limit:     z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { accountId, cursor, limit } = input

      const items = await ctx.prisma.accountLog.findMany({
        where: {
          accountId,
          userId: ctx.userId,
        },
        orderBy: { createdAt: "desc" },
        take:    limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      const hasMore    = items.length > limit
      const page       = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore ? page[page.length - 1].id : null

      return {
        items: page.map(log => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
        nextCursor,
      }
    }),
})

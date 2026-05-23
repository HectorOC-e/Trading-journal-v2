import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const accountLogsRouter = router({
  list: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.prisma.accountLog.findMany({
        where: { accountId: input.accountId, userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    ),
})

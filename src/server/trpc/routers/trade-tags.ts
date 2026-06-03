// TASK-051: Custom tag management via tRPC.
// Tags are stored as String[] on the Trade model — there is no separate Tag table.
// Operations use Prisma raw queries to manipulate array elements efficiently.

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"

export const tradeTagsRouter = router({
  // Returns all unique tags the user has ever used, sorted by usage count desc
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) AS tag, COUNT(*) AS count
        FROM trades
        WHERE user_id = ${ctx.userId}::uuid
        GROUP BY tag
        ORDER BY count DESC
      `
      return rows.map(r => ({ tag: r.tag, count: Number(r.count) }))
    }),

  // Rename a tag across all trades
  rename: protectedProcedure
    .input(z.object({ oldTag: z.string().min(1), newTag: z.string().min(1).max(30) }))
    .mutation(async ({ ctx, input }) => {
      if (input.oldTag === input.newTag) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El nuevo nombre es igual al actual" })
      }
      await ctx.prisma.$executeRaw`
        UPDATE trades
        SET tags = array_replace(tags, ${input.oldTag}, ${input.newTag})
        WHERE user_id = ${ctx.userId}::uuid
          AND tags @> ARRAY[${input.oldTag}]::text[]
      `
      return { ok: true }
    }),

  // Remove a tag from all trades
  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$executeRaw`
        UPDATE trades
        SET tags = array_remove(tags, ${input})
        WHERE user_id = ${ctx.userId}::uuid
          AND tags @> ARRAY[${input}]::text[]
      `
      return { ok: true }
    }),

  // Merge survivingTag and dyingTag: replace all occurrences of dyingTag with survivingTag, then remove dyingTag
  merge: protectedProcedure
    .input(z.object({ dyingTag: z.string().min(1), survivingTag: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.dyingTag === input.survivingTag) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Los tags son iguales" })
      }
      await ctx.prisma.$executeRaw`
        UPDATE trades
        SET tags = array_remove(array_replace(tags, ${input.dyingTag}, ${input.survivingTag}), ${input.dyingTag})
        WHERE user_id = ${ctx.userId}::uuid
          AND tags @> ARRAY[${input.dyingTag}]::text[]
      `
      return { ok: true }
    }),
})

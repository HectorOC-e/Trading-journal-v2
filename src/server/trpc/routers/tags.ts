import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { ensureTagsSeeded } from "@/server/services/tags/seed"

const DISPLAY_MODES = ["icon_color", "dot", "text"] as const

export const tagsRouter = router({
  // Tag metadata + usage count per tag.
  list: protectedProcedure.query(async ({ ctx }) => {
    const [tags, counts] = await Promise.all([
      ctx.prisma.tag.findMany({
        where:   { userId: ctx.userId },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
      ctx.prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) AS tag, COUNT(*) AS count
        FROM trades WHERE user_id = ${ctx.userId}::uuid GROUP BY tag
      `,
    ])
    const byName = new Map(counts.map((c) => [c.tag, Number(c.count)]))
    return tags.map((t) => ({ ...t, count: byName.get(t.name) ?? 0 }))
  }),

  ensureSeeded: protectedProcedure.mutation(({ ctx }) => ensureTagsSeeded(ctx.prisma, ctx.userId)),

  create: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(40),
      color:       z.string().optional(),
      icon:        z.string().nullish(),
      description: z.string().optional(),
      category:    z.string().optional(),
      displayMode: z.enum(DISPLAY_MODES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.tag.findUnique({
        where: { userId_name: { userId: ctx.userId, name: input.name } },
        select: { id: true },
      })
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una etiqueta con ese nombre" })
      return ctx.prisma.tag.create({ data: { ...input, icon: input.icon ?? null, userId: ctx.userId } })
    }),

  // Appearance/metadata only — never the name (use rename for that).
  update: protectedProcedure
    .input(z.object({
      id:          z.string().uuid(),
      color:       z.string().optional(),
      icon:        z.string().nullish(),
      description: z.string().optional(),
      category:    z.string().optional(),
      displayMode: z.enum(DISPLAY_MODES).optional(),
      sortOrder:   z.number().int().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.tag.update({ where: { id, userId: ctx.userId }, data })
    }),

  // Rename across trades + metadata, in one transaction. Blocked for system tags.
  rename: protectedProcedure
    .input(z.object({ oldName: z.string().min(1), newName: z.string().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      if (input.oldName === input.newName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El nuevo nombre es igual al actual" })
      }
      const tag = await ctx.prisma.tag.findUnique({ where: { userId_name: { userId: ctx.userId, name: input.oldName } } })
      if (tag?.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "No se puede renombrar una etiqueta de sistema" })
      const clash = await ctx.prisma.tag.findUnique({ where: { userId_name: { userId: ctx.userId, name: input.newName } }, select: { id: true } })
      if (clash) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una etiqueta con ese nombre; usa fusionar" })

      await ctx.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE trades SET tags = array_replace(tags, ${input.oldName}, ${input.newName})
          WHERE user_id = ${ctx.userId}::uuid AND tags @> ARRAY[${input.oldName}]::text[]
        `
        if (tag) await tx.tag.update({ where: { id: tag.id }, data: { name: input.newName } })
      })
      return { ok: true }
    }),

  // Replace dying→survivor across trades + drop the dying tag's metadata.
  merge: protectedProcedure
    .input(z.object({ dying: z.string().min(1), survivor: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.dying === input.survivor) throw new TRPCError({ code: "BAD_REQUEST", message: "Las etiquetas son iguales" })
      const dyingTag = await ctx.prisma.tag.findUnique({ where: { userId_name: { userId: ctx.userId, name: input.dying } } })
      if (dyingTag?.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "No se puede fusionar una etiqueta de sistema" })

      await ctx.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE trades
          SET tags = array_remove(array_replace(tags, ${input.dying}, ${input.survivor}), ${input.dying})
          WHERE user_id = ${ctx.userId}::uuid AND tags @> ARRAY[${input.dying}]::text[]
        `
        if (dyingTag) await tx.tag.delete({ where: { id: dyingTag.id } })
      })
      return { ok: true }
    }),

  // Remove the tag from all trades + delete metadata. Blocked for system tags.
  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({ where: { id: input, userId: ctx.userId } })
      if (!tag) throw new TRPCError({ code: "NOT_FOUND", message: "Etiqueta no encontrada" })
      if (tag.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar una etiqueta de sistema" })

      await ctx.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE trades SET tags = array_remove(tags, ${tag.name})
          WHERE user_id = ${ctx.userId}::uuid AND tags @> ARRAY[${tag.name}]::text[]
        `
        await tx.tag.delete({ where: { id: tag.id } })
      })
      return { ok: true }
    }),

  // Persist a new ordering (sortOrder = position).
  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.ids.map((id, i) =>
          ctx.prisma.tag.updateMany({ where: { id, userId: ctx.userId }, data: { sortOrder: i } }),
        ),
      )
      return { ok: true }
    }),
})

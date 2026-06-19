import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { router, protectedProcedure } from "../init"
import { parsePaletteConfig } from "@/lib/theme/parse"
import type { PaletteConfig } from "@/lib/theme/types"

// Per-user library of saved palettes. config is validated/normalized server-side
// via parsePaletteConfig. Selection lives in user_preferences.color_theme as
// "custom:<id>". See spec 2026-06-19-theme-palettes-design.md.

export const MAX_CUSTOM_PALETTES = 10

// Loose schema — the real validation is parsePaletteConfig (clamps ranges).
const configInput = z.object({
  hue:       z.number(),
  chroma:    z.number().optional(),
  accentL:   z.number().optional(),
  accentC:   z.number().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
})

function normalize(config: unknown): PaletteConfig {
  const parsed = parsePaletteConfig(config)
  if (!parsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Configuración de paleta inválida" })
  return parsed
}

function shape(row: { id: string; name: string; config: unknown; position: number }) {
  return { id: row.id, name: row.name, config: (parsePaletteConfig(row.config) ?? { hue: 264 }), position: row.position }
}

export const customPalettesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.customPalette.findMany({
      where:   { userId: ctx.userId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    })
    return rows.map(shape)
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(40), config: configInput }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.prisma.customPalette.count({ where: { userId: ctx.userId } })
      if (count >= MAX_CUSTOM_PALETTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Alcanzaste el máximo de ${MAX_CUSTOM_PALETTES} paletas. Elimina una para crear otra.`,
        })
      }
      const row = await ctx.prisma.customPalette.create({
        data: { userId: ctx.userId, name: input.name.trim(), config: normalize(input.config) as unknown as Prisma.InputJsonValue, position: count },
      })
      return shape(row)
    }),

  update: protectedProcedure
    .input(z.object({
      id:     z.string().uuid(),
      name:   z.string().min(1).max(40).optional(),
      config: configInput.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.customPalette.findFirst({ where: { id: input.id, userId: ctx.userId }, select: { id: true } })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Paleta no encontrada" })
      const data: { name?: string; config?: Prisma.InputJsonValue } = {}
      if (input.name !== undefined)   data.name = input.name.trim()
      if (input.config !== undefined) data.config = normalize(input.config) as unknown as Prisma.InputJsonValue
      const row = await ctx.prisma.customPalette.update({ where: { id: input.id }, data })
      return shape(row)
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.prisma.customPalette.findFirst({ where: { id: input, userId: ctx.userId }, select: { id: true } })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Paleta no encontrada" })
      await ctx.prisma.customPalette.delete({ where: { id: input } })
      return { ok: true }
    }),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.ids.map((id, i) =>
          ctx.prisma.customPalette.updateMany({ where: { id, userId: ctx.userId }, data: { position: i } }),
        ),
      )
      return { ok: true }
    }),
})

import { z } from "zod"
import { router, protectedProcedure } from "../init"

const SEVERITIES = ["CRÍTICA", "MENOR", "INFORMACIÓN"] as const

const RuleInput = z.object({
  name:        z.string().min(1),
  description: z.string().default(""),
  severity:    z.enum(SEVERITIES).default("CRÍTICA"),
  enabled:     z.boolean().default(true),
})

const SYSTEM_DEFAULTS = [
  { name: "Operar fuera de sesión",      description: "Trade abierto fuera de las killzones permitidas.",                       severity: "CRÍTICA"     as const, isSystem: true },
  { name: "Exceder máximo de trades",    description: "Más trades en un día del límite de la cuenta.",                          severity: "CRÍTICA"     as const, isSystem: true },
  { name: "Pérdida diaria sobre límite", description: "La pérdida del día superó el límite diario configurado.",                severity: "CRÍTICA"     as const, isSystem: true },
  { name: "Operar símbolo no permitido", description: "Se operó un instrumento fuera de la lista permitida.",                   severity: "CRÍTICA"     as const, isSystem: true },
  { name: "Promediar en pérdida",        description: "Agregar posición a un trade en pérdida para bajar el precio promedio.",  severity: "CRÍTICA"     as const, isSystem: false },
  { name: "Operar en noticias",          description: "Abrir trade 15 min antes o durante publicación de noticia de alto impacto.", severity: "CRÍTICA" as const, isSystem: false },
  { name: "Sin checklist completado",    description: "Abrir trade sin haber marcado todos los ítems del checklist del setup.", severity: "MENOR"       as const, isSystem: false },
  { name: "Trade de venganza",           description: "Abrir trade inmediatamente tras pérdida sin pausa mínima de 15 minutos.", severity: "MENOR"      as const, isSystem: false },
]

export const rulesRouter = router({
  list: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.rule.findMany({
        where:   { userId: ctx.userId },
        orderBy: [{ isSystem: "desc" }, { severity: "asc" }, { name: "asc" }],
      })
    ),

  create: protectedProcedure
    .input(RuleInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.create({
        data: { ...input, isSystem: false, userId: ctx.userId },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(RuleInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.rule.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { enabled: input.enabled },
      })
    ),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.delete({ where: { id: input, userId: ctx.userId } })
    ),

  seedDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const existing = await ctx.prisma.rule.count({ where: { userId: ctx.userId } })
      if (existing > 0) return { seeded: false }
      await ctx.prisma.rule.createMany({
        data: SYSTEM_DEFAULTS.map(d => ({ ...d, enabled: true, userId: ctx.userId })),
        skipDuplicates: true,
      })
      return { seeded: true }
    }),
})

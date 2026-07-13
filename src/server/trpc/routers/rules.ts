import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { TRIGGERS, PRE_TRIGGERS, type ConditionNode, type Trigger, type RuleAction } from "@/domains/rules/types"
import { TEMPLATES } from "@/domains/rules/templates"
import { ruleDataFromExecutableInput, ruleDataFromTemplate } from "@/domains/rules/rule-write"
import type { RuleMode } from "@/domains/rules/unification"

const SEVERITIES = ["CRÍTICA", "MENOR", "INFORMACIÓN"] as const

const RuleInput = z.object({
  name:        z.string().min(1),
  description: z.string().default(""),
  severity:    z.enum(SEVERITIES).default("CRÍTICA"),
  enabled:     z.boolean().default(true),
})

// ── Executable input (moved from the retired automations router) ────────────
const cmp = z.enum(["gt", "gte", "lt", "lte", "eq", "neq", "contains", "in"])
const conditionValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
const leaf = z.object({ field: z.string().min(1), cmp, value: conditionValue })

// Recursive condition tree (AND/OR/NOT + leaf + {} = always).
const conditionNode: z.ZodType<ConditionNode> = z.lazy(() =>
  z.union([
    z.object({ op: z.enum(["and", "or"]), children: z.array(conditionNode) }),
    z.object({ op: z.literal("not"), child: conditionNode }),
    leaf,
    z.object({}).strict(),
  ]),
)

const ACTION_TYPES = ["NOTIFY", "CRITICAL_ALERT", "ADD_TAG", "REMOVE_TAG", "BLOCK", "CREATE_REMINDER"] as const
const action = z.object({ type: z.enum(ACTION_TYPES), params: z.record(z.string(), z.unknown()).optional() })

const triggerEnum = z.enum(TRIGGERS as [string, ...string[]])

const executableInput = z.object({
  name:        z.string().min(1).max(80),
  description: z.string().max(280).default(""),
  trigger:     triggerEnum,
  conditions:  conditionNode,
  actions:     z.array(action).min(1),
  category:    z.string().max(60).default(""),
  priority:    z.number().int().min(0).max(3).default(0),
  enabled:     z.boolean().default(true),
}).refine(
  (r) => !r.actions.some((a) => a.type === "BLOCK") || PRE_TRIGGERS.includes(r.trigger as never),
  { message: "La acción 'Bloquear operación' solo es válida en triggers pre-trade", path: ["actions"] },
)

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

// Serialización plana a mano: las columnas Json (conditions/actions) con el tipo
// recursivo Prisma.JsonValue tumban la inferencia de tRPC+React Query (TS2589)
// en los call sites; mapear a un shape explícito la corta de raíz.
function serializeRule(r: {
  id: string; name: string; description: string; severity: string; isSystem: boolean
  enabled: boolean; mode: string; trigger: string | null; conditions: unknown; actions: unknown
  priority: number; category: string; sourceAutomationId: string | null
  sourceCommitmentId: string | null; sourceInsightId: string | null
  lastFiredAt: Date | null; createdAt: Date; updatedAt: Date
}) {
  return {
    id: r.id, name: r.name, description: r.description, severity: r.severity,
    isSystem: r.isSystem, enabled: r.enabled,
    mode: r.mode as RuleMode,
    trigger: (r.trigger ?? null) as Trigger | null,
    conditions: (r.conditions ?? {}) as ConditionNode,
    actions: ((r.actions ?? []) as RuleAction[]),
    priority: r.priority, category: r.category,
    sourceAutomationId: r.sourceAutomationId,
    sourceCommitmentId: r.sourceCommitmentId,
    sourceInsightId: r.sourceInsightId,
    lastFiredAt: r.lastFiredAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

export const rulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.rule.findMany({
      where:   { userId: ctx.userId },
      orderBy: [{ priority: "desc" }, { isSystem: "desc" }, { severity: "asc" }, { name: "asc" }],
    })
    return rows.map(serializeRule)
  }),

  templates: protectedProcedure.query(() => TEMPLATES),

  // Descriptive create/update (Recordatorios) — unchanged shape.
  create: protectedProcedure
    .input(RuleInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.create({ data: { ...input, isSystem: false, userId: ctx.userId } })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(RuleInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.rule.update({ where: { id, userId: ctx.userId }, data })
    }),

  // Executable create/update (post-G2: la fuente editable es `rules`).
  createExecutable: protectedProcedure
    .input(executableInput)
    .mutation(async ({ ctx, input }) => {
      const data = ruleDataFromExecutableInput(input as never)
      const row = await ctx.prisma.rule.create({
        data: { ...data, conditions: data.conditions as object, actions: data.actions as object, userId: ctx.userId },
      })
      return serializeRule(row)
    }),

  updateExecutable: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).and(executableInput))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const data = ruleDataFromExecutableInput(rest as never)
      const row = await ctx.prisma.rule.update({
        where: { id, userId: ctx.userId },
        data:  { ...data, conditions: data.conditions as object, actions: data.actions as object },
      })
      return serializeRule(row)
    }),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = ruleDataFromTemplate(input.templateId)
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" })
      const row = await ctx.prisma.rule.create({
        data: { ...data, conditions: data.conditions as object, actions: data.actions as object, userId: ctx.userId },
      })
      return serializeRule(row)
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.update({ where: { id: input.id, userId: ctx.userId }, data: { enabled: input.enabled } })
    ),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.rule.delete({ where: { id: input, userId: ctx.userId } })
    ),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      // First id = highest priority. Map to 3..0 (cap at 3) — same as automations did.
      await ctx.prisma.$transaction(
        input.ids.map((id, i) =>
          ctx.prisma.rule.updateMany({ where: { id, userId: ctx.userId }, data: { priority: Math.max(0, 3 - i) } }),
        ),
      )
      return { ok: true }
    }),

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

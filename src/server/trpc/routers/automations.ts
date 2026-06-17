import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { TRIGGERS, PRE_TRIGGERS, type ConditionNode } from "@/domains/rules/types"
import { TEMPLATES, TEMPLATE_MAP } from "@/domains/rules/templates"

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

const ruleInput = z.object({
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

export const automationsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.automation.findMany({ where: { userId: ctx.userId }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }),
  ),

  get: protectedProcedure.input(z.string().uuid()).query(({ ctx, input }) =>
    ctx.prisma.automation.findFirstOrThrow({ where: { id: input, userId: ctx.userId } }),
  ),

  templates: protectedProcedure.query(() => TEMPLATES),

  create: protectedProcedure.input(ruleInput).mutation(({ ctx, input }) =>
    ctx.prisma.automation.create({
      data: { ...input, conditions: input.conditions as object, actions: input.actions as object, userId: ctx.userId },
    }),
  ),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(({ ctx, input }) => {
      const t = TEMPLATE_MAP[input.templateId]
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" })
      return ctx.prisma.automation.create({
        data: {
          userId: ctx.userId, name: t.name, description: t.description, category: t.category,
          trigger: t.trigger, conditions: t.conditions as object, actions: t.actions as object, enabled: true,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).and(ruleInput))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.automation.update({
        where: { id, userId: ctx.userId },
        data:  { ...data, conditions: data.conditions as object, actions: data.actions as object },
      })
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.automation.updateMany({ where: { id: input.id, userId: ctx.userId }, data: { enabled: input.enabled } }),
    ),

  delete: protectedProcedure.input(z.string().uuid()).mutation(({ ctx, input }) =>
    ctx.prisma.automation.deleteMany({ where: { id: input, userId: ctx.userId } }),
  ),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      // First id = highest priority. Map to 3..0 (cap at 3).
      await ctx.prisma.$transaction(
        input.ids.map((id, i) =>
          ctx.prisma.automation.updateMany({ where: { id, userId: ctx.userId }, data: { priority: Math.max(0, 3 - i) } }),
        ),
      )
      return { ok: true }
    }),
})

# G2 Fase 2 — Retiro de `automations` · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirar `automations` como fuente: el engine queda solo-`runRules`, `/reglas` edita la tabla `rules`, y el router/dual-write/informe de migración desaparecen. La tabla `automations` queda archivada intacta (P9).

**Architecture:** La fase 1 (flip `RULES_SOURCE=rules`) ya está verificada en prod — el enforcement YA lee de `rules`. Esta fase elimina el código transitorio: (1) engine sin dispatcher/flag, (2) router `rules` ampliado a paridad ejecutable con helpers puros testeados, (3) UI `/reglas` apuntada a `trpc.rules.*`, (4) borrado de `automations` router + `rule-sync` + `migration-report`.

**Tech Stack:** Next.js + tRPC + Prisma + Zod · vitest · TypeScript estricto.

**Spec:** `docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md`

## Global Constraints

- Rama de trabajo: `feat/g2-rules-cutover` (ya existe, spec commiteado). Commit + push; **NO** merge a main (lo hace el usuario).
- **Sin migraciones**: no tocar `supabase/migrations/` ni `schema.prisma`. La tabla y el modelo `Automation` se conservan (archivo, FREEZE-P9).
- Todos los comandos desde `src/`: `cd src && npx tsc --noEmit` · `npx vitest run` (suite COMPLETA antes del push) · `npx eslint . --max-warnings=200` (0 errores; 74 warnings preexistentes).
- Error ambiental conocido y aceptable en tsc local: `puppeteer-core` no instalado (`server/services/reviews/render-pdf.ts`) — ajeno a este sprint.
- No reintroducir lecturas/escrituras de `prisma.automation` en `src/` (guard en Task 6).
- Mensajes de commit terminan con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Tras el merge a main (fuera de este plan): el usuario borra la env var `RULES_SOURCE` de Vercel (queda inerte).

---

### Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations)

**Files:**
- Modify: `src/domains/rules/engine.ts`
- Modify: `src/server/trpc/routers/trades.ts:20` (import) y 3 call sites (`runRuleEngine` → `runRules`, líneas ~619, ~648, ~737)
- Modify: `src/__tests__/domains/rules/run-rules.test.ts` (quitar describe de flag-routing)
- Delete: `src/__tests__/domains/rules/engine.test.ts` (cubría `runAutomations`; su semántica ya está cubierta espejo en `run-rules.test.ts`)

**Interfaces:**
- Consumes: `runRules(prisma, userId, trigger, ctxFn): Promise<RunResult>` (ya existe, no cambia de firma).
- Produces: `engine.ts` exporta SOLO `RunResult` y `runRules`. `runAutomations`, `runRuleEngine` y `rulesSourceIsUnified` dejan de existir.

- [ ] **Step 1: Actualizar el test — eliminar el describe de flag-routing y los imports muertos**

En `src/__tests__/domains/rules/run-rules.test.ts`:
- Cambiar el import a: `import { runRules } from "@/domains/rules/engine"`.
- Borrar entero el bloque `describe("runRuleEngine — flag routing (default off)", ...)` (usa `runRuleEngine`, `rulesSourceIsUnified` y `process.env.RULES_SOURCE`, que desaparecen).
- Conservar todos los demás tests de `runRules` tal cual (son el invariante de no-regresión).

- [ ] **Step 2: Borrar `src/__tests__/domains/rules/engine.test.ts`**

```bash
git rm src/__tests__/domains/rules/engine.test.ts
```

- [ ] **Step 3: Correr los tests de rules — deben fallar por imports**

Run: `cd src && npx vitest run __tests__/domains/rules/run-rules.test.ts`
Expected: PASS (el test ya no referencia lo borrado). Si falla, el describe de flag no se borró completo.

- [ ] **Step 4: Reescribir `engine.ts` — dejar solo `runRules`**

Contenido completo final de `src/domains/rules/engine.ts`:

```ts
// Rules runner (post-G2). Loads enabled executable rules for a trigger from the
// unified `rules` model, evaluates each condition tree against the context, and
// runs matching actions. Context is built lazily (only when rules exist) so
// triggers stay cheap when the user has no rules. Descriptive rules have
// trigger=null and are excluded by the trigger filter.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { evaluate } from "./conditions"
import { runAction } from "./actions"
import type { Trigger, ConditionNode, RuleAction, EvalContext } from "./types"

export interface RunResult {
  blocked: boolean
  blockMessage?: string
  addTags: string[]
  removeTags: string[]
  firedIds: string[]
}

export async function runRules(
  prisma: PrismaClient,
  userId: string,
  trigger: Trigger,
  ctxFn: () => Promise<EvalContext> | EvalContext,
): Promise<RunResult> {
  const res: RunResult = { blocked: false, addTags: [], removeTags: [], firedIds: [] }

  const rules = await prisma.rule.findMany({
    where:   { userId, trigger, enabled: true },
    orderBy: { priority: "desc" },
  })
  if (rules.length === 0) return res

  const ctx = await ctxFn()

  for (const r of rules) {
    let matched = false
    try { matched = evaluate(r.conditions as unknown as ConditionNode, ctx) } catch { matched = false }
    if (!matched) continue
    res.firedIds.push(r.id)

    for (const action of ((r.actions as unknown as RuleAction[]) ?? [])) {
      try {
        const out = await runAction(action, ctx, { prisma, userId, automationName: r.name })
        if (out.block) { res.blocked = true; res.blockMessage = out.blockMessage }
        if (out.addTags?.length) res.addTags.push(...out.addTags)
        if (out.removeTags?.length) res.removeTags.push(...out.removeTags)
      } catch (err) {
        // Best-effort: one failing action never breaks the trade write or other actions.
        console.warn(`[rules] action ${action.type} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  if (res.firedIds.length) {
    await prisma.rule
      .updateMany({ where: { id: { in: res.firedIds }, userId }, data: { lastFiredAt: new Date() } })
      .catch(() => { /* observability only */ })
  }
  return res
}
```

- [ ] **Step 5: Actualizar `trades.ts` — import y 3 call sites**

En `src/server/trpc/routers/trades.ts`:
- Línea 20: `import { runRuleEngine } from "@/domains/rules/engine"` → `import { runRules } from "@/domains/rules/engine"`.
- Reemplazar las 3 ocurrencias de `runRuleEngine(` por `runRules(` (pre-create ~L619, post-create ~L648, post-update ~L737). Los argumentos no cambian.

- [ ] **Step 6: tsc + tests de rules**

Run: `cd src && npx tsc --noEmit && npx vitest run __tests__/domains/rules/`
Expected: tsc limpio (salvo puppeteer-core) · tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(g2): engine solo-runRules — retira runAutomations y el flag RULES_SOURCE

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD)

**Files:**
- Create: `src/domains/rules/rule-write.ts`
- Test: `src/__tests__/domains/rules/rule-write.test.ts`

**Interfaces:**
- Consumes: `classifyMode(actions)` de `./unification`; `TEMPLATE_MAP` de `./templates`; tipos de `./types`.
- Produces (Task 3 los usa):
  - `interface ExecutableRuleInput { name: string; description: string; trigger: Trigger; conditions: ConditionNode; actions: RuleAction[]; category: string; priority: number; enabled: boolean }`
  - `ruleDataFromExecutableInput(i: ExecutableRuleInput)` → campos planos para `prisma.rule.create/update` (con `mode` y `severity` derivados; `isSystem: false`).
  - `ruleDataFromTemplate(templateId: string)` → los mismos campos desde una plantilla, o `null` si no existe.

- [ ] **Step 1: Escribir el test que falla**

`src/__tests__/domains/rules/rule-write.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { ruleDataFromExecutableInput, ruleDataFromTemplate } from "@/domains/rules/rule-write"
import type { RuleAction } from "@/domains/rules/types"

const BLOCK: RuleAction[] = [{ type: "BLOCK", params: { message: "no" } }]
const NOTIFY: RuleAction[] = [{ type: "NOTIFY", params: { message: "ojo" } }]

describe("ruleDataFromExecutableInput", () => {
  const base = {
    name: "Regla X", description: "d", trigger: "TRADE_PRE_CREATE" as const,
    conditions: { field: "riskPct", cmp: "gt" as const, value: 2 },
    category: "Riesgo", priority: 1, enabled: true,
  }

  it("BLOCK ⇒ mode enforce + severity CRÍTICA (espejo de rule-sync)", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: BLOCK })
    expect(d.mode).toBe("enforce")
    expect(d.severity).toBe("CRÍTICA")
    expect(d.isSystem).toBe(false)
    expect(d.trigger).toBe("TRADE_PRE_CREATE")
  })

  it("sin BLOCK ⇒ warn + MEDIA", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: NOTIFY })
    expect(d.mode).toBe("warn")
    expect(d.severity).toBe("MEDIA")
  })

  it("preserva conditions/actions/priority/category tal cual", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: NOTIFY })
    expect(d.conditions).toEqual(base.conditions)
    expect(d.actions).toEqual(NOTIFY)
    expect(d.priority).toBe(1)
    expect(d.category).toBe("Riesgo")
  })
})

describe("ruleDataFromTemplate", () => {
  it("instancia una plantilla ejecutable (psychology-revenge ⇒ enforce)", () => {
    const d = ruleDataFromTemplate("psychology-revenge")
    expect(d).not.toBeNull()
    expect(d!.name).toBe("Bloquear revenge trade")
    expect(d!.mode).toBe("enforce")
    expect(d!.trigger).toBe("TRADE_PRE_CREATE")
    expect(d!.enabled).toBe(true)
  })

  it("plantilla de protección de la galería fusionada (daily-loss-stop)", () => {
    const d = ruleDataFromTemplate("daily-loss-stop")
    expect(d).not.toBeNull()
    expect(d!.mode).toBe("enforce")
  })

  it("id desconocido ⇒ null", () => {
    expect(ruleDataFromTemplate("nope")).toBeNull()
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd src && npx vitest run __tests__/domains/rules/rule-write.test.ts`
Expected: FAIL — `Cannot find module '@/domains/rules/rule-write'`.

- [ ] **Step 3: Implementar `src/domains/rules/rule-write.ts`**

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers for WRITING executable rules into the unified `rules` model
// (post-G2: `rules` is both the enforcement source and the editable source).
// Mirrors the mode/severity derivation the retired rule-sync used, so rows
// written directly are indistinguishable from the old mirrored ones.
// ─────────────────────────────────────────────────────────────────────────────

import { classifyMode } from "./unification"
import { TEMPLATE_MAP } from "./templates"
import type { Trigger, ConditionNode, RuleAction } from "./types"

export interface ExecutableRuleInput {
  name: string
  description: string
  trigger: Trigger
  conditions: ConditionNode
  actions: RuleAction[]
  category: string
  priority: number
  enabled: boolean
}

/** Flat `rules` row fields for an executable rule; mode/severity derived. */
export function ruleDataFromExecutableInput(i: ExecutableRuleInput) {
  const mode = classifyMode(i.actions)
  return {
    name:        i.name,
    description: i.description,
    severity:    mode === "enforce" ? "CRÍTICA" : "MEDIA",
    mode,
    enabled:     i.enabled,
    isSystem:    false,
    trigger:     i.trigger,
    conditions:  i.conditions,
    actions:     i.actions,
    priority:    i.priority,
    category:    i.category,
  }
}

/** Same fields instantiated from a gallery template; null when the id is unknown. */
export function ruleDataFromTemplate(templateId: string) {
  const t = TEMPLATE_MAP[templateId]
  if (!t) return null
  return ruleDataFromExecutableInput({
    name: t.name, description: t.description, trigger: t.trigger,
    conditions: t.conditions, actions: t.actions,
    category: t.category, priority: 0, enabled: true,
  })
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd src && npx vitest run __tests__/domains/rules/rule-write.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(g2): helpers puros de escritura de reglas ejecutables (rule-write)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Router `rules` a paridad ejecutable

**Files:**
- Modify: `src/server/trpc/routers/rules.ts` (reescritura completa, abajo)

**Interfaces:**
- Consumes: `ruleDataFromExecutableInput` / `ruleDataFromTemplate` (Task 2); `TEMPLATES` de `@/domains/rules/templates`; `TRIGGERS`, `PRE_TRIGGERS`, `ConditionNode` de `@/domains/rules/types`.
- Produces (Task 4 los usa desde el cliente):
  - `rules.list` → filas planas con `{ id, name, description, severity, isSystem, enabled, mode, trigger, conditions, actions, priority, category, sourceAutomationId, sourceCommitmentId, sourceInsightId, lastFiredAt, createdAt, updatedAt }`.
  - `rules.templates` → `TEMPLATES` (galería fusionada base + protección, igual que la que servía automations).
  - `rules.createExecutable({ name, description?, trigger, conditions, actions, category?, priority?, enabled? })`
  - `rules.updateExecutable({ id } & mismos campos)`
  - `rules.createFromTemplate({ templateId })`
  - `rules.reorder({ ids })` — primer id = prioridad más alta (mapea 3..0, cap 3), igual que automations.
  - Se conservan: `create`/`update` descriptivos, `toggle`, `delete`, `seedDefaults`.

- [ ] **Step 1: Reescribir `src/server/trpc/routers/rules.ts`**

Contenido completo final:

```ts
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
```

Notas para el implementador:
- Los `as never` en `ruleDataFromExecutableInput(input as never)` existen porque el output de Zod (`z.infer` del union recursivo) y `ExecutableRuleInput` son estructuralmente equivalentes pero TS no los unifica a través del `z.lazy`. Si tsc lo acepta sin el cast, quítalo.
- `toggle`/`delete` cambian de `update`→ mismas firmas que ya usaba `RemindersTab` — sin cambio para consumidores existentes.
- El `orderBy` de `list` antepone `priority desc` para que el tab de automatizaciones liste como lo hacía automations (`priority desc, createdAt asc`); los tabs filtran client-side.

- [ ] **Step 2: tsc**

Run: `cd src && npx tsc --noEmit`
Expected: limpio (salvo puppeteer-core). Si aparece TS2589 en un call site de `trpc.rules.list`, revisar que `serializeRule` no devuelva ningún campo con tipo Prisma.JsonValue sin castear.

- [ ] **Step 3: Suite de rules**

Run: `cd src && npx vitest run __tests__/domains/rules/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(g2): router rules a paridad ejecutable (create/update/templates/reorder)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: UI `/reglas` → `trpc.rules.*`

**Files:**
- Modify: `src/app/reglas/page.tsx`

**Interfaces:**
- Consumes: `rules.list` / `rules.templates` / `rules.createExecutable` / `rules.updateExecutable` / `rules.createFromTemplate` / `rules.toggle` / `rules.delete` (Task 3).
- Produces: la página deja de usar `trpc.automations.*` y `classifyMode`.

- [ ] **Step 1: Reescribir `AutomationsTab` sobre `rules`**

Cambios en `src/app/reglas/page.tsx` (el resto del archivo no cambia):

1. Imports: quitar `import { classifyMode } from "@/domains/rules/unification"`. Añadir `RuleMode` NO hace falta (el badge acepta el string del row casteado).
2. Reemplazar el tipo `AutomationRow` por:

```ts
type ExecRuleRow = {
  id: string; name: string; description: string; enabled: boolean; priority: number
  trigger: Trigger; conditions: ConditionNode; actions: RuleAction[]; category: string
  mode: "enforce" | "warn"
  sourceCommitmentId: string | null; sourceInsightId: string | null
}
```

3. En `AutomationsTab`, reemplazar queries/mutations:

```ts
const { data } = trpc.rules.list.useQuery(undefined, { staleTime: 30_000 })
const { data: templates = [] } = trpc.rules.templates.useQuery(undefined, { staleTime: 300_000 })
// Ejecutables = filas con trigger (las descriptivas viven en el tab Recordatorios)
const rows = ((data ?? []) as unknown as (ExecRuleRow & { trigger: Trigger | null })[])
  .filter((r): r is ExecRuleRow => r.trigger != null)
const inv = () => utils.rules.list.invalidate()

const create = trpc.rules.createExecutable.useMutation({ onSuccess: () => { toast.success("Regla creada"); inv() }, onError: onErr })
const update = trpc.rules.updateExecutable.useMutation({ onSuccess: () => { toast.success("Regla actualizada"); inv() }, onError: onErr })
const fromTpl = trpc.rules.createFromTemplate.useMutation({ onSuccess: () => { toast.success("Creada desde plantilla"); inv() }, onError: onErr })
const toggle = trpc.rules.toggle.useMutation({ onSuccess: inv, onError: onErr })
const del = trpc.rules.delete.useMutation({ onSuccess: () => { toast.success("Eliminada"); inv() }, onError: onErr })
```

4. En el render de cada fila: `<RuleModeBadge mode={classifyMode(r.actions ?? [])} />` → `<RuleModeBadge mode={r.mode} />` (cierra S1/DT-5), y junto al badge añadir el chip de origen (mismo markup que ya usa `RemindersTab`):

```tsx
{(r.sourceCommitmentId || r.sourceInsightId) && (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "var(--commit-soft)", color: "var(--commit)" }}>
    {r.sourceCommitmentId ? "desde compromiso" : "desde insight"}
  </span>
)}
```

Esto hace visibles las reglas del loop en la lista principal (cierra OI-5.1).

5. `utils.automations.list.invalidate()` ya no existe — verificado arriba que `inv` pasa a `utils.rules.list.invalidate()`.

- [ ] **Step 2: `RemindersTab` — solo descriptivas**

En `RemindersTab`, filtrar para no duplicar las ejecutables que ahora muestra el primer tab:

```ts
type R = { id: string; name: string; description: string; severity: string; enabled: boolean; trigger: string | null; sourceCommitmentId: string | null; sourceInsightId: string | null }
const rules = ((data ?? []) as R[]).filter((r) => r.trigger == null)
```

- [ ] **Step 3: tsc + eslint del archivo**

Run: `cd src && npx tsc --noEmit && npx eslint app/reglas/page.tsx`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(g2): /reglas edita rules — badge por rule.mode y reglas del loop visibles (OI-5.1, DT-5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Borrar automations router, dual-write e informe de migración

**Files:**
- Delete: `src/server/trpc/routers/automations.ts`
- Delete: `src/domains/rules/rule-sync.ts` · `src/__tests__/domains/rules/rule-sync.test.ts`
- Delete: `src/domains/rules/migration-report.ts` · `src/app/api/cron/rules-migration-report/route.ts`
- Modify: `src/server/trpc/root.ts:24` y `:60` (quitar import + registro `automations`)
- Modify: `src/domains/rules/unification.ts` (poda) · `src/__tests__/domains/rules/unification.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `unification.ts` queda exportando SOLO `RuleMode`, `UnifiedRule`, `classifyMode` y (si lo usa protection-templates) los tipos que necesite. `prisma.automation` sin referencias en `src/`.

- [ ] **Step 1: Borrar archivos y desregistrar el router**

```bash
git rm src/server/trpc/routers/automations.ts src/domains/rules/rule-sync.ts src/__tests__/domains/rules/rule-sync.test.ts src/domains/rules/migration-report.ts src/app/api/cron/rules-migration-report/route.ts
```

En `src/server/trpc/root.ts`: borrar la línea 24 (`import { automationsRouter } ...`) y la línea 60 (`automations: automationsRouter,`).

- [ ] **Step 2: Podar `unification.ts`**

Conservar: `RuleMode`, `UnifiedRule`, `classifyMode`, `V2Automation`/`V2DescriptiveRule` **solo si** algo los sigue importando (verificar con tsc; `protection-templates.ts` importa `RuleMode` y `UnifiedRule`). Borrar: `automationToUnifiedRule`, `descriptiveRuleToUnifiedRule`, `buildNoMappingReport`, `NoMappingReport`, `looksCritical`, y `severityForMode` si queda sin uso. Actualizar el comentario de cabecera: la unificación está COMPLETA (G2 cerrado); el archivo queda como catálogo de tipos + `classifyMode`.

En `src/__tests__/domains/rules/unification.test.ts`: borrar los tests de `buildNoMappingReport`/conversores; conservar los de `classifyMode`.

- [ ] **Step 3: Guard — cero referencias a automations**

Run: `cd src && npx tsc --noEmit && grep -rn "prisma\.automation\b\|trpc\.automations\|automationsRouter\|rule-sync\|migration-report" --include="*.ts" --include="*.tsx" . | grep -v generated | grep -v node_modules`
Expected: tsc limpio · grep sin resultados (0 líneas).

- [ ] **Step 4: Suite completa**

Run: `cd src && npx vitest run`
Expected: PASS total (la línea base era 1176 tests; el número baja por los archivos borrados y sube por rule-write — lo que importa es 0 fallos).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(g2): retira automations router, dual-write e informe de migración — rules es la única fuente

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Validación final, docs y push

**Files:**
- Modify: `docs/STATUS.md` (filas `S1/OI-1`, `S1/OI-2`, `S1/OI-3`, `S1/DT-1`, `S1/DT-2`, `S1/DT-5`, `S1/R-1`, `S1/R-2`, `OI-5.1` → `✅ resuelto` con cita de verificación)
- Modify: `docs/PROJECT_GUIDE.md:117` (la línea `rule-sync.ts (dual-write), engine.ts (runAutomations + runRules)` → `engine.ts (runRules — fuente única post-G2)`)
- Modify: `docs/CHANGELOG.md` (entrada nueva del cutover)

**Interfaces:** ninguna — cierre documental y verificación.

- [ ] **Step 1: Gates completos**

Run: `cd src && npx tsc --noEmit && npx vitest run && npx eslint .`
Expected: tsc limpio (salvo puppeteer-core) · vitest 0 fallos · eslint 0 errores.

- [ ] **Step 2: Actualizar docs**

- `docs/STATUS.md`: marcar las filas listadas arriba como `✅ resuelto — cutover G2 2026-07-13 (fase 1 verificada en prod por last_fired_at; fase 2 = este PR)`. No tocar el resto de la tabla.
- `docs/PROJECT_GUIDE.md`: actualizar la línea 117 como se indica.
- `docs/CHANGELOG.md`: añadir al inicio una entrada `## [2026-07-13] G2 — cutover de reglas` con 3 bullets: enforcement desde `rules` (flip verificado en prod), `/reglas` edita `rules` (loop rules visibles + badge por mode), `automations` archivada (tabla intacta, código retirado).

- [ ] **Step 3: Actualizar el grafo**

Run: `graphify update .`
Expected: termina sin error; commit del grafo si cambia.

- [ ] **Step 4: Commit + push (NO merge)**

```bash
git add -A && git commit -m "docs(g2): STATUS/PROJECT_GUIDE/CHANGELOG — cierre del cutover G2

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin feat/g2-rules-cutover
```

- [ ] **Step 5: Nota post-merge para el usuario (en el mensaje final, no en código)**

Tras mergear a main y desplegar: (1) borrar la env var `RULES_SOURCE` de Vercel (inerte desde este PR); (2) smoke opcional en prod: `/reglas` lista la regla del loop "Enfriamiento tras una pérdida" con badge enforce + origen, y un trade que viole una regla BLOCK sigue bloqueado.

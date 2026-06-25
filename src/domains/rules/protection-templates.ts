// ─────────────────────────────────────────────────────────────────────────────
// Capital-protection rule templates (#8, FREEZE E6.C2 / SPRINT_PLAN S1).
//
// Ready-to-use protection rules expressed in the UNIFIED rule model (mode +
// trigger + conditions + actions). Templates that map to condition fields already
// in the engine registry (`fields.ts`) are `available` and enforce (BLOCK).
//
// HONESTY (FREEZE-P3, no faked protection): templates that need a field the engine
// can't evaluate yet are gated (`available: false` + `requires`), NOT shipped as
// silent no-ops. `no-trade-low-energy` needs the pre-session check-in (S8);
// `no-size-increase-after-loss` needs last-trade size/result context (later sprint).
// See OPEN_ITEMS_SPRINT_1.
// ─────────────────────────────────────────────────────────────────────────────

import type { Trigger, ConditionNode, RuleAction } from "./types"
import type { RuleMode, UnifiedRule } from "./unification"

export interface ProtectionTemplate {
  id: string
  name: string
  description: string
  category: string
  mode: RuleMode
  /** True when every condition field exists in the engine registry today. */
  available: boolean
  /** When not available, the capability/field still missing. */
  requires?: string
  /** The executable definition, present iff `available`. */
  rule?: {
    trigger: Trigger
    conditions: ConditionNode
    actions: RuleAction[]
  }
}

export const PROTECTION_TEMPLATES: ProtectionTemplate[] = [
  {
    id: "daily-loss-stop",
    name: "Stop diario de pérdidas",
    description: "Bloquea nuevas operaciones cuando la pérdida del día supera tu límite.",
    category: "Protección de capital",
    mode: "enforce",
    available: true,
    rule: {
      trigger: "TRADE_PRE_CREATE",
      conditions: { field: "dayPnlPct", cmp: "lte", value: -3 },
      actions: [{ type: "BLOCK", params: { message: "Stop diario alcanzado: no abras más hoy." } }],
    },
  },
  {
    id: "weekly-loss-limit",
    name: "Límite de pérdida semanal",
    description: "Bloquea operaciones cuando la pérdida de la semana supera tu límite.",
    category: "Protección de capital",
    mode: "enforce",
    available: true,
    rule: {
      trigger: "TRADE_PRE_CREATE",
      conditions: { field: "weekPnlPct", cmp: "lte", value: -6 },
      actions: [{ type: "BLOCK", params: { message: "Límite semanal alcanzado: protege el capital." } }],
    },
  },
  {
    id: "cooldown-after-loss",
    name: "Enfriamiento tras una pérdida",
    description: "Impide abrir un trade en los minutos siguientes a una pérdida (anti-revenge).",
    category: "Protección de capital",
    mode: "enforce",
    available: true,
    rule: {
      trigger: "TRADE_PRE_CREATE",
      conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 15 },
      actions: [{ type: "BLOCK", params: { message: "Enfriamiento activo tras una pérdida." } }],
    },
  },
  {
    id: "no-size-increase-after-loss",
    name: "No aumentar tamaño tras una pérdida",
    description: "Impide subir el tamaño justo después de perder.",
    category: "Protección de capital",
    mode: "enforce",
    available: false,
    requires: "Contexto de la operación anterior (tamaño y resultado del último trade) — pendiente de captura.",
  },
  {
    id: "no-trade-low-energy",
    name: "No operar con energía baja",
    description: "Impide operar cuando tu check-in marca energía por debajo de 3.",
    category: "Protección de capital",
    mode: "enforce",
    available: false,
    requires: "Campo de energía del check-in pre-sesión (Sprint 8).",
  },
]

export const PROTECTION_TEMPLATE_MAP: Record<string, ProtectionTemplate> = Object.fromEntries(
  PROTECTION_TEMPLATES.map((t) => [t.id, t]),
)

/**
 * Instantiate a unified rule from an available protection template. Throws for a
 * gated template — we never materialise a rule that can't actually enforce.
 */
export function templateToUnifiedRule(id: string): UnifiedRule {
  const t = PROTECTION_TEMPLATE_MAP[id]
  if (!t) throw new Error(`Unknown protection template: ${id}`)
  if (!t.available || !t.rule) {
    throw new Error(`Protection template "${id}" is not available yet: ${t.requires ?? "missing capability"}`)
  }
  return {
    name: t.name,
    description: t.description,
    severity: "CRÍTICA",
    mode: t.mode,
    enabled: true,
    isSystem: false,
    trigger: t.rule.trigger,
    conditions: t.rule.conditions,
    actions: t.rule.actions,
    priority: 0,
    category: t.category,
    sourceAutomationId: null,
    sourceCommitmentId: null,
    sourceInsightId: null,
  }
}

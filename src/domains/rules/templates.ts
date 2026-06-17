// Built-in automation templates. createFromTemplate instantiates an editable copy.

import type { Trigger, ConditionNode, RuleAction } from "./types"

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger: Trigger
  conditions: ConditionNode
  actions: RuleAction[]
}

export const TEMPLATES: AutomationTemplate[] = [
  {
    id: "risk-management",
    name: "Riesgo alto → avisar",
    description: "Notifica cuando abres un trade arriesgando más de lo previsto.",
    category: "Gestión de riesgo",
    trigger: "TRADE_CREATED",
    conditions: { field: "riskPct", cmp: "gt", value: 2 },
    actions: [{ type: "NOTIFY", params: { message: "Riesgo por encima del 2% del balance." } }],
  },
  {
    id: "psychology-revenge",
    name: "Bloquear revenge trade",
    description: "Impide abrir un trade en los 15 min siguientes a una pérdida.",
    category: "Psicología",
    trigger: "TRADE_PRE_CREATE",
    conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 15 },
    actions: [
      { type: "BLOCK", params: { message: "Pausa de 15 min tras una pérdida (anti-revenge)." } },
      { type: "CRITICAL_ALERT", params: { message: "Revenge trade bloqueado." } },
    ],
  },
  {
    id: "drawdown",
    name: "Drawdown elevado → alerta",
    description: "Alerta crítica cuando el drawdown supera el 10%.",
    category: "Seguimiento de drawdown",
    trigger: "TRADE_CLOSED",
    conditions: { field: "drawdownPct", cmp: "gt", value: 10 },
    actions: [{ type: "CRITICAL_ALERT", params: { message: "Drawdown por encima del 10%." } }],
  },
  {
    id: "exposure",
    name: "Control de exposición",
    description: "Bloquea más de 5 trades en un mismo día.",
    category: "Control de exposición",
    trigger: "TRADE_PRE_CREATE",
    conditions: { field: "tradesToday", cmp: "gte", value: 5 },
    actions: [{ type: "BLOCK", params: { message: "Límite de 5 trades por día alcanzado." } }],
  },
  {
    id: "no-setup",
    name: "Sin setup → etiquetar",
    description: "Etiqueta como 'Off-plan' los trades abiertos sin setup asignado.",
    category: "Psicología",
    trigger: "TRADE_CREATED",
    conditions: { field: "setupId", cmp: "eq", value: "" },
    actions: [{ type: "ADD_TAG", params: { tag: "Off-plan" } }],
  },
]

export const TEMPLATE_MAP: Record<string, AutomationTemplate> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]))

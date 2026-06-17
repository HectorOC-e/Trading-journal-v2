// Field registry — the conditionable fields available in the IF builder, with the
// comparisons each supports. The engine just reads ctx[field]; this registry drives
// the UI and validation.

import type { Cmp, Trigger } from "./types"

export type FieldType = "number" | "string" | "enum" | "tags"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  cmps: Cmp[]
  options?: string[]       // for enum
  unit?: string            // e.g. "%"
  /** Which triggers expose this field (all if omitted). */
  triggers?: Trigger[]
}

const NUM: Cmp[] = ["gt", "gte", "lt", "lte", "eq", "neq"]
const STR: Cmp[] = ["eq", "neq", "contains"]
const ENUM: Cmp[] = ["eq", "neq", "in"]

export const FIELDS: FieldDef[] = [
  // ── Trade ──
  { key: "riskPct",       label: "Riesgo (%)",        type: "number", cmps: NUM, unit: "%" },
  { key: "rMultiple",     label: "R múltiple",        type: "number", cmps: NUM },
  { key: "pnl",           label: "P&L",               type: "number", cmps: NUM },
  { key: "size",          label: "Tamaño",            type: "number", cmps: NUM },
  { key: "symbol",        label: "Símbolo",           type: "string", cmps: STR },
  { key: "direction",     label: "Dirección",         type: "enum",   cmps: ENUM, options: ["LONG", "SHORT"] },
  { key: "session",       label: "Sesión",            type: "enum",   cmps: ENUM, options: ["Asia", "London", "New York"] },
  { key: "setupId",       label: "Setup asignado",    type: "string", cmps: ["eq", "neq"] },
  { key: "tags",          label: "Etiquetas",         type: "tags",   cmps: ["contains"] },
  { key: "minsSinceLastLoss", label: "Min. desde última pérdida", type: "number", cmps: NUM, triggers: ["TRADE_PRE_CREATE"] },
  // ── Account metrics ──
  { key: "dayPnlPct",     label: "P&L del día (%)",   type: "number", cmps: NUM, unit: "%" },
  { key: "weekPnlPct",    label: "P&L semana (%)",    type: "number", cmps: NUM, unit: "%" },
  { key: "drawdownPct",   label: "Drawdown (%)",      type: "number", cmps: NUM, unit: "%" },
  { key: "winRate",       label: "Win rate (%)",      type: "number", cmps: NUM, unit: "%" },
  { key: "tradesToday",   label: "Trades hoy",        type: "number", cmps: NUM },
]

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]))

export function fieldsForTrigger(trigger: Trigger): FieldDef[] {
  return FIELDS.filter((f) => !f.triggers || f.triggers.includes(trigger))
}

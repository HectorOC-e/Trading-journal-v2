"use client"

import { Plus, X } from "lucide-react"
import type { RuleAction, RuleActionType } from "@/domains/rules/types"

const ACTION_LABEL: Record<RuleActionType, string> = {
  NOTIFY: "Notificar",
  CRITICAL_ALERT: "Alerta crítica",
  ADD_TAG: "Agregar etiqueta",
  REMOVE_TAG: "Quitar etiqueta",
  BLOCK: "Bloquear operación",
  CREATE_REMINDER: "Crear recordatorio",
}
const ALL: RuleActionType[] = ["NOTIFY", "CRITICAL_ALERT", "ADD_TAG", "REMOVE_TAG", "BLOCK", "CREATE_REMINDER"]
const TAG_ACTIONS = new Set<RuleActionType>(["ADD_TAG", "REMOVE_TAG"])

export function ActionList({ value, onChange, allowBlock }: {
  value: RuleAction[]; onChange: (a: RuleAction[]) => void; allowBlock: boolean
}) {
  const set = (i: number, a: RuleAction) => onChange(value.map((x, idx) => (idx === i ? a : x)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const options = ALL.filter((t) => allowBlock || t !== "BLOCK")

  return (
    <div className="flex flex-col gap-2">
      {value.map((a, i) => {
        const isTag = TAG_ACTIONS.has(a.type)
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <select value={a.type} onChange={(e) => set(i, { type: e.target.value as RuleActionType, params: {} })}
              className="h-7 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 text-[11px] text-[var(--ink)]">
              {options.map((t) => <option key={t} value={t}>{ACTION_LABEL[t]}</option>)}
            </select>
            <input
              value={String((isTag ? a.params?.tag : a.params?.message) ?? "")}
              onChange={(e) => set(i, { ...a, params: { ...(a.params ?? {}), [isTag ? "tag" : "message"]: e.target.value } })}
              placeholder={isTag ? "etiqueta…" : "mensaje…"}
              className="h-7 flex-1 min-w-[140px] rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[11px] text-[var(--ink)]"
            />
            <button onClick={() => remove(i)} aria-label="Quitar acción" className="text-[var(--ink-3)] hover:text-[var(--loss)]"><X size={13} /></button>
          </div>
        )
      })}
      <button onClick={() => onChange([...value, { type: "NOTIFY", params: { message: "" } }])} className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)]"><Plus size={12} /> acción</button>
    </div>
  )
}

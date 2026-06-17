"use client"

import { Plus, X } from "lucide-react"
import { FIELDS, FIELD_MAP } from "@/domains/rules/fields"
import type { ConditionNode, LeafCondition, Cmp } from "@/domains/rules/types"

export type Group = { op: "and" | "or"; children: ConditionNode[] }
type NotNode = { op: "not"; child: ConditionNode }

export function isGroup(n: ConditionNode | undefined): n is Group {
  return !!n && "op" in n && (n.op === "and" || n.op === "or")
}
function isNot(n: ConditionNode): n is NotNode { return !!n && "op" in n && n.op === "not" }
function isLeaf(n: ConditionNode): n is LeafCondition { return !!n && "field" in n }

const CMP_LABEL: Record<Cmp, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠", contains: "contiene", in: "está en" }

function newLeaf(): LeafCondition {
  const f = FIELDS[0]
  return { field: f.key, cmp: f.cmps[0], value: f.type === "number" ? 0 : "" }
}

function LeafEditor({ leaf, negate, onChange, onRemove }: {
  leaf: LeafCondition; negate: boolean
  onChange: (node: ConditionNode) => void; onRemove: () => void
}) {
  const def = FIELD_MAP[leaf.field] ?? FIELDS[0]
  const emit = (next: LeafCondition, neg: boolean) => onChange(neg ? { op: "not", child: next } : next)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
        <input type="checkbox" checked={negate} onChange={(e) => emit(leaf, e.target.checked)} /> no
      </label>
      <select value={leaf.field} onChange={(e) => { const d = FIELD_MAP[e.target.value]; emit({ field: e.target.value, cmp: d.cmps[0], value: d.type === "number" ? 0 : "" }, negate) }}
        className="h-7 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 text-[11px] text-[var(--ink)]">
        {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      <select value={leaf.cmp} onChange={(e) => emit({ ...leaf, cmp: e.target.value as Cmp }, negate)}
        className="h-7 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 text-[11px] text-[var(--ink)]">
        {def.cmps.map((c) => <option key={c} value={c}>{CMP_LABEL[c]}</option>)}
      </select>
      {def.type === "enum" ? (
        <select value={String(leaf.value)} onChange={(e) => emit({ ...leaf, value: e.target.value }, negate)}
          className="h-7 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 text-[11px] text-[var(--ink)]">
          {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={String(leaf.value ?? "")}
          onChange={(e) => emit({ ...leaf, value: def.type === "number" ? Number(e.target.value) : e.target.value }, negate)}
          type={def.type === "number" ? "number" : "text"}
          className="h-7 w-24 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[11px] text-[var(--ink)]"
        />
      )}
      {def.unit && <span className="text-[10px] text-[var(--ink-3)]">{def.unit}</span>}
      <button onClick={onRemove} aria-label="Quitar" className="text-[var(--ink-3)] hover:text-[var(--loss)]"><X size={13} /></button>
    </div>
  )
}

export function ConditionGroup({ value, onChange, depth = 0 }: { value: Group; onChange: (g: Group) => void; depth?: number }) {
  const setChild = (i: number, c: ConditionNode) => onChange({ ...value, children: value.children.map((ch, idx) => (idx === i ? c : ch)) })
  const removeChild = (i: number) => onChange({ ...value, children: value.children.filter((_, idx) => idx !== i) })

  return (
    <div className={depth > 0 ? "border-l-2 border-[var(--line)] pl-3" : ""}>
      <div className="mb-2 inline-flex overflow-hidden rounded-[6px] border border-[var(--line)] text-[10px]">
        {(["and", "or"] as const).map((op) => (
          <button key={op} onClick={() => onChange({ ...value, op })}
            className={`px-2.5 py-1 font-semibold ${value.op === op ? "bg-[var(--accent)] text-white" : "text-[var(--ink-3)]"}`}>
            {op === "and" ? "Y (todas)" : "O (alguna)"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {value.children.map((ch, i) => (
          <div key={i}>
            {isGroup(ch)
              ? <div className="rounded-[8px] bg-[var(--panel-2)] p-2"><div className="mb-1 flex justify-end"><button onClick={() => removeChild(i)} className="text-[10px] text-[var(--ink-3)] hover:text-[var(--loss)]">quitar grupo</button></div><ConditionGroup value={ch} onChange={(g) => setChild(i, g)} depth={depth + 1} /></div>
              : <LeafEditor leaf={isNot(ch) && isLeaf(ch.child) ? ch.child : (isLeaf(ch) ? ch : newLeaf())} negate={isNot(ch)} onChange={(n) => setChild(i, n)} onRemove={() => removeChild(i)} />}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button onClick={() => onChange({ ...value, children: [...value.children, newLeaf()] })} className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)]"><Plus size={12} /> condición</button>
        {depth < 2 && <button onClick={() => onChange({ ...value, children: [...value.children, { op: "and", children: [] }] })} className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)]"><Plus size={12} /> grupo</button>}
      </div>
    </div>
  )
}

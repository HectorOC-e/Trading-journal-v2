"use client"

import { useState } from "react"
import { Code2, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { ConditionGroup, isGroup, type Group } from "@/components/rules/condition-group"
import { ActionList } from "@/components/rules/action-list"
import { PRE_TRIGGERS, type Trigger, type ConditionNode, type RuleAction } from "@/domains/rules/types"

const TRIGGER_LABEL: Record<Trigger, string> = {
  TRADE_PRE_CREATE: "Antes de crear un trade (puede bloquear)",
  TRADE_CREATED: "Trade creado",
  TRADE_CLOSED: "Trade cerrado",
  TRADE_UPDATED: "Trade editado",
}
const TRIGGER_ORDER: Trigger[] = ["TRADE_PRE_CREATE", "TRADE_CREATED", "TRADE_CLOSED", "TRADE_UPDATED"]

export interface RuleDraft {
  id?: string
  name: string
  description?: string
  trigger: Trigger
  conditions: ConditionNode
  actions: RuleAction[]
  priority?: number
}

function toGroup(c: ConditionNode): Group {
  if (isGroup(c)) return c
  if (c && ("field" in c || ("op" in c && c.op === "not"))) return { op: "and", children: [c] }
  return { op: "and", children: [] }
}

export function RuleBuilder({ open, initial, onClose, onSave }: {
  open: boolean
  initial: RuleDraft | null
  onClose: () => void
  onSave: (draft: RuleDraft) => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [trigger, setTrigger] = useState<Trigger>(initial?.trigger ?? "TRADE_CREATED")
  const [group, setGroup] = useState<Group>(toGroup(initial?.conditions ?? { op: "and", children: [] }))
  const [actions, setActions] = useState<RuleAction[]>(initial?.actions ?? [{ type: "NOTIFY", params: { message: "" } }])
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [nameError, setNameError] = useState("")
  const [actionsError, setActionsError] = useState("")

  const allowBlock = PRE_TRIGGERS.includes(trigger)
  const conditions: ConditionNode = group.children.length ? group : {}

  function enterJson() {
    setJsonText(JSON.stringify({ trigger, conditions, actions }, null, 2))
    setJsonError(""); setJsonMode(true)
  }
  function exitJson() {
    try {
      const parsed = JSON.parse(jsonText) as { trigger: Trigger; conditions: ConditionNode; actions: RuleAction[] }
      setTrigger(parsed.trigger); setGroup(toGroup(parsed.conditions)); setActions(parsed.actions ?? [])
      setJsonError(""); setJsonMode(false)
    } catch (e) { setJsonError(e instanceof Error ? e.message : "JSON inválido") }
  }

  function save() {
    let ok = true
    if (!name.trim())        { setNameError("Ponle un nombre a la regla"); ok = false }
    if (actions.length === 0) { setActionsError("Agrega al menos una acción"); ok = false }
    if (!ok) return
    onSave({ id: initial?.id, name: name.trim(), trigger, conditions, actions, priority: initial?.priority })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar automatización" : "Nueva automatización"}</DialogTitle>
        </DialogHeader>

        <div className="mb-3">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError("") }}
              placeholder="Nombre de la regla"
              aria-invalid={!!nameError || undefined}
              className={cn(
                "h-9 flex-1 rounded-[var(--radius-sm)] border bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)] outline-none transition-colors",
                nameError ? "border-[var(--loss)]" : "border-[var(--line)]",
              )}
            />
            <button onClick={() => (jsonMode ? exitJson() : enterJson())} className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--line)] px-2.5 py-1.5 text-[11px] text-[var(--ink-2)]">
              {jsonMode ? <><Eye size={12} /> Visual</> : <><Code2 size={12} /> JSON</>}
            </button>
          </div>
          <FieldError message={nameError} />
        </div>

        {jsonMode ? (
          <div>
            <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} rows={14} className="w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 font-mono text-[11px] text-[var(--ink)] outline-none" />
            {jsonError && <p className="mt-1 text-[11px] text-[var(--loss)]">{jsonError}</p>}
          </div>
        ) : (
          <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">Cuándo (WHEN)</p>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)} className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 text-[13px] text-[var(--ink)]">
                {TRIGGER_ORDER.map((t) => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}
              </select>
            </section>
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#f59e0b]">Si (IF) <span className="text-[var(--ink-3)] normal-case">— vacío = siempre</span></p>
              <ConditionGroup value={group} onChange={setGroup} />
            </section>
            <section>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--win)]">Entonces (THEN)</p>
              <ActionList value={actions} onChange={(a) => { setActions(a); if (actionsError) setActionsError("") }} allowBlock={allowBlock} />
              <FieldError message={actionsError} />
              {!allowBlock && actions.some((a) => a.type === "BLOCK") && <p className="mt-1 text-[11px] text-[var(--loss)]">«Bloquear» solo es válido en triggers pre-trade.</p>}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={jsonMode}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

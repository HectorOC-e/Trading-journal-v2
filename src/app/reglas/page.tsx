"use client"

// Epic 3 — Rules hub: Automatizaciones (WHEN/IF/THEN engine) · Reglas del sistema
// (risk limits, editable) · Recordatorios (legacy discipline reminders, kept).

import { useState } from "react"
import { Plus, Pencil, Trash2, Zap, ShieldAlert, ListChecks, RotateCcw } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { RuleBuilder, type RuleDraft } from "@/components/rules/rule-builder"
import { RuleModeBadge } from "@/components/rules/rule-mode-badge"
import { classifyMode } from "@/domains/rules/unification"
import type { RuleAction, Trigger, ConditionNode } from "@/domains/rules/types"

type AutomationRow = {
  id: string; name: string; description: string; enabled: boolean; priority: number
  trigger: Trigger; conditions: ConditionNode; actions: RuleAction[]; category: string
}
type Template = { id: string; name: string; description: string; category: string }

const TRIGGER_LABEL: Record<string, string> = {
  TRADE_PRE_CREATE: "Antes de crear", TRADE_CREATED: "Trade creado", TRADE_CLOSED: "Trade cerrado", TRADE_UPDATED: "Trade editado",
}
const ACTION_LABEL: Record<string, string> = {
  NOTIFY: "notificar", CRITICAL_ALERT: "alerta crítica", ADD_TAG: "etiquetar", REMOVE_TAG: "quitar etiqueta", BLOCK: "bloquear", CREATE_REMINDER: "recordatorio",
}
const TABS = [
  { value: "auto", label: "Automatizaciones" },
  { value: "system", label: "Reglas del sistema" },
  { value: "reminders", label: "Recordatorios" },
]

export default function ReglasPage() {
  const [tab, setTab] = useState("auto")
  return (
    <main aria-label="Reglas">
      <TopBar title="Reglas" subtitle="Automatizaciones, límites del sistema y recordatorios" />
      <SegmentedTabs options={TABS} value={tab} onChange={setTab} ariaLabel="Secciones de reglas" className="mb-5" />
      {tab === "auto" && <AutomationsTab />}
      {tab === "system" && <SystemRulesTab />}
      {tab === "reminders" && <RemindersTab />}
    </main>
  )
}

/* ── Automatizaciones ─────────────────────────────────────────────────────── */
function AutomationsTab() {
  const utils = trpc.useUtils()
  const { data } = trpc.automations.list.useQuery(undefined, { staleTime: 30_000 })
  const { data: templates = [] } = trpc.automations.templates.useQuery(undefined, { staleTime: 300_000 })
  const rows = (data ?? []) as unknown as AutomationRow[]
  const inv = () => utils.automations.list.invalidate()
  const onErr = (e: unknown) => toast.error(formatErrorForUser(e as never))

  const create = trpc.automations.create.useMutation({ onSuccess: () => { toast.success("Automatización creada"); inv() }, onError: onErr })
  const update = trpc.automations.update.useMutation({ onSuccess: () => { toast.success("Automatización actualizada"); inv() }, onError: onErr })
  const fromTpl = trpc.automations.createFromTemplate.useMutation({ onSuccess: () => { toast.success("Creada desde plantilla"); inv() }, onError: onErr })
  const toggle = trpc.automations.toggle.useMutation({ onSuccess: inv, onError: onErr })
  const del = trpc.automations.delete.useMutation({ onSuccess: () => { toast.success("Eliminada"); inv() }, onError: onErr })

  const [gallery, setGallery] = useState(false)
  const [builder, setBuilder] = useState<RuleDraft | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)

  const openBlank = () => { setGallery(false); setBuilder(null); setBuilderOpen(true) }
  const openEdit = (r: AutomationRow) => { setBuilder({ id: r.id, name: r.name, trigger: r.trigger, conditions: r.conditions, actions: r.actions, priority: r.priority }); setBuilderOpen(true) }
  const onSave = (d: RuleDraft) => {
    const payload = { name: d.name, trigger: d.trigger, conditions: d.conditions, actions: d.actions, priority: d.priority ?? 0, description: "", category: "", enabled: true }
    if (d.id) update.mutate({ id: d.id, ...payload }); else create.mutate(payload)
    setBuilderOpen(false)
  }

  return (
    <div className="max-w-[760px]">
      <div className="mb-4 flex justify-end"><Button variant="primary" onClick={() => setGallery(true)}><Plus size={14} /> Nueva automatización</Button></div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] py-12 text-center">
          <Zap size={22} className="mx-auto text-[var(--ink-3)]" />
          <p className="mt-2 text-[13px] text-[var(--ink-2)]">Sin automatizaciones. Crea una desde una plantilla o en blanco.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3" style={{ opacity: r.enabled ? 1 : 0.55 }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--ink)]">{r.name}</span>
                  <RuleModeBadge mode={classifyMode(r.actions ?? [])} />
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                  <span className="text-[var(--accent)]">⚡ {TRIGGER_LABEL[r.trigger] ?? r.trigger}</span>
                  {" · "}<span className="text-[var(--win)]">{(r.actions ?? []).map((a) => ACTION_LABEL[a.type] ?? a.type).join(", ")}</span>
                </div>
              </div>
              <span className="shrink-0 rounded-[5px] border border-[var(--line)] px-1.5 text-[9px] text-[var(--ink-3)]">P{3 - Math.min(3, r.priority)}</span>
              <Toggle on={r.enabled} onChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
              <button onClick={() => openEdit(r)} aria-label="Editar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"><Pencil size={13} /></button>
              <button onClick={() => del.mutate(r.id)} aria-label="Eliminar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--loss-soft)] hover:text-[var(--loss)]"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Template gallery */}
      <Dialog open={gallery} onOpenChange={setGallery}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader><DialogTitle>Elige una plantilla</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={openBlank} className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]">
              <div className="text-[12.5px] font-semibold text-[var(--ink)]">⬜ En blanco</div>
              <div className="mt-1 text-[11px] text-[var(--ink-3)]">Empieza desde cero</div>
            </button>
            {(templates as Template[]).map((t) => (
              <button key={t.id} onClick={() => { fromTpl.mutate({ templateId: t.id }); setGallery(false) }} className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]">
                <div className="text-[12.5px] font-semibold text-[var(--ink)]">{t.name}</div>
                <div className="mt-1 text-[11px] text-[var(--ink-3)]">{t.description}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {builderOpen && <RuleBuilder open={builderOpen} initial={builder} onClose={() => setBuilderOpen(false)} onSave={onSave} />}
    </div>
  )
}

/* ── Reglas del sistema (límites de riesgo por cuenta) ────────────────────── */
function SystemRulesTab() {
  const utils = trpc.useUtils()
  const { data: accounts = [] } = trpc.accounts.list.useQuery(undefined, { staleTime: 60_000 })
  const update = trpc.accounts.update.useMutation({
    onSuccess: () => { toast.success("Límites actualizados"); utils.accounts.list.invalidate() },
    onError: (e) => toast.error(formatErrorForUser(e as never)),
  })
  type Acct = { id: string; name: string; ddDailyPct: number | null; ddWeeklyPct: number | null; ddMonthlyPct: number | null; ddTotalPct: number | null; maxTradesPerDay: number | null }
  const list = accounts as Acct[]
  const num = (v: string) => (v === "" ? undefined : Number(v))

  const FIELDS: { key: keyof Acct; label: string }[] = [
    { key: "ddDailyPct", label: "Pérdida diaria %" }, { key: "ddWeeklyPct", label: "Pérdida semanal %" },
    { key: "ddMonthlyPct", label: "Pérdida mensual %" }, { key: "ddTotalPct", label: "Drawdown total %" },
    { key: "maxTradesPerDay", label: "Máx trades/día" },
  ]

  return (
    <div className="max-w-[760px]">
      <p className="mb-3 flex items-center gap-2 text-[12px] text-[var(--ink-3)]"><ShieldAlert size={14} /> Estos límites los aplica el motor de riesgo automáticamente (bloqueo de cuenta al romperlos). Edítalos o restáuralos.</p>
      <div className="flex flex-col gap-3">
        {list.length === 0 && <p className="text-[13px] text-[var(--ink-3)]">No tienes cuentas todavía.</p>}
        {list.map((a) => (
          <div key={a.id} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--ink)]">{a.name}</span>
              <button onClick={() => update.mutate({ id: a.id, ddDailyPct: undefined, ddWeeklyPct: undefined, ddMonthlyPct: undefined, ddTotalPct: undefined, maxTradesPerDay: undefined })}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)] hover:text-[var(--accent)]"><RotateCcw size={12} /> Restaurar</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {FIELDS.map((f) => (
                <label key={String(f.key)} className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--ink-3)]">{f.label}</span>
                  <input defaultValue={a[f.key] ?? ""} type="number" onBlur={(e) => { const v = num(e.target.value); if (v !== (a[f.key] ?? undefined)) update.mutate({ id: a.id, [f.key]: v }) }}
                    className="h-8 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[12px] text-[var(--ink)] outline-none" />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Recordatorios (disciplina, legacy) ───────────────────────────────────── */
function RemindersTab() {
  const utils = trpc.useUtils()
  const { data } = trpc.rules.list.useQuery(undefined, { staleTime: 60_000 })
  type R = { id: string; name: string; description: string; severity: string; enabled: boolean }
  const rules = (data ?? []) as R[]
  const inv = () => utils.rules.list.invalidate()
  const toggle = trpc.rules.toggle.useMutation({ onSuccess: inv })
  const del = trpc.rules.delete.useMutation({ onSuccess: () => { toast.success("Eliminado"); inv() } })

  return (
    <div className="max-w-[760px]">
      <p className="mb-3 flex items-center gap-2 text-[12px] text-[var(--ink-3)]"><ListChecks size={14} /> Recordatorios de disciplina (manuales, sin automatización).</p>
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
        {rules.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-[var(--ink-3)]">Sin recordatorios.</p>}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 last:border-0" style={{ opacity: r.enabled ? 1 : 0.55 }}>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[var(--ink)]">{r.name}</div>
              {r.description && <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">{r.description}</div>}
            </div>
            <Toggle on={r.enabled} onChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
            <button onClick={() => del.mutate(r.id)} aria-label="Eliminar" className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-3)] hover:bg-[var(--loss-soft)] hover:text-[var(--loss)]"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

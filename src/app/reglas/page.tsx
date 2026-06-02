"use client"

import { useEffect, useState } from "react"
import { Plus, AlertTriangle, Info, Zap, Pencil, Trash2, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { trpc }   from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

/* ── Types ── */
type Severity = "CRÍTICA" | "MENOR" | "INFORMACIÓN"

interface DbRule {
  id: string; name: string; description: string
  severity: string; isSystem: boolean; enabled: boolean
  createdAt: Date | string; updatedAt: Date | string
}

/* ── Severity config ── */
const SEV: Record<Severity, { color: string; soft: string; icon: React.ReactNode }> = {
  "CRÍTICA":     { color: "var(--loss)",   soft: "var(--loss-soft)",   icon: <AlertTriangle size={9} /> },
  "MENOR":       { color: "var(--be)",     soft: "var(--be-soft)",     icon: <Zap size={9} /> },
  "INFORMACIÓN": { color: "var(--accent)", soft: "var(--accent-soft)", icon: <Info size={9} /> },
}

function SevBadge({ sev }: { sev: string }) {
  const cfg = SEV[sev as Severity] ?? SEV["INFORMACIÓN"]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: cfg.soft, color: cfg.color }}>
      {cfg.icon} {sev}
    </span>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? "var(--win)" : "var(--line)" }}
    >
      <span className="absolute top-[3px] rounded-full bg-white transition-all"
        style={{ left: on ? 21 : 3, width: 16, height: 16, boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
    </button>
  )
}

/* ── Rule Row ── */
function RuleRow({ rule, onEdit, onDelete, onToggle }: {
  rule: DbRule
  onEdit?: (r: DbRule) => void
  onDelete?: (r: DbRule) => void
  onToggle: (id: string, v: boolean) => void
}) {
  const cfg = SEV[rule.severity as Severity] ?? SEV["INFORMACIÓN"]
  return (
    <div className="flex items-start gap-3.5 px-5 py-3.5 border-b border-[var(--line)] last:border-0 transition-opacity"
      style={{ opacity: rule.enabled ? 1 : 0.45 }}>
      <div className="w-[3px] self-stretch rounded-full shrink-0 min-h-[32px]" style={{ background: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-[var(--ink)]">{rule.name}</p>
          {rule.isSystem && (
            <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">AUTO</span>
          )}
          <SevBadge sev={rule.severity} />
        </div>
        {rule.description && (
          <p className="text-[12px] text-[var(--ink-3)] mt-0.5 leading-snug">{rule.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Toggle on={rule.enabled} onChange={v => onToggle(rule.id, v)} />
        {!rule.isSystem && onEdit && (
          <button onClick={() => onEdit(rule)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors">
            <Pencil size={13} />
          </button>
        )}
        {!rule.isSystem && onDelete && (
          <button onClick={() => onDelete(rule)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--loss)] hover:bg-[var(--loss-soft)] transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Rule Modal ── */
const SEVERITIES: Severity[] = ["CRÍTICA", "MENOR", "INFORMACIÓN"]
interface RuleForm { name: string; description: string; severity: Severity; enabled: boolean }
const FORM_INIT: RuleForm = { name: "", description: "", severity: "CRÍTICA", enabled: true }

function RuleModal({ open, onOpenChange, editRule }: {
  open: boolean; onOpenChange: (v: boolean) => void; editRule?: DbRule | null
}) {
  const isEdit = !!editRule
  const utils  = trpc.useUtils()
  const [form, setForm] = useState<RuleForm>(FORM_INIT)

  useEffect(() => {
    if (open) {
      setForm(editRule
        ? { name: editRule.name, description: editRule.description, severity: editRule.severity as Severity, enabled: editRule.enabled }
        : FORM_INIT
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editRule?.id])

  const createMut = trpc.rules.create.useMutation({ onSuccess: () => { utils.rules.list.invalidate(); onOpenChange(false) }, onError: (err) => toast.error(formatErrorForUser(err)) })
  const updateMut = trpc.rules.update.useMutation({ onSuccess: () => { utils.rules.list.invalidate(); onOpenChange(false) }, onError: (err) => toast.error(formatErrorForUser(err)) })

  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = createMut.isPending || updateMut.isPending

  const handleSave = () => {
    if (!form.name.trim()) return
    const payload = { name: form.name.trim(), description: form.description.trim(), severity: form.severity, enabled: form.enabled }
    if (isEdit && editRule) updateMut.mutate({ id: editRule.id, ...payload })
    else createMut.mutate(payload)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => onOpenChange(false)}>
      <div className="w-full sm:max-w-[460px] bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 bg-[var(--accent-soft)]">
            <ShieldCheck size={15} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--ink)]">{isEdit ? "Editar regla" : "Nueva regla"}</p>
            <p className="text-[11px] text-[var(--ink-3)]">{isEdit ? "Modifica los detalles" : "Se verifica manualmente al revisar un trade"}</p>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-eyebrow block mb-1.5">Nombre *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ej. Promediar pérdida"
              className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
          </div>
          <div>
            <label className="text-eyebrow block mb-1.5">Descripción</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="¿Qué comportamiento detecta o prohíbe esta regla?" rows={3}
              className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] resize-none transition-colors" />
          </div>
          <div>
            <p className="text-eyebrow mb-2">Severidad</p>
            <div className="flex gap-2">
              {SEVERITIES.map(s => {
                const cfg = SEV[s]; const active = form.severity === s
                return (
                  <button key={s} onClick={() => set("severity", s)}
                    className="flex-1 h-9 rounded-[var(--radius-sm)] text-[11px] font-bold tracking-wide transition-colors"
                    style={{
                      border:     active ? `1.5px solid ${cfg.color}` : "1px solid var(--line)",
                      background: active ? cfg.soft : "var(--chip)",
                      color:      active ? cfg.color : "var(--ink-2)",
                    }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[13px] font-medium text-[var(--ink)]">Regla activa</p>
              <p className="text-[11px] text-[var(--ink-3)]">Aparecerá en la revisión de trades</p>
            </div>
            <Toggle on={form.enabled} onChange={v => set("enabled", v)} />
          </div>
        </div>
        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex gap-2">
          <button onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.name.trim() || isSaving}
            className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)" }}>
            {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear regla"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm ── */
function DeleteConfirm({ rule, onCancel, onConfirm }: { rule: DbRule; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }} onClick={onCancel}>
      <div className="w-full sm:max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--loss-soft)" }}>
            <Trash2 size={15} className="text-[var(--loss)]" />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--ink)]">Eliminar regla</p>
            <p className="text-[11px] text-[var(--ink-3)]">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12.5px] text-[var(--ink-2)] leading-relaxed">
            ¿Eliminar <strong className="text-[var(--ink)]">"{rule.name}"</strong>?
          </p>
        </div>
        <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex gap-2">
          <button onClick={onCancel}
            className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white"
            style={{ background: "var(--loss)" }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */
type FilterType = "todas" | "sistema" | "custom"

export default function ReglasPage() {
  const utils = trpc.useUtils()

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editRule,   setEditRule]   = useState<DbRule | null>(null)
  const [deleteRule, setDeleteRule] = useState<DbRule | null>(null)
  const [filter,     setFilter]     = useState<FilterType>("todas")

  const { data: rules = [], isLoading } = trpc.rules.list.useQuery()
  const seedMut   = trpc.rules.seedDefaults.useMutation({ onSuccess: () => utils.rules.list.invalidate(), onError: (err) => toast.error(formatErrorForUser(err)) })
  const toggleMut = trpc.rules.toggle.useMutation({ onSuccess: () => utils.rules.list.invalidate(), onError: (err) => toast.error(formatErrorForUser(err)) })
  const deleteMut = trpc.rules.delete.useMutation({ onSuccess: () => { utils.rules.list.invalidate(); setDeleteRule(null) }, onError: (err) => toast.error(formatErrorForUser(err)) })

  useEffect(() => {
    if (!isLoading && rules.length === 0) seedMut.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rules.length])

  const systemRules = rules.filter(r => r.isSystem)
  const customRules = rules.filter(r => !r.isSystem)
  const activeCount = rules.filter(r => r.enabled).length
  const critActive  = rules.filter(r => r.severity === "CRÍTICA" && r.enabled).length

  const visibleSystem = filter === "custom"  ? [] : systemRules
  const visibleCustom = filter === "sistema" ? [] : customRules

  return (
    <>
      <TopBar
        title="Reglas de conducta"
        subtitle={`${systemRules.length} sistema · ${customRules.length} personalizadas`}
        actions={[{
          label: "Nueva regla", icon: <Plus size={14} />, variant: "primary",
          onClick: () => { setEditRule(null); setModalOpen(true) },
        }]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Reglas activas",   value: isLoading ? "…" : activeCount.toString(),                        color: "var(--ink)",                                    icon: <ShieldCheck size={14} /> },
          { label: "Reglas sistema",   value: isLoading ? "…" : systemRules.length.toString(),                 color: "var(--accent)",                                 icon: <XCircle size={14} /> },
          { label: "Críticas activas", value: isLoading ? "…" : critActive.toString(),                         color: critActive > 0 ? "var(--loss)" : "var(--ink)",   icon: <AlertTriangle size={14} /> },
          { label: "Personalizadas",   value: isLoading ? "…" : customRules.length.toString(),                 color: "var(--win)",                                    icon: <CheckCircle2 size={14} /> },
        ].map(k => (
          <div key={k.label} className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-eyebrow">{k.label}</p>
              <span className="text-[var(--ink-3)] opacity-65">{k.icon}</span>
            </div>
            <p className="text-[22px] font-mono font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5">
        {([["todas","Todas"], ["sistema","Sistema"], ["custom","Personalizadas"]] as [FilterType, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="h-8 px-3.5 rounded-[var(--radius-sm)] text-[12.5px] transition-colors border"
            style={{
              background:  filter === v ? "var(--ink)"  : "var(--chip)",
              color:       filter === v ? "var(--bg)"   : "var(--ink-2)",
              borderColor: filter === v ? "var(--ink)"  : "var(--line)",
              fontWeight:  filter === v ? 600 : 400,
            }}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[var(--ink-3)]">Cargando reglas…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Sistema */}
          {visibleSystem.length > 0 && (
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
                <p className="text-eyebrow">Sistema · automáticas</p>
                <span className="text-[10px] text-[var(--ink-3)]">Se verifican automáticamente</span>
              </div>
              {visibleSystem.map(r => <RuleRow key={r.id} rule={r} onToggle={(id, v) => toggleMut.mutate({ id, enabled: v })} />)}
            </div>
          )}

          {/* Personalizadas */}
          {visibleCustom.length > 0 ? (
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
                <p className="text-eyebrow">Personalizadas · manuales</p>
                <span className="text-[10px] text-[var(--ink-3)]">Marcas al revisar cada trade</span>
              </div>
              {visibleCustom.map(r => (
                <RuleRow key={r.id} rule={r}
                  onToggle={(id, v) => toggleMut.mutate({ id, enabled: v })}
                  onEdit={rule => { setEditRule(rule); setModalOpen(true) }}
                  onDelete={setDeleteRule}
                />
              ))}
            </div>
          ) : filter !== "sistema" && (
            <div className="border border-dashed border-[var(--line)] rounded-[var(--radius)] py-12 flex flex-col items-center gap-3 text-center">
              <p className="text-[13px] text-[var(--ink-2)] font-medium">Sin reglas personalizadas</p>
              <p className="text-[12px] text-[var(--ink-3)]">Crea reglas para detectar tus patrones de error.</p>
              <button onClick={() => { setEditRule(null); setModalOpen(true) }}
                className="flex items-center gap-1.5 h-8 px-4 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
                <Plus size={12} /> Nueva regla
              </button>
            </div>
          )}
        </div>
      )}

      <RuleModal
        open={modalOpen}
        onOpenChange={v => { setModalOpen(v); if (!v) setEditRule(null) }}
        editRule={editRule}
      />

      {deleteRule && (
        <DeleteConfirm
          rule={deleteRule}
          onCancel={() => setDeleteRule(null)}
          onConfirm={() => deleteMut.mutate(deleteRule.id)}
        />
      )}
    </>
  )
}

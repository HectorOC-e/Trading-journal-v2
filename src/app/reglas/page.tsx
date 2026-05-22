"use client"

import { useState } from "react"
import { Plus, AlertTriangle, Info, Zap, Pencil, Trash2, ShieldCheck, XCircle, CheckCircle2, BarChart2 } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { mockRules } from "@/mock-data"
import type { Rule, RulesSeverity } from "@/types"

/* ── Severity config ── */
const SEV = {
  "CRÍTICA":     { color: "var(--loss)",   soft: "var(--loss-soft)",   icon: AlertTriangle },
  "MENOR":       { color: "var(--be)",     soft: "var(--be-soft)",     icon: Zap },
  "INFORMACIÓN": { color: "var(--accent)", soft: "var(--accent-soft)", icon: Info },
} as const

function SevBadge({ sev }: { sev: RulesSeverity }) {
  const cfg = SEV[sev]
  const Icon = cfg.icon
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      background: cfg.soft, color: cfg.color,
      fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
    }}>
      <Icon size={9} />
      {sev}
    </span>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 40, height: 22, borderRadius: 11,
      background: on ? "var(--win)" : "var(--line-2)",
      border: "none", cursor: "pointer", flexShrink: 0,
      position: "relative", transition: "background .15s",
    }}>
      <span style={{
        position: "absolute", top: 3,
        left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "white", transition: "left .15s",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
      }} />
    </button>
  )
}

/* ── Rule row ── */
function RuleRow({ rule, onEdit, onDelete, onToggle }: {
  rule: Rule
  onEdit?: (r: Rule) => void
  onDelete?: (id: string) => void
  onToggle: (id: string, v: boolean) => void
}) {
  const cfg = SEV[rule.severity]
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "14px 20px",
      borderBottom: "1px solid var(--line)",
      opacity: rule.enabled ? 1 : 0.5,
    }}>
      {/* Severity stripe */}
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: cfg.color, flexShrink: 0, minHeight: 32 }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{rule.name}</p>
          {rule.isSystem && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent)", letterSpacing: ".08em" }}>
              AUTO
            </span>
          )}
          <SevBadge sev={rule.severity} />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{rule.description}</p>
      </div>

      {/* Right: violations + toggle + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {rule.violationsThisMonth > 0 && (
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11, fontWeight: 700,
            color: "var(--loss)",
            background: "var(--loss-soft)",
            padding: "2px 7px", borderRadius: 999,
          }}>
            {rule.violationsThisMonth} viol.
          </span>
        )}
        <Toggle on={rule.enabled} onChange={v => onToggle(rule.id, v)} />
        {!rule.isSystem && onEdit && (
          <button onClick={() => onEdit(rule)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "grid", placeItems: "center" }}>
            <Pencil size={13} />
          </button>
        )}
        {!rule.isSystem && onDelete && (
          <button onClick={() => onDelete(rule.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--loss)", padding: 4, borderRadius: 6, display: "grid", placeItems: "center" }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Modal ── */
const SEVERITIES: RulesSeverity[] = ["CRÍTICA", "MENOR", "INFORMACIÓN"]

function RuleModal({ open, rule, onClose, onSave }: {
  open: boolean
  rule?: Rule | null
  onClose: () => void
  onSave: (data: Omit<Rule, "id" | "isSystem" | "violationsThisMonth">) => void
}) {
  const [name, setName]   = useState(rule?.name ?? "")
  const [desc, setDesc]   = useState(rule?.description ?? "")
  const [sev,  setSev]    = useState<RulesSeverity>(rule?.severity ?? "CRÍTICA")
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)

  if (!open) return null

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: desc.trim(), severity: sev, enabled })
    onClose()
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: "var(--radius)", padding: 24, width: "100%", maxWidth: 460,
        display: "flex", flexDirection: "column", gap: 18,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
            {rule ? "Editar regla" : "Nueva regla CUSTOM"}
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            Las reglas CUSTOM se verifican manualmente cuando revisas un trade.
          </p>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Nombre *
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Ej. Promediar pérdida"
            style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--ink)", fontSize: 13, outline: "none" }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Descripción *
          </label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="¿Qué comportamiento detecta o prohíbe esta regla?"
            rows={3}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--ink)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Severity */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 8 }}>Severidad</p>
          <div style={{ display: "flex", gap: 8 }}>
            {SEVERITIES.map(s => {
              const cfg = SEV[s]
              const active = sev === s
              return (
                <button key={s} onClick={() => setSev(s)} style={{
                  flex: 1, height: 36, borderRadius: "var(--radius-sm)",
                  border: active ? `1.5px solid ${cfg.color}` : "1px solid var(--line)",
                  background: active ? cfg.soft : "var(--chip)",
                  color: active ? cfg.color : "var(--ink-2)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  letterSpacing: ".05em",
                }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Enabled toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Regla activa</p>
            <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Aparecerá en la revisión de trades.</p>
          </div>
          <Toggle on={enabled} onChange={setEnabled} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--chip)", border: "1px solid var(--line)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!name.trim()} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-sm)", background: name.trim() ? "var(--accent)" : "var(--chip)", color: name.trim() ? "white" : "var(--ink-3)", fontSize: 13, fontWeight: 600, border: "none", cursor: name.trim() ? "pointer" : "default" }}>
            {rule ? "Guardar cambios" : "Crear regla"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */
export default function ReglasPage() {
  const [rules, setRules] = useState<Rule[]>(mockRules)
  const [modal, setModal] = useState<{ open: boolean; rule?: Rule | null }>({ open: false })
  const [filter, setFilter] = useState<"todas" | "sistema" | "custom">("todas")

  const systemRules = rules.filter(r => r.isSystem)
  const customRules = rules.filter(r => !r.isSystem)
  const totalViol   = rules.reduce((s, r) => s + r.violationsThisMonth, 0)

  const handleToggle = (id: string, v: boolean) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: v } : r))

  const handleSave = (data: Omit<Rule, "id" | "isSystem" | "violationsThisMonth">) => {
    if (modal.rule) {
      setRules(prev => prev.map(r => r.id === modal.rule!.id ? { ...r, ...data } : r))
    } else {
      const newRule: Rule = { id: `rule-cus-${Date.now()}`, isSystem: false, violationsThisMonth: 0, ...data }
      setRules(prev => [...prev, newRule])
    }
  }

  const handleDelete = (id: string) => setRules(prev => prev.filter(r => r.id !== id))

  const visibleSystem = filter === "custom" ? [] : systemRules
  const visibleCustom = filter === "sistema" ? [] : customRules

  return (
    <>
      <div className="main-content">
        <TopBar
          title="Reglas de conducta"
          subtitle={`${systemRules.length} sistema · ${customRules.length} personalizadas · ${totalViol} violaciones este mes`}
          actions={[{ label: "Nueva regla", icon: <Plus size={14} />, variant: "primary", onClick: () => setModal({ open: true, rule: null }) }]}
        />

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {([["todas","Todas"], ["sistema","Sistema"], ["custom","Personalizadas"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)",
              background: filter === v ? "var(--ink)" : "var(--chip)",
              color: filter === v ? "var(--bg)" : "var(--ink-2)",
              fontSize: 12.5, fontWeight: filter === v ? 600 : 400,
              border: "1px solid var(--line)", cursor: "pointer",
            }}>
              {l}
            </button>
          ))}
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Reglas activas",   value: rules.filter(r => r.enabled).length.toString(),                                                                                     color: "var(--ink)",  icon: <ShieldCheck size={15} /> },
            { label: "Violaciones mes",  value: totalViol.toString(),                                                                                                                color: totalViol > 0 ? "var(--loss)" : "var(--win)",  icon: <XCircle size={15} /> },
            { label: "Críticas activas", value: rules.filter(r => r.severity === "CRÍTICA" && r.enabled).length.toString(),                                                          color: "var(--loss)", icon: <AlertTriangle size={15} /> },
            { label: "Cumplimiento",     value: `${Math.round((1 - totalViol / Math.max(1, rules.reduce((s,r)=>s+r.violationsThisMonth+10,0))) * 100)}%`,                            color: "var(--win)",  icon: <CheckCircle2 size={15} /> },
          ].map(k => (
            <div key={k.label} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)" }}>{k.label}</p>
                <span style={{ color: "var(--ink-3)", opacity: 0.65 }}>{k.icon}</span>
              </div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Sistema rules */}
        {visibleSystem.length > 0 && (
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Sistema · automáticas</p>
              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Se verifican automáticamente en cada trade</span>
            </div>
            {visibleSystem.map(r => (
              <RuleRow key={r.id} rule={r} onToggle={handleToggle} />
            ))}
          </div>
        )}

        {/* Custom rules */}
        {visibleCustom.length > 0 ? (
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Personalizadas · manuales</p>
              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>Marcas al revisar cada trade</span>
            </div>
            {visibleCustom.map(r => (
              <RuleRow key={r.id} rule={r}
                onToggle={handleToggle}
                onEdit={rule => setModal({ open: true, rule })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : filter !== "sistema" && (
          <div style={{ border: "1.5px dashed var(--line)", borderRadius: "var(--radius)", padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>Sin reglas personalizadas. Crea la primera para detectar tus patrones de error.</p>
            <button onClick={() => setModal({ open: true, rule: null })} style={{ height: 34, padding: "0 16px", borderRadius: "var(--radius-sm)", background: "var(--chip)", border: "1px solid var(--line)", color: "var(--ink-2)", fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} /> Nueva regla
            </button>
          </div>
        )}
      </div>

      <RuleModal
        open={modal.open}
        rule={modal.rule}
        onClose={() => setModal({ open: false })}
        onSave={handleSave}
      />
    </>
  )
}

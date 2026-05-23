"use client"

import { useState } from "react"
import { Plus, X, Star, TrendingUp, TrendingDown, ChevronRight, Circle, CheckCircle2, Pencil, Copy, Pause, Play, Percent, Award, BarChart2, Trash2 } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"

/* ── Types ── */
type Direction  = "LONG" | "SHORT" | "AMBAS"
type SetupStatus = "ACTIVO" | "PAUSADO"

interface DbSetup {
  id:               string
  name:             string
  abbreviation:     string
  market:           string
  direction:        string
  status:           string
  description:      string
  color:            string
  aplusChecklist:   string[]
  standardChecklist: string[]
  createdAt:        Date | string
  updatedAt:        Date | string
}

/* ── Sparkline flat placeholder ── */
function SparklinePlaceholder({ color, height = 44 }: { color: string; height?: number }) {
  const W = 200
  const mid = height / 2
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <line x1="0" y1={mid} x2={W} y2={mid} stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.4" />
    </svg>
  )
}

/* ── Session pill ── */
const SESSION_COLORS: Record<string, { bg: string; text: string }> = {
  "New York":     { bg: "rgba(79,110,247,0.12)",   text: "#4f6ef7" },
  "London":       { bg: "rgba(168,85,247,0.12)",   text: "#a855f7" },
  "Asia":         { bg: "rgba(245,158,11,0.12)",   text: "#f59e0b" },
  "London Close": { bg: "rgba(100,116,139,0.12)",  text: "#64748b" },
}

/* ── Stat chip ── */
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold">{label}</span>
      <span className="text-[13px] font-mono font-bold text-[var(--ink-2)]">{value}</span>
    </div>
  )
}

/* ── Setup Card ── */
function SetupCard({ setup, selected, onClick }: { setup: DbSetup; selected: boolean; onClick: () => void }) {
  const sparkColor = setup.status === "PAUSADO" ? "var(--ink-3)" : "var(--accent)"

  return (
    <div
      onClick={onClick}
      className="rounded-[var(--radius)] border bg-[var(--panel)] flex flex-col cursor-pointer transition-all duration-150 overflow-hidden"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--line)",
        boxShadow:   selected ? "0 0 0 1px var(--accent)" : "none",
        opacity:     setup.status === "PAUSADO" ? 0.75 : 1,
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: setup.color, opacity: setup.status === "PAUSADO" ? 0.4 : 1 }} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: setup.color, opacity: setup.status === "PAUSADO" ? 0.5 : 1 }}
            >
              {setup.abbreviation}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--ink)] leading-tight truncate">{setup.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[var(--ink-3)]">{setup.market}</span>
                {setup.market && <span className="text-[var(--line)]">·</span>}
                <span className="text-[10px] text-[var(--ink-3)]">{setup.direction}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {setup.status === "PAUSADO" ? (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink-3)]">PAUSADO</span>
            ) : (
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ background: "#22c55e" }}>ACTIVO</span>
            )}
          </div>
        </div>

        {/* Sparkline placeholder */}
        <div style={{ margin: "0 -4px" }}>
          <SparklinePlaceholder color={sparkColor} height={44} />
        </div>

        {/* Stats row — sin trades */}
        <div className="flex justify-between items-center">
          <StatChip label="Win %" value="—" />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="Avg R" value="—" />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="P&L" value="—" />
          <div className="w-px h-6 bg-[var(--line)]" />
          <StatChip label="Trades" value="0" />
        </div>

        {/* Expectancy bar placeholder */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[var(--ink-3)]">Expectancy</span>
            <span className="text-[10px] font-mono text-[var(--ink-3)]">— sin trades</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--line)] overflow-hidden" />
        </div>

        <button className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors mt-auto">
          Ver detalle <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── Setup Detail Panel ── */
function SetupDetailPanel({
  setup, onClose, onEdit, onToggleStatus, onDuplicate, onDelete,
}: {
  setup: DbSetup
  onClose: () => void
  onEdit: (s: DbSetup) => void
  onToggleStatus: (s: DbSetup) => void
  onDuplicate: (s: DbSetup) => void
  onDelete: (s: DbSetup) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-[var(--line)] flex items-start justify-between gap-3 sticky top-0 bg-[var(--panel)] z-10">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold text-white"
            style={{ background: setup.color }}>
            {setup.abbreviation}
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-[var(--ink)]">{setup.name}</p>
            <p className="text-[11px] text-[var(--ink-3)]">{setup.market}{setup.market ? " · " : ""}{setup.direction}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--chip)] transition-colors">
          <X size={14} className="text-[var(--ink-3)]" />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Equity curve placeholder */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-eyebrow">Curva de equity</span>
            <span className="text-[11px] text-[var(--ink-3)]">— sin trades</span>
          </div>
          <SparklinePlaceholder color="var(--accent)" height={64} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Win Rate",   value: "—" },
            { label: "Avg R",      value: "—" },
            { label: "Expectancy", value: "—" },
            { label: "A+ Rate",    value: "—" },
            { label: "Trades",     value: "0" },
            { label: "Net P&L",    value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
              <p className="text-[14px] font-mono font-bold text-[var(--ink-3)]">{value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {setup.description && (
          <div>
            <p className="text-eyebrow mb-2">Descripción</p>
            <p className="text-[12px] text-[var(--ink-2)] leading-relaxed bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
              {setup.description}
            </p>
          </div>
        )}

        {/* A+ Checklist */}
        {setup.aplusChecklist.filter(Boolean).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star size={11} className="text-[var(--be)] fill-[var(--be)]" />
              <p className="text-eyebrow">A+ Checklist</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {setup.aplusChecklist.filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
                  <CheckCircle2 size={13} className="text-[var(--be)] mt-0.5 shrink-0" />
                  <span className="text-[12px] text-[var(--ink-2)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Checklist */}
        {setup.standardChecklist.filter(Boolean).length > 0 && (
          <div>
            <p className="text-eyebrow mb-2">Standard Checklist</p>
            <div className="flex flex-col gap-1.5">
              {setup.standardChecklist.filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
                  <Circle size={13} className="text-[var(--ink-3)] mt-0.5 shrink-0" />
                  <span className="text-[12px] text-[var(--ink-2)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onEdit(setup)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            <Pencil size={11} /> Editar
          </button>
          <button
            onClick={() => onDuplicate(setup)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            <Copy size={11} /> Duplicar
          </button>
          <button
            onClick={() => onToggleStatus(setup)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            {setup.status === "ACTIVO" ? <><Pause size={11} /> Pausar</> : <><Play size={11} /> Activar</>}
          </button>
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium text-[var(--loss)] hover:bg-[var(--loss-soft)] transition-colors border border-transparent hover:border-[var(--loss)]"
          >
            <Trash2 size={11} /> Eliminar setup
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-sm)] border border-[var(--loss)] bg-[var(--loss-soft)]">
            <p className="text-[12px] text-[var(--loss)] font-semibold text-center">¿Eliminar "{setup.name}"?</p>
            <p className="text-[11px] text-[var(--ink-3)] text-center">Se perderán los datos del setup (los trades no se eliminan).</p>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 rounded text-[12px] bg-[var(--chip)] text-[var(--ink-2)]">Cancelar</button>
              <button onClick={() => onDelete(setup)} className="flex-1 py-1.5 rounded text-[12px] bg-[var(--loss)] text-white font-semibold">Eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── ChecklistEditor helper ── */
function ChecklistEditor({
  title, icon, items, onChange,
}: {
  title: string
  icon?: React.ReactNode
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-eyebrow">{title}</p>
        <span className="text-[10px] text-[var(--ink-3)] ml-auto">{items.length} ítems</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-[var(--line)] bg-[var(--panel-2)] flex items-center justify-center shrink-0">
              <span className="text-[9px] text-[var(--ink-3)]">{i + 1}</span>
            </div>
            <input
              className="flex-1 h-8 px-2.5 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              value={item}
              placeholder={`Ítem ${i + 1}…`}
              onChange={e => {
                const next = [...items]; next[i] = e.target.value; onChange(next)
              }}
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1 text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ""])}
          className="flex items-center justify-center gap-1.5 h-8 text-[11px] text-[var(--ink-3)] border border-dashed border-[var(--line)] rounded-[var(--radius-sm)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus size={11} /> Añadir ítem
        </button>
      </div>
    </div>
  )
}

/* ── Setup Modal (create + edit) ── */
const COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#4f6ef7", "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#6b7280"]
const MARKETS = ["NQ Futures", "ES Futures", "GC Futures", "FX", "Equities", "Crypto", "Otro"]

interface SetupForm {
  name:             string
  abbr:             string
  market:           string
  direction:        Direction
  status:           SetupStatus
  description:      string
  color:            string
  aplusChecklist:   string[]
  standardChecklist: string[]
}

const FORM_INIT: SetupForm = {
  name: "", abbr: "", market: "NQ Futures", direction: "AMBAS", status: "ACTIVO",
  description: "", color: "#4f6ef7",
  aplusChecklist: ["", "", ""],
  standardChecklist: ["Setup #1 o #2 del día", "Risk ≤ 1R", "RR mínimo 2:1", ""],
}

function SetupModal({
  open, onOpenChange, editSetup,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editSetup?: DbSetup | null
}) {
  const isEdit = !!editSetup
  const utils  = trpc.useUtils()

  const [form, setForm] = useState<SetupForm>(FORM_INIT)
  const [tab,  setTab]  = useState<"info" | "checklist">("info")

  const createMut = trpc.setups.create.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) },
  })
  const updateMut = trpc.setups.update.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) },
  })

  /* Populate form when editing */
  const handleOpen = (v: boolean) => {
    if (v && editSetup) {
      setForm({
        name:             editSetup.name,
        abbr:             editSetup.abbreviation,
        market:           editSetup.market,
        direction:        editSetup.direction as Direction,
        status:           editSetup.status as SetupStatus,
        description:      editSetup.description,
        color:            editSetup.color,
        aplusChecklist:   editSetup.aplusChecklist.length ? editSetup.aplusChecklist : ["", "", ""],
        standardChecklist: editSetup.standardChecklist.length ? editSetup.standardChecklist : [""],
      })
    } else if (!v) {
      setForm(FORM_INIT)
      setTab("info")
    }
    onOpenChange(v)
  }

  const set = <K extends keyof SetupForm>(key: K, val: SetupForm[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    const payload = {
      name:             form.name.trim(),
      abbreviation:     form.abbr.trim().toUpperCase(),
      market:           form.market,
      direction:        form.direction,
      status:           form.status,
      description:      form.description.trim(),
      color:            form.color,
      aplusChecklist:   form.aplusChecklist.filter(Boolean),
      standardChecklist: form.standardChecklist.filter(Boolean),
    }
    if (!payload.name || !payload.abbreviation) return
    if (isEdit && editSetup) {
      updateMut.mutate({ id: editSetup.id, ...payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-sm font-bold text-white"
              style={{ background: form.color }}>
              {form.abbr || "??"}
            </span>
            <div>
              <DialogTitle className="text-[var(--ink)]">{form.name || "Nombre del setup"}</DialogTitle>
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{form.market} · {form.direction}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[var(--radius-sm)] mb-1">
          {(["info", "checklist"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors capitalize",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}>
              {t === "info" ? "📋 Información" : "✓ Checklists"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Nombre del setup *</label>
                <Input placeholder="MMXM — Breaker Block" value={form.name}
                  onChange={e => set("name", e.target.value)} />
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Abreviatura *</label>
                <Input placeholder="BB" value={form.abbr} maxLength={4}
                  onChange={e => set("abbr", e.target.value.toUpperCase())} mono />
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Mercado</label>
              <div className="flex gap-1.5 flex-wrap">
                {MARKETS.map(m => (
                  <button key={m} onClick={() => set("market", m)}
                    className={cn("px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors",
                      form.market === m
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                    )}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-eyebrow mb-1.5">Dirección</p>
                <div className="flex gap-1.5">
                  {(["LONG", "SHORT", "AMBAS"] as Direction[]).map(d => (
                    <button key={d} onClick={() => set("direction", d)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.direction === d
                          ? d === "LONG"  ? "bg-[var(--win)] text-white"
                            : d === "SHORT" ? "bg-[var(--loss)] text-white"
                            : "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-eyebrow mb-1.5">Estado</p>
                <div className="flex gap-1.5">
                  {(["ACTIVO", "PAUSADO"] as SetupStatus[]).map(s => (
                    <button key={s} onClick={() => set("status", s)}
                      className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                        form.status === s
                          ? s === "ACTIVO" ? "text-white" : "bg-[var(--chip)] text-[var(--ink-2)]"
                          : "bg-[var(--chip)] text-[var(--ink-3)]"
                      )}
                      style={form.status === s && s === "ACTIVO" ? { background: "#22c55e" } : {}}>
                      {s === "ACTIVO" ? "✓ Activo" : "⏸ Pausado"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-eyebrow mb-1.5">Color del setup</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => set("color", c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      background:    c,
                      outline:       form.color === c ? `2px solid ${c}` : "none",
                      outlineOffset: 2,
                    }} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Descripción</label>
              <Textarea
                placeholder="¿En qué condiciones se ejecuta este setup? Describe el contexto de mercado, la estructura necesaria y los puntos clave de entrada…"
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>

            <button
              onClick={() => setTab("checklist")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors"
            >
              Continuar → Definir Checklists
            </button>
          </div>
        )}

        {tab === "checklist" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Star size={14} className="text-[var(--be)] fill-[var(--be)] shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-[var(--be)]">A+ Checklist</p>
                <p className="text-[11px] text-[var(--ink-3)]">Criterios óptimos. Cuando se cumplan todos → el trade se marca automáticamente como A+.</p>
              </div>
            </div>

            <ChecklistEditor
              title="A+ Checklist"
              icon={<Star size={11} className="text-[var(--be)] fill-[var(--be)]" />}
              items={form.aplusChecklist}
              onChange={items => set("aplusChecklist", items)}
            />

            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] mb-4"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <Circle size={14} className="text-[var(--accent)] shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">Standard Checklist</p>
                  <p className="text-[11px] text-[var(--ink-3)]">Criterios mínimos para tomar el trade. Si se cumplen todos → se marca como Plan.</p>
                </div>
              </div>
              <ChecklistEditor
                title="Standard Checklist"
                items={form.standardChecklist}
                onChange={items => set("standardChecklist", items)}
              />
            </div>

            <div className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4 border border-[var(--line)]">
              <p className="text-eyebrow mb-3">Resumen del setup</p>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: form.color }}>
                  {form.abbr || "??"}
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">{form.name || "Nombre del setup"}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">{form.market} · {form.direction} · {form.status}</p>
                </div>
              </div>
              <div className="flex gap-4 text-[11px]">
                <div>
                  <Star size={10} className="inline text-[var(--be)] fill-[var(--be)] mr-1" />
                  <span className="text-[var(--ink-3)]">A+:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.aplusChecklist.filter(Boolean).length} ítems</span>
                </div>
                <div>
                  <Circle size={10} className="inline text-[var(--accent)] mr-1" />
                  <span className="text-[var(--ink-3)]">Standard:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.standardChecklist.filter(Boolean).length} ítems</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "checklist" && (
            <Button variant="ghost" onClick={() => setTab("info")}>← Volver</Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.abbr.trim()}>
            {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear setup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── KPI strip ── */
function KpiBox({ label, value, sub, positive, icon }: { label: string; value: string; sub: string; positive?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <p className="text-eyebrow">{label}</p>
        {icon && <span style={{ color: "var(--ink-3)", opacity: 0.65 }}>{icon}</span>}
      </div>
      <p className={cn("text-[22px] font-mono font-bold leading-none",
        positive === undefined ? "text-[var(--ink)]" : positive ? "text-[var(--win)]" : "text-[var(--loss)]")}>
        {value}
      </p>
      <p className="text-[11px] text-[var(--ink-3)] mt-1">{sub}</p>
    </div>
  )
}

/* ── Page ── */
const MARKET_FILTERS = [
  { value: "TODOS",       label: "Todos" },
  { value: "NQ Futures",  label: "NQ" },
  { value: "ES Futures",  label: "ES" },
  { value: "FX",          label: "FX" },
  { value: "Equities",    label: "Equities" },
]
const STATUS_FILTERS = [
  { value: "TODOS",   label: "Todos" },
  { value: "ACTIVO",  label: "Activos" },
  { value: "PAUSADO", label: "Pausados" },
]

export default function PlaybookPage() {
  const utils = trpc.useUtils()

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editSetup,  setEditSetup]  = useState<DbSetup | null>(null)
  const [selected,   setSelected]   = useState<DbSetup | null>(null)
  const [marketF,    setMarketF]    = useState("TODOS")
  const [statusF,    setStatusF]    = useState("ACTIVO")

  const { data: setups = [], isLoading } = trpc.setups.list.useQuery()

  const toggleMut = trpc.setups.toggleStatus.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setSelected(null) },
  })
  const deleteMut = trpc.setups.delete.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setSelected(null) },
  })
  const createMut = trpc.setups.create.useMutation({
    onSuccess: () => utils.setups.list.invalidate(),
  })

  const active = setups.filter(s => s.status === "ACTIVO")

  const visible = setups.filter(s => {
    const mOk = marketF === "TODOS" || s.market === marketF
    const sOk = statusF === "TODOS" || s.status === statusF
    return mOk && sOk
  })

  const handleEdit  = (s: DbSetup) => { setEditSetup(s); setModalOpen(true) }
  const handleToggle = (s: DbSetup) =>
    toggleMut.mutate({ id: s.id, status: s.status === "ACTIVO" ? "PAUSADO" : "ACTIVO" })
  const handleDuplicate = (s: DbSetup) =>
    createMut.mutate({
      name:             s.name + " (copia)",
      abbreviation:     s.abbreviation,
      market:           s.market,
      direction:        s.direction as Direction,
      status:           "PAUSADO",
      description:      s.description,
      color:            s.color,
      aplusChecklist:   s.aplusChecklist,
      standardChecklist: s.standardChecklist,
    })
  const handleDelete = (s: DbSetup) => deleteMut.mutate(s.id)

  return (
    <>
      <TopBar
        title="Playbook"
        subtitle={`${active.length} setups activos · ${setups.length} total`}
        actions={[{
          label: "Nuevo setup",
          icon: <Plus size={14} />,
          variant: "primary",
          onClick: () => { setEditSetup(null); setModalOpen(true) },
        }]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiBox label="P&L Total (activos)"  value="— sin trades" sub={`${active.length} setups activos`}  icon={<TrendingUp size={14} />} />
        <KpiBox label="Win Rate promedio"     value="—"            sub="sobre setups activos"               icon={<Percent size={14} />} />
        <KpiBox label="Trades totales"        value="0"            sub="todos los setups"                   icon={<BarChart2 size={14} />} />
        <KpiBox label="Mejor expectancy"      value="—"            sub={active[0]?.name ?? "sin datos"}     icon={<Award size={14} />} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <FilterBar options={MARKET_FILTERS} value={marketF} onChange={setMarketF} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={STATUS_FILTERS} value={statusF} onChange={setStatusF} />
        <span className="text-[11px] text-[var(--ink-3)] ml-auto">
          {visible.length} setup{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Main layout */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[var(--ink-3)]">Cargando setups…</div>
      ) : setups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-[var(--ink-2)] font-semibold">Aún no tienes setups</p>
          <p className="text-[12px] text-[var(--ink-3)]">Crea tu primer setup para organizar tus estrategias de trading.</p>
          <Button variant="primary" onClick={() => { setEditSetup(null); setModalOpen(true) }}>
            <Plus size={13} className="mr-1" /> Crear primer setup
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[11px] text-[var(--ink-3)]">
          Sin resultados para los filtros seleccionados.
        </div>
      ) : (
        <div className={cn("flex gap-4", selected ? "items-start" : "")}>
          {/* Cards grid */}
          <div className={cn(
            "grid gap-3 flex-1 transition-all",
            selected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          )}>
            {visible.map(s => (
              <SetupCard
                key={s.id}
                setup={s}
                selected={selected?.id === s.id}
                onClick={() => setSelected(sel => sel?.id === s.id ? null : s)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{
              width: 340, flexShrink: 0,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              position: "sticky", top: 0,
              maxHeight: "calc(100vh - 28px)",
              overflowY: "auto",
            }}>
              <SetupDetailPanel
                setup={selected}
                onClose={() => setSelected(null)}
                onEdit={handleEdit}
                onToggleStatus={handleToggle}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>
      )}

      <SetupModal
        open={modalOpen}
        onOpenChange={v => { setModalOpen(v); if (!v) setEditSetup(null) }}
        editSetup={editSetup}
      />
    </>
  )
}

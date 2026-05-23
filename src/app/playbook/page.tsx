"use client"

import { useState, useEffect } from "react"
import {
  Plus, X, Star, Circle, CheckCircle2, Pencil, Copy,
  Pause, Play, FlaskConical, Archive, Trash2, BarChart2,
  Percent, TrendingUp, ChevronDown, ImagePlus, ZoomIn,
} from "lucide-react"
import { TopBar }    from "@/components/layout/top-bar"
import { Button }    from "@/components/ui/button"
import { Input }     from "@/components/ui/input"
import { Textarea }  from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn }        from "@/lib/utils"
import { trpc }           from "@/lib/trpc/client"
import { createClient }   from "@/lib/supabase/client"

/* ── Types ── */
type Direction   = "LONG" | "SHORT" | "AMBAS"
type SetupStatus = "ACTIVO" | "EN_PRUEBA" | "PAUSADO" | "DESCARTADO"

interface DbSetup {
  id: string; name: string; abbreviation: string; market: string
  direction: string; status: string; description: string; color: string
  images: string[]
  aplusChecklist: string[]; standardChecklist: string[]
  createdAt: Date | string; updatedAt: Date | string
}

/* ── Status meta ── */
const STATUS_META: Record<SetupStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  ACTIVO:     { label: "Activo",     bg: "#22c55e",  text: "#fff",         icon: <Play size={9} /> },
  EN_PRUEBA:  { label: "En prueba",  bg: "#f59e0b",  text: "#fff",         icon: <FlaskConical size={9} /> },
  PAUSADO:    { label: "Pausado",    bg: "#475569",  text: "#fff",         icon: <Pause size={9} /> },
  DESCARTADO: { label: "Descartado", bg: "#334155",  text: "var(--ink-3)", icon: <Archive size={9} /> },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as SetupStatus] ?? STATUS_META.PAUSADO
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: meta.bg, color: meta.text }}>
      {meta.icon} {meta.label.toUpperCase()}
    </span>
  )
}

/* ── Sparkline flat placeholder ── */
function SparklinePlaceholder({ color, height = 44 }: { color: string; height?: number }) {
  const W = 200, mid = height / 2
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <line x1="0" y1={mid} x2={W} y2={mid} stroke={color} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.35" />
    </svg>
  )
}

/* ── Direction chip ── */
function DirectionChip({ direction }: { direction: string }) {
  const styles: Record<string, string> = {
    LONG:  "text-[var(--win)]  bg-[rgba(34,197,94,0.12)]",
    SHORT: "text-[var(--loss)] bg-[rgba(239,68,68,0.12)]",
    AMBAS: "text-[var(--ink-3)] bg-[var(--chip)]",
  }
  return (
    <span className={cn("text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded", styles[direction] ?? styles.AMBAS)}>
      {direction}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   Setup Card — mejorada
═══════════════════════════════════════════════ */
function SetupCard({ setup, selected, onClick }: { setup: DbSetup; selected: boolean; onClick: () => void }) {
  const isInactive  = setup.status === "PAUSADO" || setup.status === "DESCARTADO"
  const isDiscarded = setup.status === "DESCARTADO"
  const sparkColor  = isDiscarded ? "var(--ink-3)"
    : setup.status === "EN_PRUEBA" ? "#f59e0b"
    : setup.status === "PAUSADO"   ? "var(--ink-3)"
    : "var(--accent)"

  return (
    <div
      onClick={onClick}
      className="rounded-[var(--radius)] border bg-[var(--panel)] flex flex-col cursor-pointer transition-all duration-150 overflow-hidden hover:border-[var(--accent-soft)]"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--line)",
        boxShadow:   selected ? "0 0 0 1px var(--accent)" : undefined,
        opacity:     isDiscarded ? 0.5 : isInactive ? 0.8 : 1,
      }}
    >
      {/* Bold color bar */}
      <div style={{ height: 4, background: setup.color, opacity: isInactive ? 0.45 : 1 }} />

      <div className="p-4 flex flex-col gap-3.5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-[12px] font-extrabold text-white shrink-0 shadow-sm"
            style={{ background: setup.color, opacity: isInactive ? 0.55 : 1 }}
          >
            {setup.abbreviation}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--ink)] leading-snug truncate">{setup.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {setup.market && (
                <span className="text-[10px] text-[var(--ink-3)]">{setup.market}</span>
              )}
              <DirectionChip direction={setup.direction} />
            </div>
          </div>
          <StatusBadge status={setup.status} />
        </div>

        {/* Sparkline */}
        <div style={{ margin: "0 -2px" }}>
          <SparklinePlaceholder color={sparkColor} height={40} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: "Win %",  value: "—" },
            { label: "Avg R",  value: "—" },
            { label: "P&L",    value: "—" },
            { label: "Trades", value: "0" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] py-2">
              <p className="text-[9px] uppercase tracking-wide text-[var(--ink-3)] font-semibold">{label}</p>
              <p className="text-[12px] font-mono font-bold text-[var(--ink-2)] mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Description preview */}
        {setup.description && (
          <p className="text-[11px] text-[var(--ink-3)] leading-relaxed line-clamp-2">{setup.description}</p>
        )}

        {/* Checklist counts */}
        <div className="flex items-center gap-3 pt-0.5 border-t border-[var(--line)]">
          {setup.aplusChecklist.filter(Boolean).length > 0 && (
            <div className="flex items-center gap-1">
              <Star size={9} className="text-[var(--be)] fill-[var(--be)]" />
              <span className="text-[10px] text-[var(--ink-3)]">{setup.aplusChecklist.filter(Boolean).length} A+</span>
            </div>
          )}
          {setup.standardChecklist.filter(Boolean).length > 0 && (
            <div className="flex items-center gap-1">
              <Circle size={9} className="text-[var(--ink-3)]" />
              <span className="text-[10px] text-[var(--ink-3)]">{setup.standardChecklist.filter(Boolean).length} std</span>
            </div>
          )}
          <span className="ml-auto text-[10px] text-[var(--accent)] font-medium">Ver detalle →</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Drawer — móvil: desde abajo | desktop: derecha
═══════════════════════════════════════════════ */
function SetupDrawer({
  setup, onClose, onEdit, onSetStatus, onDuplicate, onDelete,
}: {
  setup: DbSetup | null
  onClose: () => void
  onEdit: (s: DbSetup) => void
  onSetStatus: (s: DbSetup, status: SetupStatus) => void
  onDuplicate: (s: DbSetup) => void
  onDelete: (s: DbSetup) => void
}) {
  const [confirmName,    setConfirmName]    = useState("")
  const [confirmingDel,  setConfirmingDel]  = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [lightboxImg,    setLightboxImg]    = useState<string | null>(null)

  useEffect(() => { setConfirmName(""); setConfirmingDel(false); setStatusMenuOpen(false); setLightboxImg(null) }, [setup?.id])

  const isOpen = !!setup

  if (!setup) return (
    <>
      {/* Overlay */}
      <div
        className={cn("fixed inset-0 z-40 transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
    </>
  )

  const allStatusActions: { status: SetupStatus; label: string; icon: React.ReactNode }[] = [
    { status: "ACTIVO",     label: "Marcar activo",   icon: <Play size={13} /> },
    { status: "EN_PRUEBA",  label: "Poner en prueba", icon: <FlaskConical size={13} /> },
    { status: "PAUSADO",    label: "Pausar",           icon: <Pause size={13} /> },
    { status: "DESCARTADO", label: "Descartar",        icon: <Archive size={13} /> },
  ]
  const otherStatuses = allStatusActions.filter(a => a.status !== setup.status)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Drawer — mobile: bottom sheet | desktop: right panel */}
      <div className={cn(
        "fixed z-50 bg-[var(--panel)] flex flex-col transition-transform duration-300 ease-out",
        /* mobile: full-width bottom sheet, 90vh */
        "bottom-0 left-0 right-0 rounded-t-2xl max-h-[92vh]",
        /* desktop override: right side panel */
        "lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:w-[380px] lg:rounded-none lg:max-h-full lg:h-full",
      )}>
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--line)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-3">
          <span className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center text-[13px] font-extrabold text-white shrink-0"
            style={{ background: setup.color }}>
            {setup.abbreviation}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[var(--ink)] truncate">{setup.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {setup.market && <span className="text-[11px] text-[var(--ink-3)]">{setup.market}</span>}
              <DirectionChip direction={setup.direction} />
              <StatusBadge status={setup.status} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--chip)] transition-colors shrink-0">
            <X size={15} className="text-[var(--ink-3)]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Equity placeholder */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-eyebrow">Curva de equity</p>
              <span className="text-[11px] text-[var(--ink-3)]">— sin trades</span>
            </div>
            <SparklinePlaceholder color="var(--accent)" height={60} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Win Rate",   value: "—" },
              { label: "Avg R",      value: "—" },
              { label: "Expectancy", value: "—" },
              { label: "A+ Rate",    value: "—" },
              { label: "Trades",     value: "0" },
              { label: "Net P&L",    value: "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
                <p className="text-[9px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
                <p className="text-[15px] font-mono font-bold text-[var(--ink-3)]">{value}</p>
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
                  <div key={i} className="flex items-start gap-2.5 py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
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
                  <div key={i} className="flex items-start gap-2.5 py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)]">
                    <Circle size={13} className="text-[var(--ink-3)] mt-0.5 shrink-0" />
                    <span className="text-[12px] text-[var(--ink-2)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference images */}
          {setup.images.length > 0 && (
            <div>
              <p className="text-eyebrow mb-2">Imágenes de referencia</p>
              <div className="grid grid-cols-2 gap-2">
                {setup.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxImg(url)}
                    className="relative aspect-video rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)] hover:border-[var(--accent)] transition-colors group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Referencia ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {confirmingDel && (
            <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-sm)] border border-[var(--loss)]"
              style={{ background: "var(--loss-soft)" }}>
              <p className="text-[12px] text-[var(--loss)] font-semibold text-center">Eliminar "{setup.name}"</p>
              <p className="text-[11px] text-[var(--ink-3)] text-center">
                Escribe el nombre exacto para confirmar. Esta acción no se puede deshacer.
              </p>
              <input
                className="h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel)] border border-[var(--loss)] text-[var(--ink)] focus:outline-none"
                placeholder={setup.name}
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setConfirmingDel(false); setConfirmName("") }}
                  className="flex-1 py-2 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)]">
                  Cancelar
                </button>
                <button
                  disabled={confirmName !== setup.name}
                  onClick={() => onDelete(setup)}
                  className="flex-1 py-2 rounded-[var(--radius-sm)] text-[12px] font-bold bg-[var(--loss)] text-white disabled:opacity-40"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed action bar at bottom ── */}
        <div className="border-t border-[var(--line)] px-5 py-4 flex flex-col gap-2 bg-[var(--panel)]">

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(v => !v)}
              className="w-full flex items-center justify-between gap-2 h-10 px-4 rounded-[var(--radius-sm)] text-[12px] font-semibold transition-colors"
              style={{
                background: STATUS_META[setup.status as SetupStatus]?.bg ?? "var(--chip)",
                color:      STATUS_META[setup.status as SetupStatus]?.text ?? "var(--ink)",
              }}
            >
              <span className="flex items-center gap-2">
                {STATUS_META[setup.status as SetupStatus]?.icon}
                {STATUS_META[setup.status as SetupStatus]?.label ?? setup.status}
              </span>
              <ChevronDown size={13} className={cn("transition-transform", statusMenuOpen && "rotate-180")} />
            </button>

            {statusMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] overflow-hidden shadow-lg z-10">
                {otherStatuses.map(a => {
                  const meta = STATUS_META[a.status]
                  return (
                    <button
                      key={a.status}
                      onClick={() => { onSetStatus(setup, a.status); setStatusMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-medium hover:bg-[var(--chip)] transition-colors text-left"
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: meta.bg, color: meta.text }}>
                        {meta.icon}
                      </span>
                      <span className="text-[var(--ink)]">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onEdit(setup)}
              className="flex items-center justify-center gap-1.5 h-10 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              onClick={() => onDuplicate(setup)}
              className="flex items-center justify-center gap-1.5 h-10 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            >
              <Copy size={13} /> Duplicar
            </button>
            <button
              onClick={() => { setConfirmingDel(true); setStatusMenuOpen(false) }}
              className="flex items-center justify-center gap-1.5 h-10 rounded-[var(--radius-sm)] text-[12px] font-medium text-[var(--loss)] bg-[var(--chip)] hover:bg-[var(--loss-soft)] transition-colors"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImg}
            alt="Referencia"
            className="max-w-full max-h-full rounded-[var(--radius)] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  )
}

/* ── ChecklistEditor ── */
function ChecklistEditor({ title, icon, items, onChange }: {
  title: string; icon?: React.ReactNode; items: string[]; onChange: (items: string[]) => void
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
              onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n) }}
            />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1 text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors">
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
const COLORS  = ["#f59e0b", "#ef4444", "#22c55e", "#4f6ef7", "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#6b7280"]
const MARKETS = ["NQ Futures", "ES Futures", "GC Futures", "FX", "Equities", "Crypto", "Otro"]

interface SetupForm {
  name: string; abbr: string; market: string
  direction: Direction; status: SetupStatus
  description: string; color: string
  images: string[]
  aplusChecklist: string[]; standardChecklist: string[]
}
const FORM_INIT: SetupForm = {
  name: "", abbr: "", market: "NQ Futures", direction: "AMBAS", status: "ACTIVO",
  description: "", color: "#4f6ef7",
  images: [],
  aplusChecklist: ["", "", ""],
  standardChecklist: ["Setup #1 o #2 del día", "Risk ≤ 1R", "RR mínimo 2:1", ""],
}

function SetupModal({ open, onOpenChange, editSetup }: {
  open: boolean; onOpenChange: (v: boolean) => void; editSetup?: DbSetup | null
}) {
  const isEdit = !!editSetup
  const utils  = trpc.useUtils()
  const [form,        setForm]        = useState<SetupForm>(FORM_INIT)
  const [tab,         setTab]         = useState<"info" | "checklist">("info")
  const [uploading,   setUploading]   = useState(false)

  /* ── Populate or clear form whenever the modal opens/closes ── */
  useEffect(() => {
    if (open) {
      if (editSetup) {
        setForm({
          name:             editSetup.name,
          abbr:             editSetup.abbreviation,
          market:           editSetup.market,
          direction:        editSetup.direction as Direction,
          status:           editSetup.status as SetupStatus,
          description:      editSetup.description,
          color:            editSetup.color,
          images:           editSetup.images ?? [],
          aplusChecklist:   editSetup.aplusChecklist.length    ? editSetup.aplusChecklist    : ["", "", ""],
          standardChecklist: editSetup.standardChecklist.length ? editSetup.standardChecklist : [""],
        })
      } else {
        setForm(FORM_INIT)
        setTab("info")
      }
    } else {
      /* Small delay so form doesn't flash empty while modal animates out */
      const t = setTimeout(() => { setForm(FORM_INIT); setTab("info") }, 200)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editSetup?.id])

  const createMut = trpc.setups.create.useMutation({ onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) } })
  const updateMut = trpc.setups.update.useMutation({ onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) } })

  const set = <K extends keyof SetupForm>(key: K, val: SetupForm[K]) => setForm(f => ({ ...f, [key]: val }))

  /* ── Image upload via Supabase Storage ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const supabase = createClient()
    const urls: string[] = []
    for (const file of files) {
      const ext  = file.name.split(".").pop()
      const path = `setups/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("setup-images").upload(path, file, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from("setup-images").getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }))
    setUploading(false)
    e.target.value = ""
  }

  const removeImage = (idx: number) =>
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSave = () => {
    const payload = {
      name: form.name.trim(), abbreviation: form.abbr.trim().toUpperCase(),
      market: form.market, direction: form.direction, status: form.status,
      description: form.description.trim(), color: form.color,
      images: form.images,
      aplusChecklist: form.aplusChecklist.filter(Boolean),
      standardChecklist: form.standardChecklist.filter(Boolean),
    }
    if (!payload.name || !payload.abbreviation) return
    if (isEdit && editSetup) updateMut.mutate({ id: editSetup.id, ...payload })
    else createMut.mutate(payload)
  }

  const isSaving = createMut.isPending || updateMut.isPending || uploading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[var(--radius-sm)] mb-1">
          {(["info", "checklist"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]")}>
              {t === "info" ? "📋 Información" : "✓ Checklists"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-eyebrow block mb-1.5">Nombre del setup *</label>
                <Input placeholder="MMXM — Breaker Block" value={form.name} onChange={e => set("name", e.target.value)} />
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
                      form.market === m ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]")}>
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
                          ? d === "LONG" ? "bg-[var(--win)] text-white" : d === "SHORT" ? "bg-[var(--loss)] text-white" : "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]")}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-eyebrow mb-1.5">Estado inicial</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(["ACTIVO", "EN_PRUEBA", "PAUSADO"] as SetupStatus[]).map(s => {
                    const meta = STATUS_META[s]
                    return (
                      <button key={s} onClick={() => set("status", s)}
                        className={cn("flex-1 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors",
                          form.status === s ? "text-white" : "bg-[var(--chip)] text-[var(--ink-3)]")}
                        style={form.status === s ? { background: meta.bg } : {}}>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-eyebrow mb-1.5">Color del setup</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => set("color", c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-eyebrow block mb-1.5">Descripción</label>
              <Textarea placeholder="¿En qué condiciones se ejecuta este setup?…"
                value={form.description} onChange={e => set("description", e.target.value)} />
            </div>

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-eyebrow">Imágenes de referencia</label>
                <span className="text-[10px] text-[var(--ink-3)]">{form.images.length} imagen{form.images.length !== 1 ? "es" : ""}</span>
              </div>

              {/* Grid preview */}
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)] group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className={cn(
                "flex items-center justify-center gap-2 h-10 rounded-[var(--radius-sm)] border border-dashed text-[12px] font-medium transition-colors cursor-pointer",
                uploading
                  ? "border-[var(--accent)] text-[var(--accent)] opacity-60"
                  : "border-[var(--line)] text-[var(--ink-3)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              )}>
                <ImagePlus size={14} />
                {uploading ? "Subiendo…" : "Subir imágenes"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <button onClick={() => setTab("checklist")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent-soft)] transition-colors">
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
                <p className="text-[11px] text-[var(--ink-3)]">Criterios óptimos → trade se marca como A+.</p>
              </div>
            </div>
            <ChecklistEditor title="A+ Checklist"
              icon={<Star size={11} className="text-[var(--be)] fill-[var(--be)]" />}
              items={form.aplusChecklist} onChange={items => set("aplusChecklist", items)} />

            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] mb-4"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <Circle size={14} className="text-[var(--accent)] shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">Standard Checklist</p>
                  <p className="text-[11px] text-[var(--ink-3)]">Criterios mínimos → se marca como Plan.</p>
                </div>
              </div>
              <ChecklistEditor title="Standard Checklist"
                items={form.standardChecklist} onChange={items => set("standardChecklist", items)} />
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
                  <p className="text-[10px] text-[var(--ink-3)]">{form.market} · {form.direction} · {STATUS_META[form.status].label}</p>
                </div>
              </div>
              <div className="flex gap-4 text-[11px]">
                <span><Star size={10} className="inline text-[var(--be)] fill-[var(--be)] mr-1" />
                  <span className="text-[var(--ink-3)]">A+:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.aplusChecklist.filter(Boolean).length} ítems</span>
                </span>
                <span><Circle size={10} className="inline text-[var(--accent)] mr-1" />
                  <span className="text-[var(--ink-3)]">Std:</span>
                  <span className="text-[var(--ink)] font-semibold ml-1">{form.standardChecklist.filter(Boolean).length} ítems</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {tab === "checklist" && <Button variant="ghost" onClick={() => setTab("info")}>← Volver</Button>}
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.abbr.trim()}>
            {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear setup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── KPI strip ── */
function KpiBox({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-eyebrow">{label}</p>
        {icon && <span className="text-[var(--ink-3)] opacity-65">{icon}</span>}
      </div>
      <p className="text-[22px] font-mono font-bold leading-none text-[var(--ink)]">{value}</p>
      <p className="text-[11px] text-[var(--ink-3)] mt-1">{sub}</p>
    </div>
  )
}

/* ── Page ── */
const MARKET_FILTERS = [
  { value: "TODOS",      label: "Todos"    },
  { value: "NQ Futures", label: "NQ"       },
  { value: "ES Futures", label: "ES"       },
  { value: "FX",         label: "FX"       },
  { value: "Equities",   label: "Equities" },
]
const STATUS_FILTERS = [
  { value: "TODOS",      label: "Todos"      },
  { value: "ACTIVO",     label: "Activos"    },
  { value: "EN_PRUEBA",  label: "En prueba"  },
  { value: "PAUSADO",    label: "Pausados"   },
  { value: "DESCARTADO", label: "Descartados"},
]

export default function PlaybookPage() {
  const utils = trpc.useUtils()

  const [modalOpen,     setModalOpen]     = useState(false)
  const [editSetup,     setEditSetup]     = useState<DbSetup | null>(null)
  const [drawerSetup,   setDrawerSetup]   = useState<DbSetup | null>(null)
  const [marketF,       setMarketF]       = useState("TODOS")
  const [statusF,       setStatusF]       = useState("TODOS")
  const [showDiscarded, setShowDiscarded] = useState(false)

  const { data: setups = [], isLoading } = trpc.setups.list.useQuery(
    { includeDiscarded: showDiscarded },
  )

  const setStatusMut = trpc.setups.setStatus.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setDrawerSetup(null) },
  })
  const deleteMut = trpc.setups.delete.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setDrawerSetup(null) },
  })
  const createMut = trpc.setups.create.useMutation({
    onSuccess: () => utils.setups.list.invalidate(),
  })

  const active = setups.filter(s => s.status === "ACTIVO")
  const inTest = setups.filter(s => s.status === "EN_PRUEBA")

  const visible = setups.filter(s => {
    const mOk = marketF === "TODOS" || s.market === marketF
    const sOk = statusF === "TODOS" || s.status === statusF
    return mOk && sOk
  })

  const handleEdit = (s: DbSetup) => {
    setDrawerSetup(null)
    setTimeout(() => { setEditSetup(s); setModalOpen(true) }, 150)
  }
  const handleSetStatus = (s: DbSetup, status: SetupStatus) => setStatusMut.mutate({ id: s.id, status })
  const handleDuplicate = (s: DbSetup) => {
    createMut.mutate({
      name: s.name + " (copia)", abbreviation: s.abbreviation,
      market: s.market, direction: s.direction as Direction,
      status: "EN_PRUEBA", description: s.description, color: s.color,
      aplusChecklist: s.aplusChecklist, standardChecklist: s.standardChecklist,
    })
    setDrawerSetup(null)
  }
  const handleDelete = (s: DbSetup) => deleteMut.mutate(s.id)

  return (
    <>
      <TopBar
        title="Playbook"
        subtitle={`${active.length} activos · ${inTest.length} en prueba · ${setups.length} total`}
        actions={[{
          label: "Nuevo setup", icon: <Plus size={14} />, variant: "primary",
          onClick: () => { setEditSetup(null); setModalOpen(true) },
        }]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiBox label="P&L Total (activos)"  value="— sin trades" sub={`${active.length} setups activos`}                     icon={<TrendingUp size={14} />} />
        <KpiBox label="Win Rate promedio"     value="—"            sub="sobre setups activos"                                  icon={<Percent size={14} />} />
        <KpiBox label="Trades totales"        value="0"            sub="todos los setups"                                      icon={<BarChart2 size={14} />} />
        <KpiBox label="En prueba"             value={String(inTest.length)} sub={inTest.map(s => s.abbreviation).join(", ") || "ninguno"} icon={<FlaskConical size={14} />} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <FilterBar options={MARKET_FILTERS} value={marketF} onChange={setMarketF} />
        <div className="w-px h-4 bg-[var(--line)]" />
        <FilterBar options={STATUS_FILTERS} value={statusF} onChange={v => {
          setStatusF(v)
          if (v === "DESCARTADO") setShowDiscarded(true)
        }} />
        <button
          onClick={() => setShowDiscarded(v => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors border",
            showDiscarded
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink)]"
          )}
        >
          <Archive size={11} /> Descartados
        </button>
        <span className="text-[11px] text-[var(--ink-3)] ml-auto">
          {visible.length} setup{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[var(--ink-3)]">Cargando setups…</div>
      ) : setups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-[var(--ink-2)] font-semibold">Aún no tienes setups</p>
          <p className="text-[12px] text-[var(--ink-3)]">Crea tu primer setup para organizar tus estrategias.</p>
          <Button variant="primary" onClick={() => { setEditSetup(null); setModalOpen(true) }}>
            <Plus size={13} className="mr-1" /> Crear primer setup
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[11px] text-[var(--ink-3)]">
          Sin resultados para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(s => (
            <SetupCard
              key={s.id}
              setup={s}
              selected={drawerSetup?.id === s.id}
              onClick={() => setDrawerSetup(sel => sel?.id === s.id ? null : s)}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      <SetupDrawer
        setup={drawerSetup}
        onClose={() => setDrawerSetup(null)}
        onEdit={handleEdit}
        onSetStatus={handleSetStatus}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      <SetupModal
        open={modalOpen}
        onOpenChange={v => { setModalOpen(v); if (!v) setEditSetup(null) }}
        editSetup={editSetup}
      />
    </>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
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
import { toast }           from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

/* ── Types ── */
type Direction   = "LONG" | "SHORT" | "AMBAS"
type SetupStatus = "ACTIVO" | "EN_PRUEBA" | "PAUSADO" | "DESCARTADO"

interface DbSetup {
  id: string; name: string; abbreviation: string; market: string
  direction: string; status: string; description: string; color: string
  images: string[]
  aplusChecklist: string[]; standardChecklist: string[]
  // T-VIII-002 edge fields (nullable Decimal from Prisma comes as string | null via JSON)
  expectedWr?:    string | number | null
  expectedAvgR?:  string | number | null
  minR?:          string | number | null
  maxR?:          string | number | null
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
type SetupStats = { total: number; wins: number; netPnl: number; avgR: number; aplusRate: number; expectancy: number }

function SetupCard({ setup, selected, onClick, stats, versionCount }: {
  setup: DbSetup; selected: boolean; onClick: () => void; stats?: SetupStats; versionCount?: number
}) {
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
            { label: "Win %",  value: stats && stats.total > 0 ? `${Math.round(stats.wins / stats.total * 100)}%` : "—" },
            { label: "Avg R",  value: stats && stats.total > 0 ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(1)}R` : "—" },
            { label: "P&L",    value: stats && stats.total > 0 ? `${stats.netPnl >= 0 ? "+" : "-"}$${Math.abs(stats.netPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—" },
            { label: "Trades", value: stats ? String(stats.total) : "0" },
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

        {/* Checklist counts + version history */}
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
          {versionCount != null && versionCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--ink-3)]">v{versionCount + 1}</span>
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
  setup, onClose, onEdit, onSetStatus, onDuplicate, onDelete, stats,
}: {
  setup: DbSetup | null
  onClose: () => void
  onEdit: (s: DbSetup) => void
  onSetStatus: (s: DbSetup, status: SetupStatus) => void
  onDuplicate: (s: DbSetup) => void
  onDelete: (s: DbSetup) => void
  stats?: SetupStats
}) {
  const [confirmName,    setConfirmName]    = useState("")
  const [confirmingDel,  setConfirmingDel]  = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [lightboxImg,    setLightboxImg]    = useState<string | null>(null)
  const [showVersions,   setShowVersions]   = useState(false)

  // T-VIII-004: version history for the selected setup
  type VersionRow = { id: string; version: number; reason: string; createdAt: Date | string }
  const { data: versionsRaw } = trpc.setups.getVersions.useQuery(
    setup?.id ?? "",
    { enabled: !!setup?.id, staleTime: 30_000 },
  )
  // Cast to a simple type to avoid deep instantiation in JSX
  const versions = versionsRaw as VersionRow[] | undefined

  useEffect(() => { setConfirmName(""); setConfirmingDel(false); setStatusMenuOpen(false); setLightboxImg(null); setShowVersions(false) }, [setup?.id])

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
        "fixed z-50 bg-[var(--panel)] flex flex-col overflow-hidden",
        /* mobile: full-width bottom sheet */
        "bottom-0 left-0 right-0 rounded-t-2xl h-[88dvh]",
        /* desktop override: right side panel */
        "lg:bottom-0 lg:top-0 lg:left-auto lg:right-0 lg:w-[380px] lg:rounded-none lg:h-full",
      )}>
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--line)]" />
        </div>

        {/* Header — never scrolls */}
        <div className="shrink-0 px-5 py-4 border-b border-[var(--line)] flex items-center gap-3">
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--chip)] transition-colors shrink-0">
            <X size={18} className="text-[var(--ink-2)]" />
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
            {(() => {
              const s = stats
              const hasSt = s && s.total > 0
              const pnlColor = hasSt ? (s.netPnl >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)"
              return [
                { label: "Win Rate",   value: hasSt ? `${Math.round(s.wins / s.total * 100)}%` : "—",                                        color: hasSt ? (s.wins / s.total >= 0.5 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" },
                { label: "Avg R",      value: hasSt ? `${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R` : "—",                                color: hasSt ? (s.avgR >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" },
                { label: "Expectancy", value: hasSt ? `${s.expectancy >= 0 ? "+" : ""}${s.expectancy.toFixed(2)}R` : "—",                    color: hasSt ? (s.expectancy >= 0 ? "var(--win)" : "var(--loss)") : "var(--ink-3)" },
                { label: "A+ Rate",    value: hasSt ? `${s.aplusRate}%` : "—",                                                                color: "var(--be)" },
                { label: "Trades",     value: s ? String(s.total) : "0",                                                                      color: "var(--ink)" },
                { label: "Net P&L",    value: hasSt ? `${s.netPnl >= 0 ? "+" : "-"}$${Math.abs(s.netPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", color: pnlColor },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
                  <p className="text-[9px] uppercase tracking-wide text-[var(--ink-3)] font-semibold mb-1">{label}</p>
                  <p className="text-[15px] font-mono font-bold leading-none" style={{ color }}>{value}</p>
                </div>
              ))
            })()}
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

          {/* T-VIII-004: Version history */}
          {versions && versions.length > 0 && (
            <div>
              <button
                onClick={() => setShowVersions(v => !v)}
                className="flex items-center gap-2 text-eyebrow hover:text-[var(--ink)] transition-colors"
              >
                Historial de versiones
                <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded-full">{versions.length}</span>
                <span className="text-[10px] text-[var(--ink-3)]">{showVersions ? "▲" : "▼"}</span>
              </button>
              {showVersions && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {versions.map(v => (
                    <div key={v.id} className="flex items-start gap-2.5 py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                      <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">v{v.version}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--ink-2)]">{v.reason}</p>
                        <p className="text-[10px] text-[var(--ink-3)]">{new Date(v.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          {/* placeholder to keep spacing — actual confirm is an overlay */}
        </div>

        {/* ── Fixed action bar at bottom ── */}
        <div className="shrink-0 border-t border-[var(--line)] px-5 py-4 flex flex-col gap-2 bg-[var(--panel)]">

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

      {/* Confirm delete overlay — same design as cuentas */}
      {confirmingDel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full sm:max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-t-2xl sm:rounded-[var(--radius)] flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-[var(--line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: "var(--loss-soft)" }}>
                <Trash2 size={15} className="text-[var(--loss)]" />
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[var(--ink)]">Eliminar setup</p>
                <p className="text-[11px] text-[var(--ink-3)]">Acción irreversible</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[12.5px] text-[var(--ink-2)] leading-relaxed">
                Los trades asociados no se eliminarán. Escribe el nombre exacto para confirmar:
              </p>
              <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
                <p className="font-mono text-[13px] font-bold text-[var(--ink)]">{setup.name}</p>
              </div>
              <input
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                placeholder="Escribe el nombre exacto…"
                autoFocus
                className="h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--loss)] transition-colors"
              />
            </div>
            <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex gap-2">
              <button
                onClick={() => { setConfirmingDel(false); setConfirmName("") }}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={confirmName !== setup.name}
                onClick={() => onDelete(setup)}
                className="flex-1 h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: "var(--loss)" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
  // T-VIII-002 edge definition fields (stored as strings for input, converted on save)
  expectedWr:   string
  expectedAvgR: string
  minR:         string
  maxR:         string
}
const FORM_INIT: SetupForm = {
  name: "", abbr: "", market: "NQ Futures", direction: "AMBAS", status: "ACTIVO",
  description: "", color: "#4f6ef7",
  images: [],
  aplusChecklist: ["", "", ""],
  standardChecklist: ["Setup #1 o #2 del día", "Risk ≤ 1R", "RR mínimo 2:1", ""],
  expectedWr: "", expectedAvgR: "", minR: "", maxR: "",
}

function SetupModal({ open, onOpenChange, editSetup }: {
  open: boolean; onOpenChange: (v: boolean) => void; editSetup?: DbSetup | null
}) {
  const isEdit = !!editSetup
  const utils  = trpc.useUtils()
  const [form,        setForm]        = useState<SetupForm>(FORM_INIT)
  const [tab,         setTab]         = useState<"info" | "checklist" | "edge">("info")
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState<string | null>(null)

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
          expectedWr:   editSetup.expectedWr   != null ? String(editSetup.expectedWr)   : "",
          expectedAvgR: editSetup.expectedAvgR != null ? String(editSetup.expectedAvgR) : "",
          minR:         editSetup.minR         != null ? String(editSetup.minR)         : "",
          maxR:         editSetup.maxR         != null ? String(editSetup.maxR)         : "",
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

  const createMut = trpc.setups.create.useMutation({ onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) }, onError: (err) => toast.error(formatErrorForUser(err)) })
  const updateMut = trpc.setups.update.useMutation({ onSuccess: () => { utils.setups.list.invalidate(); onOpenChange(false) }, onError: (err) => toast.error(formatErrorForUser(err)) })

  const set = <K extends keyof SetupForm>(key: K, val: SetupForm[K]) => setForm(f => ({ ...f, [key]: val }))

  /* ── Image upload via validated Route Handler ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadError(null)
    const urls: string[] = []
    let failed = 0
    for (const file of files) {
      const body = new FormData()
      body.append("file", file)
      try {
        const res  = await fetch("/api/upload/setup-image", { method: "POST", body })
        const json = await res.json() as { ok: boolean; url?: string; reason?: string }
        if (res.ok && json.ok && json.url) {
          urls.push(json.url)
        } else {
          const reason = json.reason === "INVALID_MIME"    ? "Tipo de archivo no permitido (usa JPG, PNG o WebP)"
                       : json.reason === "FILE_TOO_LARGE"  ? "Archivo demasiado grande (máx. 5 MB)"
                       : "No se pudo subir la imagen"
          setUploadError(reason)
          failed++
        }
      } catch {
        setUploadError("Error de red al subir la imagen")
        failed++
      }
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }))
    setUploading(false)
    e.target.value = ""
    if (failed === 0) setUploadError(null)
  }

  const removeImage = (idx: number) =>
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSave = () => {
    const toNum = (s: string): number | undefined => {
      const n = parseFloat(s)
      return isNaN(n) ? undefined : n
    }
    const payload = {
      name: form.name.trim(), abbreviation: form.abbr.trim().toUpperCase(),
      market: form.market, direction: form.direction, status: form.status,
      description: form.description.trim(), color: form.color,
      images: form.images,
      aplusChecklist: form.aplusChecklist.filter(Boolean),
      standardChecklist: form.standardChecklist.filter(Boolean),
      expectedWr:   toNum(form.expectedWr),
      expectedAvgR: toNum(form.expectedAvgR),
      minR:         toNum(form.minR),
      maxR:         toNum(form.maxR),
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
          {(["info", "checklist", "edge"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors",
                tab === t ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]")}>
              {t === "info" ? "📋 Información" : t === "checklist" ? "✓ Checklists" : "📈 Edge"}
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
              {uploadError && (
                <p className="text-[11px] text-[var(--loss)] mt-1">{uploadError}</p>
              )}
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

        {tab === "edge" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.25)" }}>
              <div>
                <p className="text-[12px] font-semibold text-[var(--accent)]">Edge esperado (opcional)</p>
                <p className="text-[11px] text-[var(--ink-3)]">Define los parámetros teóricos de tu setup para detectar degradación.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-eyebrow block mb-1.5">Win Rate esperado (%)</label>
                <Input
                  type="number" min={0} max={100} step={0.1}
                  placeholder="Ej. 55"
                  value={form.expectedWr}
                  onChange={e => set("expectedWr", e.target.value)}
                />
                <p className="text-[10px] text-[var(--ink-3)] mt-1">% de trades ganadores esperado.</p>
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Avg R esperado</label>
                <Input
                  type="number" step={0.01}
                  placeholder="Ej. 1.5"
                  value={form.expectedAvgR}
                  onChange={e => set("expectedAvgR", e.target.value)}
                />
                <p className="text-[10px] text-[var(--ink-3)] mt-1">R promedio por trade.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-eyebrow block mb-1.5">Mínimo R aceptable</label>
                <Input
                  type="number" step={0.01}
                  placeholder="Ej. 1.0"
                  value={form.minR}
                  onChange={e => set("minR", e.target.value)}
                />
              </div>
              <div>
                <label className="text-eyebrow block mb-1.5">Máximo R objetivo</label>
                <Input
                  type="number" step={0.01}
                  placeholder="Ej. 3.0"
                  value={form.maxR}
                  onChange={e => set("maxR", e.target.value)}
                />
              </div>
            </div>

            {(form.expectedWr || form.expectedAvgR) && (
              <div className="bg-[var(--panel-2)] border border-[var(--line)] rounded-[var(--radius-sm)] px-4 py-3 text-[11px] text-[var(--ink-3)]">
                El sistema comparará tu WR real vs el esperado. Si cae más de 10pp, recibirás una sugerencia de PAUSE.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {(tab === "checklist" || tab === "edge") && <Button variant="ghost" onClick={() => setTab("info")}>← Volver</Button>}
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
  const { data: versionCountsMap } = trpc.setups.listVersionCounts.useQuery(undefined, { staleTime: 60_000 })
  const { data: dashStats }        = trpc.trades.dashboardStats.useQuery({ period: "ALL" }, { staleTime: 60_000 })

  // Setup stats from server-side aggregation (all trades, not paginated 50)
  const setupStats = useMemo<Record<string, SetupStats>>(() => {
    const map: Record<string, SetupStats> = {}
    for (const s of dashStats?.setupStats ?? []) {
      if (!s.setupId) continue
      map[s.setupId] = {
        total:      s.trades,
        wins:       Math.round(s.winRate / 100 * s.trades),
        netPnl:     s.netPnl,
        avgR:       s.avgR,
        aplusRate:  s.trades > 0 ? Math.round((s.aplusCount / s.trades) * 100) : 0,
        // avgR is the arithmetic mean of all R multiples (= E[R] per trade)
        expectancy: s.avgR,
      }
    }
    return map
  }, [dashStats])

  const setStatusMut = trpc.setups.setStatus.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setDrawerSetup(null) },
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })
  const deleteMut = trpc.setups.delete.useMutation({
    onSuccess: () => { utils.setups.list.invalidate(); setDrawerSetup(null) },
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })
  const createMut = trpc.setups.create.useMutation({
    onSuccess: () => utils.setups.list.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
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
      {(() => {
        const activeStats = active.map(s => setupStats[s.id]).filter(Boolean) as SetupStats[]
        const totalTrades = Object.values(setupStats).reduce((s, v) => s + v.total, 0)
        const totalPnl    = Object.values(setupStats).reduce((s, v) => s + v.netPnl, 0)
        const avgWinRate  = activeStats.length > 0
          ? Math.round(activeStats.reduce((s, v) => s + (v.total > 0 ? v.wins / v.total * 100 : 0), 0) / activeStats.length)
          : null
        const pnlStr = totalPnl !== 0 ? `${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0"
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <KpiBox label="P&L Total (activos)"  value={totalTrades > 0 ? pnlStr : "— sin trades"} sub={`${active.length} setups activos`}                     icon={<TrendingUp size={14} />} />
            <KpiBox label="Win Rate promedio"     value={avgWinRate != null ? `${avgWinRate}%` : "—"}            sub="sobre setups activos"                                  icon={<Percent size={14} />} />
            <KpiBox label="Trades totales"        value={String(totalTrades)}            sub="todos los setups"                                      icon={<BarChart2 size={14} />} />
            <KpiBox label="En prueba"             value={String(inTest.length)} sub={inTest.map(s => s.abbreviation).join(", ") || "ninguno"} icon={<FlaskConical size={14} />} />
          </div>
        )
      })()}

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
              stats={setupStats[s.id]}
              versionCount={versionCountsMap?.[s.id]}
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
        stats={drawerSetup ? setupStats[drawerSetup.id] : undefined}
      />

      <SetupModal
        open={modalOpen}
        onOpenChange={v => { setModalOpen(v); if (!v) setEditSetup(null) }}
        editSetup={editSetup}
      />
    </>
  )
}

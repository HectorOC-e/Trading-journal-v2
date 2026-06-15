"use client"

import { useState, useEffect } from "react"
import { X, Star, ChevronDown, ChevronUp, Trophy } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { CategoryChip } from "@/components/ui/category-chip"
import { cn } from "@/lib/utils"
import { MASTERY_STAGES, masteryStageIndexFromLevel, effectiveMasteryLevel } from "@/app/aprendizaje/utils/mastery"
import type { LearningResource, ResourceType, ResourceStatus } from "@/types"

// ─── Mastery sparkline (L024) ─────────────────────────────────────────────────

const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}

const STATUS_LABELS: Record<ResourceStatus, string> = {
  PENDING:     "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED:   "Completado",
  IN_REVIEW:   "Revisar",
  MASTERED:    "Dominado",
  ABANDONED:   "Archivado",
}

function MasterySparkline({
  levels,
  color,
}: {
  levels: number[]
  color:  string
}) {
  if (levels.length < 3) return null
  const W = 160, H = 32
  const pts = levels.map((v, i) => ({
    x: (i / (levels.length - 1)) * W,
    y: H - 4 - ((v - 1) / 4) * (H - 8),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const refY = H - 4 - ((3 - 1) / 4) * (H - 8)  // reference line at mastery 3

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Reference line at mastery 3 */}
        <line x1={0} y1={refY} x2={W} y2={refY} stroke="var(--line)" strokeWidth={1} strokeDasharray="3,3" />
        {/* Sparkline */}
        <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Points */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 3.5 : 2}
            fill={i === pts.length - 1 ? color : "var(--panel)"}
            stroke={color}
            strokeWidth={1.2}
          />
        ))}
      </svg>
      <span className="text-[10px] text-[var(--ink-3)]">evolución maestría</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

function fmtRelTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return "hoy"
  if (days === 1) return "ayer"
  if (days < 7)  return `hace ${days}d`
  const w = Math.floor(days / 7)
  if (w < 5) return `hace ${w}sem`
  return `hace ${Math.floor(days / 30)}mes`
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ─── Review row ───────────────────────────────────────────────────────────────

type ReviewRow = {
  id:           string
  createdAt:    string
  masteryLevel: number
  rating:       number
  learned:      string
  howToApply:   string
  insights:     string[]
}

function ReviewEntry({ review }: { review: ReviewRow }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = review.howToApply || review.insights.length > 0
  const learnedExcerpt = review.learned.split("\n")[0].slice(0, 120)

  return (
    <div className="border border-[var(--line)] rounded-[var(--radius-sm)] p-3 flex flex-col gap-2 bg-[var(--panel-2)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[var(--ink-3)]">{fmtDate(review.createdAt)}</span>
          <span className="text-[10px] text-[var(--ink-3)]">·</span>
          <span className="text-[10px] font-semibold text-[var(--ink-2)]">
            Maestría {review.masteryLevel}/5
          </span>
          {review.rating > 0 && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} size={9} fill="#f59e0b" stroke="#f59e0b" />
              ))}
            </span>
          )}
        </div>
        {(hasDetails || review.learned.length > 120) && (
          <button
            className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {review.learned && (
        <p className="text-xs text-[var(--ink-2)] leading-relaxed">
          {expanded ? review.learned : learnedExcerpt}
          {!expanded && review.learned.length > 120 && <span className="text-[var(--ink-3)]">…</span>}
        </p>
      )}

      {expanded && (
        <>
          {review.howToApply && (
            <div>
              <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wider mb-0.5">A aplicar</p>
              <p className="text-xs text-[var(--ink-2)]">{review.howToApply}</p>
            </div>
          )}
          {review.insights.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wider mb-0.5">Insights</p>
              <ul className="text-xs text-[var(--ink-2)] pl-3 list-disc flex flex-col gap-0.5">
                {review.insights.map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Resource Drawer ──────────────────────────────────────────────────────────

export interface ResourceDrawerProps {
  resource:  LearningResource | null
  open:      boolean
  onClose:   () => void
  onReview:  (resource: LearningResource, mode: "quick" | "deep") => void
  onEdit:    (resource: LearningResource) => void
}

export function ResourceDrawer({
  resource,
  open,
  onClose,
  onReview,
  onEdit,
}: ResourceDrawerProps) {
  // Escape key to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const { data: reviews = [] } = trpc.learningResources.listReviews.useQuery(
    resource?.id ?? "",
    { enabled: open && !!resource }
  )

  const { data: impact = [] } = trpc.learningResources.setupImpact.useQuery(
    resource?.id ?? "",
    { enabled: open && !!resource && !!resource.completedAt }
  )

  if (!resource) return null

  const accentColor  = TYPE_COLORS[resource.type as ResourceType] ?? "#4f6ef7"
  const masteryLevels = [...reviews].reverse().map(r => r.masteryLevel)
  const allInsights   = reviews.flatMap(r => r.insights).filter(Boolean)
  const uniqueInsights = Array.from(new Set(allInsights))

  const progressLabel = (() => {
    if (resource.currentUnits == null || resource.totalUnits == null) return null
    const pt = resource.progressType
    if (pt === "minutes") return `${formatMinutes(resource.currentUnits)} / ${formatMinutes(resource.totalUnits)}`
    if (pt === "pages")   return `Pág. ${resource.currentUnits} / ${resource.totalUnits}`
    if (pt === "sessions") return `Sesión ${resource.currentUnits} / ${resource.totalUnits}`
    return `${resource.currentUnits} / ${resource.totalUnits}`
  })()

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col bg-[var(--panel)] border-l border-[var(--line)] shadow-2xl transition-transform duration-300",
          "w-full sm:w-[480px] lg:w-[420px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start gap-3 p-4 border-b border-[var(--line)] shrink-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CategoryChip type={resource.type as ResourceType} />
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: resource.status === "MASTERED" ? "#d1fae5" : resource.status === "COMPLETED" ? "var(--win-soft)" : "var(--chip)",
                  color:      resource.status === "MASTERED" ? "#059669"  : resource.status === "COMPLETED" ? "var(--win)" : "var(--ink-3)",
                }}
              >
                {STATUS_LABELS[resource.status as ResourceStatus] ?? resource.status}
              </span>
              {resource.isFavorite && <Star size={12} fill="#f59e0b" stroke="#f59e0b" />}
            </div>
            <p className="font-bold text-[var(--ink)] leading-snug" style={{ fontSize: "15px" }}>
              {resource.title}
            </p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
              {[resource.author, resource.date, resource.source].filter(Boolean).join(" · ")}
            </p>
            {/* Stepper de dominio */}
            <div className="flex items-center gap-1 mt-2 flex-wrap" aria-label="Etapa de dominio">
              {MASTERY_STAGES.map((s, i) => {
                const latestLevel = masteryLevels.length > 0 ? masteryLevels[masteryLevels.length - 1] : null
                const cur = masteryStageIndexFromLevel(effectiveMasteryLevel(resource.status as ResourceStatus, latestLevel))
                return (
                  <span key={s} className="inline-flex items-center gap-1">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      i === cur ? "bg-[var(--accent)] text-white font-semibold" : i < cur ? "text-[var(--ink-2)]" : "text-[var(--ink-3)] opacity-40",
                    )}>{s}</span>
                    {i < MASTERY_STAGES.length - 1 && <span className="text-[var(--ink-3)] opacity-50 text-[10px]">›</span>}
                  </span>
                )
              })}
            </div>
          </div>
          <button
            className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors shrink-0 p-1"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-4">

          {/* Mastery sparkline (≥3 reviews) */}
          <MasterySparkline levels={masteryLevels} color={accentColor} />

          {/* Progress */}
          {progressLabel && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">Progreso</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${resource.progressPct ?? 0}%`,
                      background: (resource.progressPct ?? 0) >= 80 ? "var(--win)" : (resource.progressPct ?? 0) >= 40 ? "#f59e0b" : "var(--loss)",
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--ink-2)] shrink-0">{progressLabel}</span>
              </div>
              {resource.progressPct != null && (
                <p className="text-[10px] text-[var(--ink-3)] mt-1">{resource.progressPct}% completado</p>
              )}
            </section>
          )}

          {/* Notes */}
          {resource.notes && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">Notas</h4>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed whitespace-pre-line">
                {resource.notes}
              </p>
            </section>
          )}

          {/* Linked setups + impact */}
          {resource.linkedSetups && resource.linkedSetups.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">Setups vinculados</h4>
              {!resource.completedAt ? (
                <p className="text-xs text-[var(--ink-3)] italic">Completa el recurso para ver el impacto en WR.</p>
              ) : impact.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)]">Sin trades en estos setups desde que completaste el recurso.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {impact.map((item) => (
                    <div key={item.setupId} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ink-2)]">{item.setupName}</span>
                      <span className={cn(
                        "font-semibold",
                        (item.winRate ?? 0) >= 60 ? "text-[var(--win)]" : (item.winRate ?? 0) >= 40 ? "text-[var(--ink-2)]" : "text-[var(--loss)]"
                      )}>
                        {(item.winRate ?? 0).toFixed(0)}% WR
                        <span className="text-[var(--ink-3)] font-normal ml-1">({item.totalTrades})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Accumulated insights */}
          {uniqueInsights.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">
                Insights acumulados ({uniqueInsights.length})
              </h4>
              <ul className="flex flex-col gap-1">
                {uniqueInsights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--ink-2)]">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">•</span>
                    {ins}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Review timeline */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">
              Historial de reviews ({reviews.length})
            </h4>
            {reviews.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)] italic">Sin reviews aún.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {reviews.map((r) => (
                  <ReviewEntry key={r.id} review={r} />
                ))}
              </div>
            )}
          </section>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <section className="flex flex-wrap gap-1">
              {resource.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chip)] text-[var(--ink-3)]">
                  #{tag}
                </span>
              ))}
            </section>
          )}

          {/* Timestamps */}
          <p className="text-[10px] text-[var(--ink-3)]">
            Añadido {fmtRelTime(resource.createdAt)}
            {resource.completedAt && ` · Completado ${fmtRelTime(resource.completedAt)}`}
          </p>

        </div>

        {/* ── Sticky footer ── */}
        <div className="flex gap-2 p-4 border-t border-[var(--line)] shrink-0">
          <button
            className="flex-1 h-9 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            onClick={() => { localStorage.setItem("review-mode", "quick"); onReview(resource, "quick") }}
          >
            Quick review
          </button>
          <button
            className="flex-1 h-9 rounded-[var(--radius-sm)] text-sm font-medium bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            onClick={() => { localStorage.setItem("review-mode", "deep"); onReview(resource, "deep") }}
          >
            Deep review
          </button>
          <button
            className="h-9 px-4 rounded-[var(--radius-sm)] text-sm font-medium border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors shrink-0"
            onClick={() => onEdit(resource)}
          >
            Editar
          </button>
        </div>
      </div>
    </>
  )
}

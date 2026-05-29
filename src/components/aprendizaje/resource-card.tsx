"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { MoreHorizontal, RotateCcw, Pencil, Trash2, Check, Archive, Star, Trophy, CheckCircle2, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryChip } from "@/components/ui/category-chip"
import { Badge } from "@/components/ui/badge"
import type { LearningResource, ResourceStatus, ResourceType } from "@/types"

const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}

const STATUS_CONFIG: Record<ResourceStatus, { label: string; bg: string; text: string }> = {
  PENDING:     { label: "Pendiente",   bg: "var(--chip)",     text: "var(--ink-3)" },
  IN_PROGRESS: { label: "En progreso", bg: "#dbeafe",         text: "#1d4ed8" },
  COMPLETED:   { label: "Completado",  bg: "var(--win-soft)", text: "var(--win)" },
  IN_REVIEW:   { label: "Revisar",     bg: "#fef3c7",         text: "#b45309" },
  MASTERED:    { label: "Dominado",    bg: "#d1fae5",         text: "#059669" },
  ABANDONED:   { label: "Archivado",   bg: "var(--chip)",     text: "var(--ink-3)" },
}

function progressColor(pct: number): string {
  if (pct >= 80) return "var(--win)"
  if (pct >= 40) return "#f59e0b"
  return "var(--loss)"
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function progressLabel(
  progressType: string | null | undefined,
  currentUnits: number | null | undefined,
  totalUnits:   number | null | undefined,
  progressPct:  number | null | undefined,
): string | null {
  if (currentUnits == null || totalUnits == null) return null
  const pctStr = progressPct != null ? ` · ${progressPct}%` : ""
  if (progressType === "minutes") {
    return `${formatMinutes(currentUnits)} de ${formatMinutes(totalUnits)}${pctStr}`
  }
  if (progressType === "pages") {
    return `${currentUnits} de ${totalUnits} páginas${pctStr}`
  }
  if (progressType === "sessions") {
    return `${currentUnits} de ${totalUnits} sesiones${pctStr}`
  }
  return null
}

function reviewCountdown(nextReviewAt: string | null | undefined): string | null {
  if (!nextReviewAt) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const review = new Date(nextReviewAt)
  review.setHours(0, 0, 0, 0)
  const diff = Math.round((review.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 3) return null
  if (diff < 0) return "Review vencida"
  if (diff === 0) return "Review hoy"
  return `Review en ${diff} día${diff === 1 ? "" : "s"}`
}

interface MenuItemProps {
  icon:        React.ReactNode
  label:       string
  onClick:     () => void
  destructive?: boolean
}

function MenuItem({ icon, label, onClick, destructive }: MenuItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left hover:bg-[var(--chip)]",
        destructive ? "text-red-500" : "text-[var(--ink-2)]"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

export interface ResourceCardProps {
  resource:               LearningResource
  className?:             string
  onReview?:              (resource: LearningResource) => void
  onEdit?:                (resource: LearningResource) => void
  onDelete?:              (id: string) => void
  onUpdateStatus?:        (id: string, status: ResourceStatus, archiveReason?: string) => void
  onToggleFavorite?:      (id: string) => void
  onUpdateProgress?:      (id: string, currentUnits: number) => void
  onLinkSetup?:           (resource: LearningResource) => void
  onUnlinkSetup?:         (resourceId: string, setupId: string) => void
  onViewImpact?:          (resource: LearningResource) => void
}

const ARCHIVE_REASONS = [
  { key: "irrelevant", label: "Ya no relevante" },
  { key: "mastered",   label: "Ya lo dominé" },
  { key: "no_time",    label: "Sin tiempo" },
] as const

export function ResourceCard({
  resource,
  className,
  onReview,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleFavorite,
  onUpdateProgress,
  onLinkSetup,
  onUnlinkSetup,
  onViewImpact,
}: ResourceCardProps) {
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [progressInput,   setProgressInput]   = useState<string>("")
  const [progressEditing, setProgressEditing] = useState(false)
  const [archivePrompt,   setArchivePrompt]   = useState(false)
  const menuRef    = useRef<HTMLDivElement>(null)
  const archiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleProgressConfirm = useCallback(() => {
    const val = parseInt(progressInput, 10)
    if (!isNaN(val) && val >= 0) {
      onUpdateProgress?.(resource.id, val)
    }
    setProgressEditing(false)
    setProgressInput("")
  }, [progressInput, resource.id, onUpdateProgress])

  useEffect(() => {
    if (!menuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [menuOpen])

  const accentColor = TYPE_COLORS[resource.type]
  const showSource  = resource.source && resource.source !== resource.author
  const isCompleted = resource.status === "COMPLETED" || resource.status === "MASTERED"
  const isAbandoned = resource.status === "ABANDONED"
  const canMaster   = resource.status === "COMPLETED" || resource.status === "IN_REVIEW"
  const canComplete = !isCompleted && !isAbandoned

  function closeMenu() {
    setMenuOpen(false)
    setConfirmDelete(false)
  }

  function handleArchive() {
    closeMenu()
    onUpdateStatus?.(resource.id, "ABANDONED")
    setArchivePrompt(true)
    archiveTimer.current = setTimeout(() => setArchivePrompt(false), 2500)
  }

  function handleArchiveReason(reason: string) {
    if (archiveTimer.current) clearTimeout(archiveTimer.current)
    onUpdateStatus?.(resource.id, "ABANDONED", reason)
    setArchivePrompt(false)
  }

  function handleRestore() {
    closeMenu()
    onUpdateStatus?.(resource.id, "PENDING")
  }

  return (
    <div
      className={cn(
        "relative flex gap-0 rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)]",
        "hover:border-[var(--accent)] transition-colors group overflow-hidden",
        className
      )}
    >
      {/* Left accent bar */}
      <div
        className="shrink-0 w-[3px] rounded-l-[var(--radius)]"
        style={{ background: accentColor }}
      />

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1 min-w-0">

        {/* Top row: chips + status badge + menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip type={resource.type} />
            {resource.markedForReview && (
              <Badge variant="review" className="flex items-center gap-1">
                <RotateCcw size={10} />
                Review
              </Badge>
            )}
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: STATUS_CONFIG[resource.status].bg,
                color:      STATUS_CONFIG[resource.status].text,
              }}
            >
              {STATUS_CONFIG[resource.status].label}
            </span>
          </div>

          {/* ··· dropdown */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              className="text-[var(--ink-3)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--chip)]"
              aria-label="Más opciones"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
                setConfirmDelete(false)
              }}
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] shadow-md py-1">
                {confirmDelete ? (
                  <div className="px-3 py-2 flex flex-col gap-2">
                    <p className="text-[11px] text-[var(--ink)] font-medium leading-snug">
                      ¿Eliminar &quot;{resource.title.length > 28 ? resource.title.slice(0, 28) + "…" : resource.title}&quot;?
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 h-7 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                        onClick={() => { onDelete?.(resource.id); closeMenu() }}
                      >
                        Eliminar
                      </button>
                      <button
                        className="flex-1 h-7 text-xs rounded border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--chip)] transition-colors"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <MenuItem
                      icon={<Pencil size={12} />}
                      label="Editar"
                      onClick={() => { onEdit?.(resource); closeMenu() }}
                    />
                    {canComplete && (
                      <MenuItem
                        icon={<Check size={12} />}
                        label="Marcar completado"
                        onClick={() => { onUpdateStatus?.(resource.id, "COMPLETED"); closeMenu() }}
                      />
                    )}
                    {canMaster && (
                      <MenuItem
                        icon={<Trophy size={12} />}
                        label="Marcar dominado"
                        onClick={() => { onUpdateStatus?.(resource.id, "MASTERED"); closeMenu() }}
                      />
                    )}
                    <MenuItem
                      icon={<Star size={12} fill={resource.isFavorite ? "currentColor" : "none"} />}
                      label={resource.isFavorite ? "Quitar favorito" : "Añadir favorito"}
                      onClick={() => { onToggleFavorite?.(resource.id); closeMenu() }}
                    />
                    {isAbandoned ? (
                      <MenuItem
                        icon={<RotateCcw size={12} />}
                        label="Restaurar"
                        onClick={handleRestore}
                      />
                    ) : (
                      <MenuItem
                        icon={<Archive size={12} />}
                        label="Archivar"
                        onClick={handleArchive}
                      />
                    )}
                    {onLinkSetup && (
                      <MenuItem
                        icon={<Link size={12} />}
                        label="Vincular a setup"
                        onClick={() => { onLinkSetup(resource); closeMenu() }}
                      />
                    )}
                    <div className="border-t border-[var(--line)] my-1" />
                    <MenuItem
                      icon={<Trash2 size={12} />}
                      label="Eliminar recurso"
                      onClick={() => setConfirmDelete(true)}
                      destructive
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title + author / date */}
        <div>
          <p
            className="font-semibold text-[var(--ink)] leading-snug"
            style={{ fontSize: "13.5px" }}
          >
            {resource.title}
          </p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
            {resource.author} · {resource.date}
          </p>
        </div>

        {/* Source chip */}
        {showSource && (
          <span className="self-start text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink-2)] border border-[var(--line)]">
            {resource.source}
          </span>
        )}

        {/* Notes */}
        {resource.notes && (
          <p className="text-xs text-[var(--ink-2)] leading-relaxed line-clamp-3">
            {resource.notes}
          </p>
        )}

        {/* Progress: contextual units + bar */}
        {resource.progressPct != null && resource.progressType !== null && (
          <div>
            {(() => {
              const label = progressLabel(
                resource.progressType,
                resource.currentUnits,
                resource.totalUnits,
                resource.progressPct,
              )
              return (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--ink-3)]">
                    {label ?? "Progreso"}
                  </span>
                  {!label && (
                    <span
                      className="text-[10px] font-mono font-semibold"
                      style={{ color: progressColor(resource.progressPct) }}
                    >
                      {resource.progressPct}%
                    </span>
                  )}
                </div>
              )
            })()}
            <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:      `${resource.progressPct}%`,
                  background: progressColor(resource.progressPct),
                }}
              />
            </div>
          </div>
        )}

        {/* nextReviewAt countdown */}
        {reviewCountdown(resource.nextReviewAt) && (
          <span className="text-[10px] font-medium" style={{ color: "#b45309" }}>
            ⏰ {reviewCountdown(resource.nextReviewAt)}
          </span>
        )}

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chip)] text-[var(--ink-3)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked setups */}
        {resource.linkedSetups && resource.linkedSetups.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {resource.linkedSetups.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] border-opacity-30"
              >
                <Link size={8} />
                {s.name}
                {onUnlinkSetup && (
                  <button
                    className="ml-0.5 hover:text-red-500 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onUnlinkSetup(resource.id, s.id) }}
                    aria-label={`Desvincular ${s.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--line)]">
          <button
            onClick={() => onReview?.(resource)}
            className={cn(
              "text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors shrink-0",
              resource.markedForReview
                ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80"
                : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] border border-[var(--line)]"
            )}
          >
            Revisar
          </button>

          {/* Inline progress updater ��� only when totalUnits is set */}
          {resource.totalUnits != null && onUpdateProgress && (
            progressEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  min={0}
                  max={resource.totalUnits}
                  autoFocus
                  className="w-16 h-6 px-1.5 text-xs rounded border border-[var(--accent)] bg-[var(--panel-2)] text-[var(--ink)] focus:outline-none"
                  placeholder={String(resource.currentUnits ?? 0)}
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProgressConfirm()
                    if (e.key === "Escape") { setProgressEditing(false); setProgressInput("") }
                  }}
                />
                <span className="text-[10px] text-[var(--ink-3)]">/ {resource.totalUnits}</span>
                <button
                  className="text-[var(--win)] hover:opacity-80 transition-opacity"
                  onClick={handleProgressConfirm}
                >
                  <CheckCircle2 size={14} />
                </button>
              </div>
            ) : (
              <button
                className="text-[10px] text-[var(--ink-3)] hover:text-[var(--ink)] px-1.5 py-0.5 rounded hover:bg-[var(--chip)] transition-colors"
                onClick={() => { setProgressInput(String(resource.currentUnits ?? 0)); setProgressEditing(true) }}
              >
                +progreso
              </button>
            )
          )}

          {onViewImpact && resource.linkedSetups && resource.linkedSetups.length > 0 && (
            <button
              className="text-[10px] text-[var(--ink-3)] hover:text-[var(--accent)] px-1.5 py-0.5 rounded hover:bg-[var(--chip)] transition-colors shrink-0"
              onClick={() => onViewImpact(resource)}
            >
              📊 Impacto
            </button>
          )}

          <span className="text-[10px] text-[var(--ink-3)] ml-auto shrink-0">
            {new Date(resource.createdAt).toLocaleDateString("es-ES", {
              day:   "numeric",
              month: "short",
              year:  "numeric",
            })}
          </span>
        </div>

        {/* Archive reason micro-prompt */}
        {archivePrompt && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line)]">
            <p className="text-[11px] text-[var(--ink-2)]">¿Por qué archivas este recurso?</p>
            <div className="flex gap-1 flex-wrap">
              {ARCHIVE_REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => handleArchiveReason(r.key)}
                  className="text-[10px] px-2 py-1 rounded border border-[var(--line)] bg-[var(--chip)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

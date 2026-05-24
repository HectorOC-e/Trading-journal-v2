"use client"

import { useRef, useState, useEffect } from "react"
import { MoreHorizontal, RotateCcw, Pencil, Trash2, Check, Archive, Star, Trophy } from "lucide-react"
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

function progressColor(pct: number): string {
  if (pct >= 80) return "var(--win)"
  if (pct >= 40) return "#f59e0b"
  return "var(--loss)"
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
  resource:          LearningResource
  className?:        string
  onReview?:         (resource: LearningResource) => void
  onEdit?:           (resource: LearningResource) => void
  onDelete?:         (id: string) => void
  onUpdateStatus?:   (id: string, status: ResourceStatus) => void
  onToggleFavorite?: (id: string) => void
}

export function ResourceCard({
  resource,
  className,
  onReview,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleFavorite,
}: ResourceCardProps) {
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
  const canMaster   = resource.status === "COMPLETED" || resource.status === "IN_REVIEW"
  const canComplete = !isCompleted && resource.status !== "ABANDONED"

  function closeMenu() {
    setMenuOpen(false)
    setConfirmDelete(false)
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

        {/* Top row: chips + menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip type={resource.type} />
            {resource.markedForReview && (
              <Badge variant="review" className="flex items-center gap-1">
                <RotateCcw size={10} />
                Review
              </Badge>
            )}
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
                    {resource.status !== "ABANDONED" && (
                      <MenuItem
                        icon={<Archive size={12} />}
                        label="Archivar"
                        onClick={() => { onUpdateStatus?.(resource.id, "ABANDONED"); closeMenu() }}
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

        {/* Progress bar */}
        {resource.progressPct != null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--ink-3)]">Progreso</span>
              <span
                className="text-[10px] font-mono font-semibold"
                style={{ color: progressColor(resource.progressPct) }}
              >
                {resource.progressPct}%
              </span>
            </div>
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

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--line)]">
          <button
            onClick={() => onReview?.(resource)}
            className={cn(
              "text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors",
              resource.markedForReview
                ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80"
                : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] border border-[var(--line)]"
            )}
          >
            Revisar
          </button>
          <span className="text-[10px] text-[var(--ink-3)]">
            {new Date(resource.createdAt).toLocaleDateString("es-ES", {
              day:   "numeric",
              month: "short",
              year:  "numeric",
            })}
          </span>
        </div>

      </div>
    </div>
  )
}

"use client"

import { MoreHorizontal, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryChip } from "@/components/ui/category-chip"
import { Badge } from "@/components/ui/badge"
import type { LearningResource, ResourceType } from "@/types"

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

interface ResourceCardProps {
  resource: LearningResource
  className?: string
}

export function ResourceCard({ resource, className }: ResourceCardProps) {
  const accentColor = TYPE_COLORS[resource.type]
  const showSource  = resource.source && resource.source !== resource.author

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

        {/* Top row: chips + hover menu */}
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
          <button
            className="text-[var(--ink-3)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-[var(--chip)]"
            aria-label="Más opciones"
          >
            <MoreHorizontal size={15} />
          </button>
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

        {/* Source chip — only when different from author */}
        {showSource && (
          <span className="self-start text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink-2)] border border-[var(--line)]">
            {resource.source}
          </span>
        )}

        {/* Notes — 3-line clamp */}
        {resource.notes && (
          <p className="text-xs text-[var(--ink-2)] leading-relaxed line-clamp-3">
            {resource.notes}
          </p>
        )}

        {/* Progress bar */}
        {resource.progressPct !== undefined && (
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

        {/* Footer: Revisar button + date added */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--line)]">
          <button
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

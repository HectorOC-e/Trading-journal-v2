"use client"

import { cn } from "@/lib/utils"
import { CategoryChip } from "@/components/ui/category-chip"
import type { LearningResource, ResourceType } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED:   "Completado",
  IN_REVIEW:   "Revisar",
  MASTERED:    "Dominado",
  ABANDONED:   "Archivado",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "text-[var(--ink-3)]",
  IN_PROGRESS: "text-[#f59e0b]",
  COMPLETED:   "text-[var(--win)]",
  IN_REVIEW:   "text-[var(--accent)]",
  MASTERED:    "text-[#8b5cf6]",
  ABANDONED:   "text-[var(--ink-3)]",
}

function relativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return ""
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 7)  return `hace ${diffDays}d`
  const weeks = Math.floor(diffDays / 7)
  if (weeks < 5) return `hace ${weeks}sem`
  return `hace ${Math.floor(diffDays / 30)}mes`
}

interface ResourceListRowProps {
  resource:     LearningResource
  onClick?:     () => void
  className?:   string
}

export function ResourceListRow({ resource, onClick, className }: ResourceListRowProps) {
  const lastReview = (resource as LearningResource & { lastReviewAt?: string | null }).lastReviewAt

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className={cn(
        "flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] border border-transparent",
        "hover:bg-[var(--panel-2)] hover:border-[var(--line)] active:bg-[var(--accent-soft)] transition-colors cursor-pointer",
        "select-none",
        className
      )}
    >
      {/* Type chip */}
      <CategoryChip type={resource.type as ResourceType} className="shrink-0" />

      {/* Title */}
      <span className="flex-1 min-w-0 text-xs font-medium text-[var(--ink)] truncate">
        {resource.title}
      </span>

      {/* Progress bar (if tracked) */}
      {resource.progressPct != null && (
        <div className="w-14 h-1 rounded-full bg-[var(--line)] overflow-hidden shrink-0">
          <div
            className="h-full rounded-full"
            style={{
              width:      `${resource.progressPct}%`,
              background: resource.progressPct >= 80
                ? "var(--win)"
                : resource.progressPct >= 40
                ? "#f59e0b"
                : "var(--loss)",
            }}
          />
        </div>
      )}

      {/* Status */}
      <span className={cn("text-[10px] font-medium shrink-0 w-[64px] text-right", STATUS_COLORS[resource.status] ?? "text-[var(--ink-3)]")}>
        {STATUS_LABELS[resource.status] ?? resource.status}
      </span>

      {/* Last review */}
      <span className="text-[10px] text-[var(--ink-3)] shrink-0 w-[52px] text-right">
        {lastReview ? relativeTime(lastReview) : "—"}
      </span>
    </div>
  )
}

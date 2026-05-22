// ResourceCard molecule — spec: Aprendizaje > Anatomy
// Category chip + optional review badge + title + author/date + description + tags + menu

import { MoreHorizontal, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryChip } from "@/components/ui/category-chip"
import { Badge } from "@/components/ui/badge"
import type { LearningResource } from "@/types"

interface ResourceCardProps {
  resource: LearningResource
  className?: string
}

export function ResourceCard({ resource, className }: ResourceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)]",
        "hover:border-[var(--accent)] transition-colors group",
        className
      )}
    >
      {/* Header: chips + menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryChip type={resource.type} />
          {resource.markedForReview && (
            <Badge variant="review">
              <RotateCcw size={10} />
              Review pendiente
            </Badge>
          )}
        </div>
        <button className="text-[var(--ink-3)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Title + author/date */}
      <div>
        <p className="text-sm font-semibold text-[var(--ink)] leading-snug">{resource.title}</p>
        <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
          {resource.author} · {resource.date}
        </p>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--ink-2)] leading-relaxed line-clamp-2">{resource.notes}</p>

      {/* Progress bar (optional) */}
      {resource.progressPct !== undefined && (
        <div className="h-1 rounded-full bg-[var(--line)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${resource.progressPct}%` }}
          />
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
    </div>
  )
}

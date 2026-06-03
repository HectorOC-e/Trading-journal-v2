"use client"

import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/server/trpc/root"

type MonthlyReview = RouterOutputs["monthlyReviews"]["list"][number]

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  const color = score >= 75 ? "var(--win)" : score >= 50 ? "var(--be)" : "var(--loss)"
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-white"
      style={{ background: color }}
      aria-label={`Score ${score}`}
    >
      {score}
    </span>
  )
}

interface Props {
  review:     MonthlyReview
  isSelected: boolean
  onClick:    () => void
  onEdit:     () => void
  onDelete:   () => void
}

export function MonthlyReviewCard({ review, isSelected, onClick, onEdit, onDelete }: Props) {
  const monthName = MONTH_NAMES[review.month - 1]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className={cn(
        "rounded-[var(--radius)] border p-4 cursor-pointer transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]",
      )}
      aria-selected={isSelected}
      aria-label={`Review de ${monthName} ${review.year}`}
    >
      <div className="flex items-start gap-3">
        <ScoreBadge score={review.overallScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-[14px] font-semibold text-[var(--ink)]">
              {monthName} {review.year}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                aria-label={`Editar review de ${monthName} ${review.year}`}
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 rounded text-[var(--ink-3)] hover:text-[var(--loss)] transition-colors"
                aria-label={`Eliminar review de ${monthName} ${review.year}`}
              >
                ×
              </button>
            </div>
          </div>
          {review.summary && (
            <p className="text-[12px] text-[var(--ink-2)] line-clamp-2 mb-2">
              {review.summary}
            </p>
          )}
          {review.keyThemes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {review.keyThemes.slice(0, 3).map((theme, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink-2)] text-[10px]"
                >
                  {theme}
                </span>
              ))}
              {review.keyThemes.length > 3 && (
                <span className="text-[10px] text-[var(--ink-3)]">
                  +{review.keyThemes.length - 3}
                </span>
              )}
            </div>
          )}
          {review.weeklyIds.length > 0 && (
            <p className="text-[10px] text-[var(--ink-3)] mt-1.5">
              {review.weeklyIds.length} semanas incluidas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

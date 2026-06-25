"use client"

// Sticky left rail for the unified Reviews index (desktop workspace). Holds the
// year/month calendar filter, a "Nueva review" CTA, the period summary KPIs, the
// recurring-pattern cards, and the "Saltar a mes" jump index. Below `lg` it collapses
// inline above the timeline (CTA + jump index hidden — redundant / single-column).

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewsCalendarFilter, type MonthFilter } from "./reviews-calendar-filter"
import { PeriodSummary } from "./period-summary"
import { PatternCards } from "./pattern-cards"
import { MonthJumpIndex, type JumpItem } from "./month-jump-index"
import type { RouterOutputs } from "@/server/trpc/root"

type Overview = RouterOutputs["weeklyReviews"]["overview"]

export function ReviewsRail({
  filter, onFilterChange, monthsWithReviews, onNewReview, overview, jumpItems,
}: {
  filter: MonthFilter
  onFilterChange: (v: MonthFilter) => void
  monthsWithReviews: Set<string>
  onNewReview: () => void
  overview?: Overview
  jumpItems: JumpItem[]
}) {
  return (
    <aside className="flex flex-col gap-4 mb-6 lg:mb-0 lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-col gap-2.5">
        <ReviewsCalendarFilter value={filter} onChange={onFilterChange} monthsWithReviews={monthsWithReviews} align="left" />
        <Button variant="primary" size="sm" onClick={onNewReview} className="hidden lg:flex w-full justify-center">
          <Plus size={14} /> Nueva review
        </Button>
      </div>

      {overview && <PeriodSummary summary={overview.summary} />}
      {overview && <PatternCards patterns={overview.patterns} />}

      {jumpItems.length > 0 && (
        <div className="hidden lg:block">
          <MonthJumpIndex items={jumpItems} />
        </div>
      )}
    </aside>
  )
}

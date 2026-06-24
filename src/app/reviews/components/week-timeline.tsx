"use client"

import { motion } from "framer-motion"
import { staggerContainer, fadeUpItem } from "@/lib/motion"
import { ReviewCard } from "./review-card"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB = RouterOutputs["weeklyReviews"]["list"][number]

function nodeColor(r: ReviewFromDB): string {
  if (r.status === "draft") return "var(--be)"
  return r.netPnl < 0 ? "var(--loss)" : "var(--win)"
}

/**
 * Vertical progress timeline of past weekly reviews. A colored node per week
 * (win/loss/draft) threaded by a continuous rail; each node carries a rich
 * `ReviewCard`. Entrance is staggered for a cascading reveal.
 */
export function WeekTimeline({ reviews, selectedId, onCardClick, accountName }: {
  reviews: ReviewFromDB[]
  selectedId: string | null
  onCardClick: (r: ReviewFromDB) => void
  accountName: (id: string | null) => string
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col">
      {reviews.map((r, i) => {
        const last = i === reviews.length - 1
        return (
          <motion.div key={r.id} variants={fadeUpItem} className="flex gap-3 sm:gap-4">
            {/* Rail */}
            <div className="flex flex-col items-center pt-5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: nodeColor(r), boxShadow: `0 0 0 4px color-mix(in srgb, ${nodeColor(r)} 16%, transparent)` }}
              />
              {!last && <span className="w-px flex-1 min-h-6 my-1" style={{ background: "var(--line)" }} />}
            </div>
            {/* Card */}
            <div className={`flex-1 min-w-0 ${last ? "" : "pb-3"}`}>
              <ReviewCard
                review={r}
                onClick={() => onCardClick(r)}
                isSelected={selectedId === r.id}
                accountName={accountName}
              />
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

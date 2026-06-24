"use client"

// The unified Reviews index timeline: the live current-week hero on top, then one
// chapter per calendar month — a rich "Edición" header followed by that month's weekly
// review cards on a short vertical rail. Replaces the old Semanales/Mensuales split.
// Faithful port of the Reviews.dc.html chapters section.

import * as React from "react"
import { motion } from "framer-motion"
import { staggerContainer, fadeUpItem } from "@/lib/motion"
import { ReviewCard } from "./review-card"
import { EditionHeader, type EditionHeaderData } from "./edition-header"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB = RouterOutputs["weeklyReviews"]["list"][number]

export interface TimelineChapter {
  key: string                 // "YYYY-MM"
  year: number
  month: number
  edition: EditionHeaderData
  weeks: ReviewFromDB[]       // most-recent first
}

function nodeColor(r: ReviewFromDB): string {
  if (r.tradeCount === 0) return "var(--ink-3)"
  if (r.status === "draft") return "var(--be)"
  return r.netPnl < 0 ? "var(--loss)" : "var(--win)"
}

export function ReviewsTimeline({
  chapters, heroSlot, showHero, onOpenWeek, onDeleteWeek, onOpenEdition, accountName,
}: {
  chapters: TimelineChapter[]
  heroSlot?: React.ReactNode
  showHero: boolean
  onOpenWeek: (r: ReviewFromDB) => void
  onDeleteWeek: (r: ReviewFromDB) => void
  onOpenEdition: (ch: TimelineChapter) => void
  accountName: (id: string | null) => string
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-[18px]">
      {showHero && heroSlot && <motion.div variants={fadeUpItem}>{heroSlot}</motion.div>}

      {chapters.map(ch => (
        <motion.section key={ch.key} variants={fadeUpItem}>
          <EditionHeader data={ch.edition} onOpen={() => onOpenEdition(ch)} />

          <div className="pt-1.5">
            {ch.weeks.map(wk => {
              const color = nodeColor(wk)
              return (
                <div key={wk.id} className="flex gap-4 items-stretch">
                  {/* Short local rail with a result-colored node */}
                  <div className="relative w-[13px] shrink-0 flex justify-center">
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--line)]" />
                    <div
                      className="relative mt-[26px] w-[11px] h-[11px] rounded-full"
                      style={{ background: color, boxShadow: `0 0 0 4px var(--bg), 0 0 0 5px color-mix(in srgb, ${color} 22%, transparent)` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pb-[13px]">
                    <ReviewCard review={wk} onOpen={() => onOpenWeek(wk)} onDelete={() => onDeleteWeek(wk)} accountName={accountName} />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.section>
      ))}
    </motion.div>
  )
}

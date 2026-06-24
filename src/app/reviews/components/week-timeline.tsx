"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { staggerContainer, fadeUpItem } from "@/lib/motion"
import { ReviewCard } from "./review-card"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB = RouterOutputs["weeklyReviews"]["list"][number]

export interface MonthGroup {
  key: string        // "YYYY-MM"
  label: string      // "Junio 2026"
  netPnl: number
  reviews: ReviewFromDB[]
}

function nodeColor(r: ReviewFromDB): string {
  if (r.tradeCount === 0) return "var(--ink-3)"
  if (r.status === "draft") return "var(--be)"
  return r.netPnl < 0 ? "var(--loss)" : "var(--win)"
}

const fmtMoney = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`

/** One rail row: a node + a connector line that threads to the next row. */
function RailRow({ node, connectorBelow, nodeTop = 20, children }: {
  node: React.ReactNode
  connectorBelow: boolean
  nodeTop?: number
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center" style={{ paddingTop: nodeTop }}>
        {node}
        {connectorBelow && <span className="w-px flex-1 min-h-4" style={{ background: "var(--line)" }} />}
      </div>
      <div className="flex-1 min-w-0 pb-3">{children}</div>
    </div>
  )
}

const Dot = ({ color, pulse }: { color: string; pulse?: boolean }) => (
  <span className="relative grid place-items-center w-3 h-3 shrink-0">
    {pulse && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.4 }} />}
    <span className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 16%, transparent)` }} />
  </span>
)

/**
 * Vertical progress timeline. The live current-week hero is the top node of the
 * rail (when shown); history is grouped by month with separators carrying each
 * month's net P&L. One continuous thread top to bottom.
 */
export function WeekTimeline({ groups, heroSlot, showHero, onOpen, onDelete, accountName }: {
  groups: MonthGroup[]
  heroSlot?: React.ReactNode
  showHero: boolean
  onOpen: (r: ReviewFromDB) => void
  onDelete: (r: ReviewFromDB) => void
  accountName: (id: string | null) => string
}) {
  const hasHistory = groups.length > 0

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {showHero && heroSlot && (
        <motion.div variants={fadeUpItem}>
          <RailRow node={<Dot color="var(--accent)" pulse />} connectorBelow={hasHistory} nodeTop={26}>
            {heroSlot}
          </RailRow>
        </motion.div>
      )}

      {groups.map((g, gi) => {
        const lastGroup = gi === groups.length - 1
        return (
          <React.Fragment key={g.key}>
            {/* Month separator */}
            <motion.div variants={fadeUpItem}>
              <RailRow node={<span className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: "var(--ink-3)" }} />} connectorBelow nodeTop={8}>
                <div className="flex items-baseline justify-between pb-1 pt-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-2)" }}>{g.label}</span>
                  <span className="font-mono text-[12px] font-semibold" style={{ color: g.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{fmtMoney(g.netPnl)}</span>
                </div>
              </RailRow>
            </motion.div>

            {g.reviews.map((r, ri) => {
              const lastRow = lastGroup && ri === g.reviews.length - 1
              return (
                <motion.div key={r.id} variants={fadeUpItem}>
                  <RailRow node={<Dot color={nodeColor(r)} />} connectorBelow={!lastRow}>
                    <ReviewCard review={r} onOpen={() => onOpen(r)} onDelete={() => onDelete(r)} accountName={accountName} />
                  </RailRow>
                </motion.div>
              )
            })}
          </React.Fragment>
        )
      })}
    </motion.div>
  )
}

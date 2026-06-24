"use client"

import * as React from "react"
import { useId } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
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

// Straight vertical rail; pathLength=100 normalizes the comet's dash animation
// across segments of any pixel height.
const RAIL_PATH = "M6 0 L6 100"

/** A visible curved rail segment (color gradient between two node colors) with an
 *  optional glowing accent comet flowing along it. */
function RailSegment({ from, to, className, style, animated }: {
  from: string; to: string; className?: string; style?: React.CSSProperties; animated?: boolean
}) {
  const id = useId().replace(/:/g, "")
  return (
    <div className={cn("w-3 relative", className)} style={style}>
      <svg viewBox="0 0 12 100" preserveAspectRatio="none" className="rail-svg" aria-hidden>
        <defs>
          <linearGradient id={`rail-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <path d={RAIL_PATH} pathLength={100} fill="none" stroke={`url(#rail-${id})`} strokeWidth={4} strokeLinecap="round" opacity={0.65} vectorEffect="non-scaling-stroke" />
        {animated && (
          <path className="rail-comet" d={RAIL_PATH} pathLength={100} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  )
}

type Row =
  | { kind: "hero"; color: string; node: React.ReactNode }
  | { kind: "month"; color: string; node: React.ReactNode; group: MonthGroup }
  | { kind: "week"; color: string; node: React.ReactNode; review: ReviewFromDB }

const Dot = ({ color, pulse }: { color: string; pulse?: boolean }) => (
  <span className="relative grid place-items-center w-3 h-3 shrink-0">
    {pulse && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.35 }} />}
    <span
      className="w-3 h-3 rounded-full"
      style={{ background: color, boxShadow: pulse
        ? `0 0 0 4px color-mix(in srgb, ${color} 16%, transparent), 0 0 10px 1px color-mix(in srgb, ${color} 45%, transparent)`
        : `0 0 0 4px color-mix(in srgb, ${color} 14%, transparent)` }}
    />
  </span>
)

const Diamond = ({ color }: { color: string }) => (
  <span className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: color }} />
)

/**
 * Vertical progress timeline. The live current-week hero is the top node of one
 * continuous, curved rail; history is grouped by month. Each segment fades between
 * adjacent node colors, with a glowing accent comet flowing down the long spans.
 */
export function WeekTimeline({ groups, heroSlot, showHero, onOpen, onDelete, accountName }: {
  groups: MonthGroup[]
  heroSlot?: React.ReactNode
  showHero: boolean
  onOpen: (r: ReviewFromDB) => void
  onDelete: (r: ReviewFromDB) => void
  accountName: (id: string | null) => string
}) {
  const rows: Row[] = []
  if (showHero && heroSlot) rows.push({ kind: "hero", color: "var(--accent)", node: <Dot color="var(--accent)" pulse /> })
  for (const g of groups) {
    rows.push({ kind: "month", color: "var(--ink-3)", node: <Diamond color="var(--ink-3)" />, group: g })
    for (const r of g.reviews) rows.push({ kind: "week", color: nodeColor(r), node: <Dot color={nodeColor(r)} />, review: r })
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {rows.map((row, i) => {
        const first = i === 0
        const last = i === rows.length - 1
        const prevColor = first ? row.color : rows[i - 1].color
        const nextColor = last ? row.color : rows[i + 1].color
        const nodeTop = row.kind === "month" ? 10 : row.kind === "hero" ? 26 : 22
        return (
          <motion.div key={row.kind === "week" ? row.review.id : row.kind === "month" ? `m-${row.group.key}` : "hero"} variants={fadeUpItem}>
            <div className="flex gap-4 sm:gap-6 items-stretch">
              {/* Rail — top piece bridges from the row top down to the node (segments
                  meet seamlessly across rows); bottom piece flows to the next node. */}
              <div className="flex flex-col items-center w-3 shrink-0 self-stretch">
                {first
                  ? <span style={{ height: nodeTop }} />
                  : <RailSegment from={prevColor} to={row.color} style={{ height: nodeTop }} />}
                <span className="relative z-10">{row.node}</span>
                {!last && <RailSegment from={row.color} to={nextColor} className="flex-1" animated />}
              </div>

              {/* Content — hero is full width; history cards are a touch narrower */}
              <div className={row.kind === "hero" ? "flex-1 min-w-0 pb-4" : "flex-1 min-w-0 pb-3 pr-4 sm:pr-12"}>
                {row.kind === "hero" && heroSlot}
                {row.kind === "month" && (
                  <div className="flex items-baseline justify-between pb-1 pt-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-2)" }}>{row.group.label}</span>
                    <span className="font-mono text-[12px] font-semibold" style={{ color: row.group.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{fmtMoney(row.group.netPnl)}</span>
                  </div>
                )}
                {row.kind === "week" && (
                  <ReviewCard review={row.review} onOpen={() => onOpen(row.review)} onDelete={() => onDelete(row.review)} accountName={accountName} />
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

"use client"

import { useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

/**
 * Combo micro-chart for a review card: per-day P&L bars (green/red, around a zero
 * baseline) + the cumulative equity line drawn over them. Hover reveals the day's
 * P&L and running total; the line draws in on mount and the end point pulses.
 * Pure SVG (preserveAspectRatio:none) + HTML overlays kept crisp via % positioning.
 */
export function CardEquityChart({ dailyPnl, positive, money, width = 168, height = 52 }: {
  dailyPnl: number[]
  positive: boolean
  money: (n: number) => string
  width?: number
  height?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState<number | null>(null)

  const n = dailyPnl.length
  const cum: number[] = []
  dailyPnl.reduce((acc, d, i) => { const v = acc + d; cum[i] = v; return v }, 0)

  const MID = 50, SPAN = 42
  const maxDaily = Math.max(1, ...dailyPnl.map(Math.abs))
  const maxCum   = Math.max(1, ...cum.map(Math.abs))
  const color = positive ? "var(--win)" : "var(--loss)"

  const cx = (i: number) => ((i + 0.5) / n) * 100
  const lineY = (i: number) => MID - (cum[i] / maxCum) * SPAN
  const barW = (100 / n) * 0.46

  const linePath = cum.map((_, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${lineY(i).toFixed(1)}`).join(" ")

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setIdx(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))))
  }

  const tipX = idx != null ? Math.min(82, Math.max(18, cx(idx))) : 0

  return (
    <div
      ref={ref}
      className="relative"
      style={{ width, height }}
      onPointerMove={onMove}
      onPointerLeave={() => setIdx(null)}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
        {/* zero baseline */}
        <line x1="0" y1={MID} x2="100" y2={MID} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        {/* daily bars */}
        {dailyPnl.map((d, i) => {
          const h = (Math.abs(d) / maxDaily) * SPAN
          const up = d >= 0
          const fill = d === 0 ? "var(--ink-3)" : up ? "var(--win)" : "var(--loss)"
          return (
            <motion.rect
              key={i}
              x={cx(i) - barW / 2} width={barW}
              y={up ? MID - h : MID} height={Math.max(0.6, h)}
              rx={0.8} fill={fill} opacity={idx === i ? 0.55 : 0.32}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: idx === i ? 0.55 : 0.32 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : 0.04 * i, ease: EASE_OUT }}
            />
          )
        })}
        {/* cumulative equity line */}
        <motion.path
          d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
      </svg>

      {/* end "today" dot with halo (kept round via HTML overlay) */}
      {n > 0 && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${cx(n - 1)}%`, top: `${lineY(n - 1)}%` }}
        >
          <span className="block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {!reduce && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.3 }} />}
        </span>
      )}

      {/* hover crosshair + dot + tooltip */}
      {idx != null && (
        <>
          <span className="absolute top-0 bottom-0 w-px" style={{ left: `${cx(idx)}%`, background: color, opacity: 0.3 }} />
          <span className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-[var(--panel)]" style={{ left: `${cx(idx)}%`, top: `${lineY(idx)}%`, background: color }} />
          <div
            className="absolute -top-1 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] bg-[var(--ink)] px-1.5 py-0.5 text-[9px] font-mono font-semibold text-[var(--panel)] shadow"
            style={{ left: `${tipX}%` }}
          >
            {DAYS[idx] ?? ""} · {money(cum[idx])}
          </div>
        </>
      )}
    </div>
  )
}

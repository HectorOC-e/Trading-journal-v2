"use client"

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { TrendPoint } from "./view-model"
import { pnlColor } from "./primitives"

function TrendTooltip({ active, payload, money }: {
  active?: boolean
  payload?: { payload: TrendPoint }[]
  money: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[var(--shadow-lg)]">
      <p className="text-[11px] font-semibold text-[var(--ink)]">{p.label}</p>
      <p className="num text-[12px] font-bold" style={{ color: pnlColor(p.pnl) }}>{money(p.pnl)}</p>
    </div>
  )
}

/** Animated P&L-per-period bar chart (day-by-day or week-by-week). */
export function PnlTrendChart({ points, money, animate = true }: {
  points: TrendPoint[]
  money: (n: number) => string
  animate?: boolean
}) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--ink-3)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--ink-3)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => money(v)}
          />
          <Tooltip cursor={{ fill: "var(--panel-2)" }} content={<TrendTooltip money={money} />} />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]} isAnimationActive={animate} animationDuration={500}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.pnl >= 0 ? "var(--win)" : "var(--loss)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

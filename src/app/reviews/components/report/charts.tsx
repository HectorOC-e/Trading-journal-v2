"use client"

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import type { TrendPoint } from "./view-model"
import { pnlColor } from "./primitives"

/** Cumulative P&L (equity) curve over the period — the signature analytics chart. */
export function EquityCurveChart({ points, money }: {
  points: { date: string; balance: number }[]
  money: (n: number) => string
}) {
  const data = points.map(p => ({ label: p.date.slice(5), balance: p.balance })) // MM-DD
  const last = points.length ? points[points.length - 1].balance : 0
  const color = last >= 0 ? "var(--win)" : "var(--loss)"
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => money(v)} />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].payload as { label: string; balance: number }
              return (
                <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[var(--shadow-lg)]">
                  <p className="text-[11px] font-semibold text-[var(--ink)]">{v.label}</p>
                  <p className="num text-[12px] font-bold" style={{ color: pnlColor(v.balance) }}>{money(v.balance)}</p>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="balance" stroke={color} strokeWidth={2} fill="url(#equityFill)" isAnimationActive animationDuration={600} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

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

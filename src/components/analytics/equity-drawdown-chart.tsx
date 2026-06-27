"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import type { DrawdownResult } from "@/domains/analytics/institutional/drawdown"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

/** Equity curve with the max-drawdown trough marked (#3/#34). Surfaces the worst
 *  peak-to-trough as the headline insight (DS §12). */
export function EquityDrawdownChart({ d, money }: { d: DrawdownResult; money: (n: number) => string }) {
  if (d.series.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] py-12 text-center text-[12px] text-[var(--ink-3)]">
        Sin trades cerrados en este periodo para la curva de equity.
      </div>
    )
  }

  const data = d.series.map((p) => ({ label: p.date.slice(5), equity: p.equity, ddPct: p.drawdownPct }))
  const last = d.series[d.series.length - 1].equity
  const color = last >= 0 ? "var(--win)" : "var(--loss)"

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)]">Equity & drawdown</p>
        <div className="flex items-center gap-3 text-[11px] num">
          <span style={{ color: "var(--loss)" }}>max DD {fmt(d.maxDrawdownPct)}%</span>
          {d.inDrawdown && <span className="text-[var(--ink-3)]">{d.drawdownDurationDays}d en DD</span>}
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="eqddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => money(v)} />
            {d.maxDrawdownDate && (
              <ReferenceLine x={d.maxDrawdownDate.slice(5)} stroke="var(--loss)" strokeDasharray="3 3" strokeOpacity={0.6} />
            )}
            <Tooltip
              cursor={{ stroke: "var(--line)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const v = payload[0].payload as { label: string; equity: number; ddPct: number }
                return (
                  <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[var(--shadow-lg)]">
                    <p className="text-[11px] font-semibold text-[var(--ink)]">{v.label}</p>
                    <p className="num text-[12px] font-bold" style={{ color }}>{money(v.equity)}</p>
                    {v.ddPct > 0 && <p className="num text-[11px]" style={{ color: "var(--loss)" }}>−{fmt(v.ddPct)}% del pico</p>}
                  </div>
                )
              }}
            />
            <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill="url(#eqddFill)" isAnimationActive animationDuration={600} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

"use client"

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingDown } from "lucide-react"
import type { RDistributionResult } from "@/domains/analytics/institutional/r-distribution"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })

/** Histogram of R multiples (#19). Bars colored win/loss by the bin's sign; a
 *  left-tail warning surfaces the fat-negative-returns insight (DS §12: every
 *  viz carries an insight). */
export function RDistributionChart({ d }: { d: RDistributionResult }) {
  if (d.count === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] py-12 text-center text-[12px] text-[var(--ink-3)]">
        Registra trades con R para desbloquear tu distribución de R.
      </div>
    )
  }

  const data = d.bins.map((b) => {
    const mid = (b.from + b.to) / 2
    return {
      label: `${b.from >= 0 ? "+" : ""}${fmt(b.from)}`,
      count: b.count,
      color: mid > 0.05 ? "var(--win)" : mid < -0.05 ? "var(--loss)" : "var(--be)",
    }
  })

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)]">Distribución de R</p>
        <div className="flex items-center gap-3 text-[11px] num text-[var(--ink-2)]">
          <span>media {fmt(d.mean)}R</span>
          <span>mediana {fmt(d.median)}R</span>
          <span className="hidden sm:inline">σ {fmt(d.std)}</span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} minTickGap={8} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              cursor={{ fill: "var(--chip)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const v = payload[0].payload as { label: string; count: number }
                return (
                  <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[var(--shadow-lg)]">
                    <p className="num text-[12px] font-bold text-[var(--ink)]">{v.count} trades</p>
                    <p className="text-[11px] text-[var(--ink-3)]">desde {v.label}R</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={500}>
              {data.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {d.leftTailDominant && (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2"
          style={{ background: "var(--loss-soft)", color: "var(--loss)" }}>
          <TrendingDown size={14} className="mt-0.5 shrink-0" />
          <p className="text-[11.5px] leading-snug">
            Cola izquierda dominante (skew {fmt(d.skewness)}): tus pérdidas son más extremas que tus ganancias. Revisa el corte de pérdidas.
          </p>
        </div>
      )}
    </div>
  )
}

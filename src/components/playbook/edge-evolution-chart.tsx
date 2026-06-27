"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import type { RouterOutputs } from "@/server/trpc/root"

type Windows = NonNullable<RouterOutputs["playbook"]["setup"]>["evolution"]

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })

/** Edge evolution curve (#21, DS §11) — avg R per rolling window over time for a
 *  setup. A flat-zero reference makes regime above/below the breakeven line read
 *  instantly. */
export function EdgeEvolutionChart({ windows }: { windows: Windows }) {
  const points = windows.filter((w) => w.value.avgR != null)
  if (points.length < 2) {
    return (
      <p className="text-[11px] text-[var(--ink-3)] py-3">
        Necesitas más historia (varias ventanas de trades) para dibujar la evolución del edge.
      </p>
    )
  }

  const data = points.map((w) => ({ label: w.to.slice(5), avgR: w.value.avgR as number, wr: w.value.winRate }))
  const last = data[data.length - 1].avgR
  const color = last >= 0 ? "var(--win)" : "var(--loss)"

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${fmt(v)}R`} />
          <ReferenceLine y={0} stroke="var(--line-2)" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].payload as { label: string; avgR: number; wr: number }
              return (
                <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[var(--shadow-lg)]">
                  <p className="text-[11px] font-semibold text-[var(--ink)]">{v.label}</p>
                  <p className="num text-[12px] font-bold" style={{ color: v.avgR >= 0 ? "var(--win)" : "var(--loss)" }}>{fmt(v.avgR)}R</p>
                  <p className="num text-[10px] text-[var(--ink-3)]">WR {fmt(v.wr)}%</p>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="avgR" stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} isAnimationActive animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

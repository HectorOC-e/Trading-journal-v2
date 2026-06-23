"use client"

import { AlertTriangle, TrendingUp, Activity, ShieldAlert, Lightbulb } from "lucide-react"
import type { Insight } from "@/domains/analytics/services/insights-engine"

const CAT_ICON = {
  pattern: Activity, correlation: TrendingUp, anomaly: AlertTriangle, risk: ShieldAlert, opportunity: Lightbulb,
} as const

export function sevStyle(s: Insight["severity"]): { bg: string; fg: string } {
  switch (s) {
    case "critical": return { bg: "var(--loss-soft)", fg: "var(--loss)" }
    case "warning":  return { bg: "var(--be-soft)",   fg: "var(--be)" }
    case "positive": return { bg: "var(--win-soft)",  fg: "var(--win)" }
    default:         return { bg: "var(--accent-soft)", fg: "var(--accent)" }
  }
}

/** Grid of deterministic insight cards (correlation / anomaly / opportunity …). */
export function InsightCards({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {insights.map((i) => {
        const st = sevStyle(i.severity)
        const Icon = CAT_ICON[i.category]
        return (
          <div key={i.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.fg }}>
                <Icon size={13} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: st.fg }}>{i.category}</span>
            </div>
            <p className="text-[12.5px] font-semibold text-[var(--ink)] leading-snug">{i.title}</p>
            <p className="text-[11px] text-[var(--ink-2)] leading-snug mt-1">{i.detail}</p>
            {i.recommendation && <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--accent)" }}>→ {i.recommendation}</p>}
            <p className="text-[9.5px] text-[var(--ink-3)] mt-1.5">{i.evidence}</p>
          </div>
        )
      })}
    </div>
  )
}

// KpiCard atom — spec: Foundations > Atoms
// Used in Dashboard KPI strip, Trades header, Reviews summary

import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiCardProps extends KpiCardType {
  className?: string
  icon?: React.ReactNode
  color?: string    // explicit CSS color, overrides trend-computed color
  delta?: string    // optional inline delta label (e.g. "+12%" shown in accent)
}

export function KpiCard({ label, value, sub, trend, mono = true, className, icon, color, delta }: KpiCardProps) {
  const valueColor = color ?? (
    trend === "up"      ? "var(--win)"  :
    trend === "down"    ? "var(--loss)" :
    trend === "neutral" ? "var(--be)"   :
    "var(--accent)"
  )

  const ariaLabel = sub ? `${label}: ${value}, ${sub}` : `${label}: ${value}`

  return (
    <div
      className={cn("bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-5 py-4 flex flex-col gap-1.5", className)}
      aria-label={ariaLabel}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          {label}
        </p>
        {icon && <span style={{ color: "var(--ink-3)", opacity: 0.65 }} aria-hidden="true">{icon}</span>}
      </div>
      <p style={{ fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", color: valueColor, lineHeight: 1 }}>
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {sub && <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</p>}
        {delta && (
          <span style={{ fontSize: 10, fontWeight: 600, color: delta.startsWith("+") ? "var(--win)" : "var(--loss)" }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

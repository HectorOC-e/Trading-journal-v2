// KpiCard atom — spec: Foundations > Atoms
// Used in Dashboard KPI strip, Trades header, Reviews summary

import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiCardProps extends KpiCardType {
  className?: string
}

export function KpiCard({ label, value, sub, trend, mono = true, className }: KpiCardProps) {
  const valueColor =
    trend === "up"      ? "var(--win)"  :
    trend === "down"    ? "var(--loss)" :
    trend === "neutral" ? "var(--be)"   :
    "var(--accent)"

  return (
    <div className={cn("bg-[var(--panel)] border border-[var(--line)] rounded-[10px] px-5 py-4", className)}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", color: valueColor, marginBottom: 4, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</p>}
    </div>
  )
}

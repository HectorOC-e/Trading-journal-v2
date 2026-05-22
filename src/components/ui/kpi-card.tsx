// KpiCard atom — spec: Foundations > Atoms
// Used in Dashboard KPI strip, Trades header, Reviews summary

import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiCardProps extends KpiCardType {
  className?: string
}

export function KpiCard({ label, value, sub, trend, mono = true, className }: KpiCardProps) {
  const trendColor =
    trend === "up"   ? "text-[var(--win)]" :
    trend === "down" ? "text-[var(--loss)]" :
    "text-[var(--ink)]"

  return (
    <div className={cn("flex flex-col gap-1 p-4 rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)]", className)}>
      <p className="text-eyebrow">{label}</p>
      <p className={cn("text-xl font-bold leading-none", trendColor, mono && "font-mono")}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[var(--ink-3)]">{sub}</p>}
    </div>
  )
}

import { cn } from "@/lib/utils"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiCardProps extends KpiCardType {
  className?: string
  icon?: React.ReactNode
  color?: string
  delta?: string
  onClick?: () => void
}

export function KpiCard({ label, value, sub, trend, mono = true, className, icon, color, delta, onClick }: KpiCardProps) {
  const valueColor = color ?? (
    trend === "up"      ? "var(--win)"    :
    trend === "down"    ? "var(--loss)"   :
    trend === "neutral" ? "var(--be)"     :
    "var(--accent)"
  )

  const ariaLabel = sub ? `${label}: ${value}, ${sub}` : `${label}: ${value}`

  return (
    <div
      className={cn(
        "bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)]",
        "px-4 py-3.5 flex flex-col gap-1",
        "transition-all duration-150",
        onClick && "cursor-pointer hover:border-[var(--line-2)] hover:shadow-[var(--shadow-xs)]",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-[0.08em] leading-none">
          {label}
        </p>
        {icon && (
          <span className="text-[var(--ink-3)] opacity-60 shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2 mt-0.5">
        <p
          className={cn("text-[22px] font-bold leading-none tracking-tight", mono && "font-mono")}
          style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </p>
        {delta && (
          <span
            className="text-[10px] font-semibold pb-0.5 leading-none"
            style={{ color: delta.startsWith("+") ? "var(--win)" : "var(--loss)" }}
          >
            {delta}
          </span>
        )}
      </div>

      {sub && (
        <p className="text-[11px] text-[var(--ink-3)] leading-none">{sub}</p>
      )}
    </div>
  )
}

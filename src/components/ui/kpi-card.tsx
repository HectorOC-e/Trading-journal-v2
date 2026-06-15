"use client"

import { Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { askCoach } from "@/lib/coach-bus"
import { CountUp } from "@/components/ui/count-up"
import { DUR, EASE_OUT } from "@/lib/motion"
import type { KpiCard as KpiCardType } from "@/types"

interface KpiCardProps extends KpiCardType {
  className?: string
  icon?: React.ReactNode
  color?: string
  delta?: string
  onClick?: () => void
  /** When set, shows a sparkle button that opens the AI coach pre-asked this question. */
  explain?: string
}

export function KpiCard({ label, value, sub, trend, mono = true, className, icon, color, delta, onClick, explain }: KpiCardProps) {
  const valueColor = color ?? (
    trend === "up"      ? "var(--win)"    :
    trend === "down"    ? "var(--loss)"   :
    trend === "neutral" ? "var(--be)"     :
    "var(--accent)"
  )

  const ariaLabel = sub ? `${label}: ${value}, ${sub}` : `${label}: ${value}`

  return (
    <motion.div
      className={cn(
        "bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)]",
        "px-4 py-3.5 flex flex-col gap-1",
        "transition-[color,background-color,border-color,box-shadow] duration-150",
        onClick && "cursor-pointer hover:border-[var(--line-2)] hover:shadow-[var(--shadow-sm)]",
        className
      )}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
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
        {explain ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); askCoach(explain) }}
            aria-label={`Explícame: ${label}`}
            title="Explícame esta métrica"
            className="shrink-0 text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors opacity-60 hover:opacity-100"
          >
            <Sparkles size={13} />
          </button>
        ) : icon ? (
          <span className="text-[var(--ink-3)] opacity-60 shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="flex items-end gap-2 mt-0.5">
        <p
          className={cn("text-[22px] font-bold leading-none tracking-tight", mono && "font-mono")}
          style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
        >
          <CountUp value={value} />
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
    </motion.div>
  )
}

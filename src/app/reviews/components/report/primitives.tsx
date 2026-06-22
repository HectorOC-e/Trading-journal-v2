"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { currencySymbol } from "@/lib/fx"
import { fadeUpItem } from "@/lib/motion"

/** Currency formatter bound to the report's base currency. */
export function makeMoney(baseCurrency: string) {
  const cur = currencySymbol(baseCurrency || "USD")
  return (n: number) => `${n < 0 ? "-" : ""}${cur}${Math.abs(n).toFixed(2)}`
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-2">{children}</p>
}

/** Card that fades+rises in as a staggered child of a `staggerContainer`. */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUpItem}
      className={cn("rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4", className)}
    >
      {children}
    </motion.div>
  )
}

/** Delta vs the prior period. `invert` flips good/bad (e.g. drawdown). */
export function Delta({ value, suffix = "", invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value == null || value === 0) return <span className="text-[11px] text-[var(--ink-3)]">=</span>
  const good = invert ? value < 0 : value > 0
  return (
    <span className={cn("text-[11px] font-semibold inline-flex items-center gap-0.5", good ? "text-[var(--win)]" : "text-[var(--loss)]")}>
      {value > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {value > 0 ? "+" : ""}{value}{suffix}
    </span>
  )
}

export const pnlColor = (n: number) => (n >= 0 ? "var(--win)" : "var(--loss)")

"use client"

// Reusable, expressive cell renderers shared across migrated tables.
import { ArrowUp, ArrowDown, Check, X, Minus } from "lucide-react"
import { CountUp } from "@/components/ui/count-up"
import { cn } from "@/lib/utils"

// ── Direction (LONG ▲ / SHORT ▼) ──────────────────────────────────────────────
export function DirectionCell({ direction }: { direction: string }) {
  const long = direction === "LONG"
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-[4px] text-[9px] font-bold tracking-wider"
      style={{ background: long ? "var(--win-soft)" : "var(--loss-soft)", color: long ? "var(--win)" : "var(--loss)" }}
    >
      {long ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
      {direction}
    </span>
  )
}

// ── Result (✓ win / ✗ loss / — be / OPEN) ─────────────────────────────────────
const RESULT_CFG: Record<string, { color: string; bg: string; label: string; Icon: typeof Check }> = {
  WIN:  { color: "var(--win)",    bg: "var(--win-soft)",    label: "W",    Icon: Check },
  LOSS: { color: "var(--loss)",   bg: "var(--loss-soft)",   label: "L",    Icon: X },
  BE:   { color: "var(--be)",     bg: "var(--be-soft)",     label: "BE",   Icon: Minus },
  OPEN: { color: "var(--accent)", bg: "var(--accent-soft)", label: "OPEN", Icon: Minus },
}
export function ResultCell({ result }: { result: "WIN" | "LOSS" | "BE" | "OPEN" | string }) {
  const c = RESULT_CFG[result] ?? RESULT_CFG.BE
  const isOpen = result === "OPEN"
  return (
    <span
      className="inline-flex items-center justify-center gap-1 min-w-[38px] h-[18px] px-1.5 rounded-[4px] text-[9px] font-bold tracking-wider"
      style={{ background: c.bg, color: c.color, border: isOpen ? `1px solid ${c.color}40` : "none" }}
    >
      {!isOpen && <c.Icon size={10} strokeWidth={3} />}
      {c.label}
    </span>
  )
}

// ── Trend number (CountUp + ↑/↓), e.g. P&L / expectancy ───────────────────────
export function TrendNumber({
  value,
  format,
  showArrow = true,
  className,
}: {
  value: number | null | undefined
  format: (v: number) => string
  showArrow?: boolean
  className?: string
}) {
  if (value == null) return <span className="text-[var(--ink-3)] text-[11px]">—</span>
  const pos = value >= 0
  const color = pos ? "var(--win)" : "var(--loss)"
  return (
    <span className={cn("inline-flex items-center justify-end gap-1 font-mono font-bold tabular-nums", className)} style={{ color }}>
      {showArrow && (pos ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />)}
      <CountUp value={format(Math.abs(value))} />
    </span>
  )
}

// ── R multiple with a proportional data-bar ───────────────────────────────────
export function RBar({ r, max = 3 }: { r: number | null | undefined; max?: number }) {
  if (r == null) return <span className="text-[var(--ink-3)] text-[11px]">—</span>
  const pos = r >= 0
  const color = pos ? "var(--win)" : "var(--loss)"
  const pct = Math.min(100, (Math.abs(r) / max) * 100)
  return (
    <div className="flex flex-col items-end gap-1 w-full">
      <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color }}>
        {pos ? "+" : ""}{r.toFixed(1)}R
      </span>
      <div className="h-1 w-full max-w-[52px] rounded-full bg-[var(--line)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, marginLeft: pos ? 0 : "auto" }} />
      </div>
    </div>
  )
}

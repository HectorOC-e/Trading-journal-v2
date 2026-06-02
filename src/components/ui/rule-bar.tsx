interface RuleBarProps {
  label: string
  usedPct: number
  displayRight?: string   // explicit right label; falls back to "{usedPct}% de {limitLabel}"
  limitLabel?: string
  warnAt?: number
  dangerAt?: number
}

export function RuleBar({ label, usedPct, displayRight, limitLabel, warnAt = 60, dangerAt = 85 }: RuleBarProps) {
  const color = usedPct >= dangerAt ? "var(--loss)" : usedPct >= warnAt ? "var(--be)" : "var(--win)"
  const right = displayRight ?? `${usedPct.toFixed(0)}%${limitLabel ? ` de ${limitLabel}` : ""}`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[11px] text-[var(--ink-3)]">{label}</span>
        <span className="text-[11px] font-mono font-semibold" style={{ color }}>{right}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(usedPct, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

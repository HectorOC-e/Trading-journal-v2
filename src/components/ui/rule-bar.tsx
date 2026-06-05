interface RuleBarProps {
  label:         string
  usedPct:       number
  displayRight?: string
  limitLabel?:   string
  warnAt?:       number
  dangerAt?:     number
}

export function RuleBar({ label, usedPct, displayRight, limitLabel, warnAt = 60, dangerAt = 85 }: RuleBarProps) {
  const pct   = Math.min(Math.max(usedPct, 0), 100)
  const color = pct >= dangerAt ? "var(--loss)" : pct >= warnAt ? "var(--be)" : "var(--win)"
  const right = displayRight ?? `${pct.toFixed(0)}%${limitLabel ? ` / ${limitLabel}` : ""}`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[var(--ink-3)]">{label}</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color }}>{right}</span>
      </div>
      <div
        className="h-[5px] rounded-full overflow-hidden"
        style={{ background: "var(--line)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct.toFixed(0)}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

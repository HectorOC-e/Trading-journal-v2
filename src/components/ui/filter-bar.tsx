// FilterBar molecule — spec: Trades, Playbook, Aprendizaje
// Horizontal row of chip-style tabs; single or multi-select

"use client"

import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  options: FilterOption[]
  value: string | string[]
  onChange: (value: string) => void
  multiSelect?: boolean
  className?: string
  ariaLabel?: string
}

export function FilterBar({ options, value, onChange, multiSelect = false, className, ariaLabel }: FilterBarProps) {
  const isActive = (v: string) =>
    multiSelect ? (value as string[]).includes(v) : value === v

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1 flex-wrap", className)}
    >
      {options.map((opt) => {
        const active = isActive(opt.value)
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-pressed={multiSelect ? active : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 px-3 rounded-full text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
              active
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

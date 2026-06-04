"use client"

import { cn } from "@/lib/utils"

interface FilterOption {
  value:  string
  label:  string
  count?: number
}

interface FilterBarProps {
  options:      FilterOption[]
  value:        string | string[]
  onChange:     (value: string) => void
  multiSelect?: boolean
  className?:   string
  ariaLabel?:   string
  size?:        "sm" | "md"
}

export function FilterBar({ options, value, onChange, multiSelect = false, className, ariaLabel, size = "md" }: FilterBarProps) {
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
              "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
              "active:scale-[0.97]",
              size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-[12px]",
              active
                ? "bg-[var(--accent)] text-white shadow-[0_1px_3px_rgba(79,110,247,0.3)]"
                : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn(
                "rounded-full px-1 py-px text-[10px] font-bold leading-none",
                active ? "bg-white/20 text-white" : "bg-[var(--line-2)] text-[var(--ink-3)]"
              )}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

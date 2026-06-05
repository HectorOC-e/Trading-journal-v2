"use client"

import { cn } from "@/lib/utils"

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedTabsProps {
  options:  SegmentedOption[]
  value:    string
  onChange: (value: string) => void
  /** underline = bottom-border tabs (dashboard) · pill = rounded chips (toggles) */
  variant?: "underline" | "pill"
  className?: string
  ariaLabel?: string
}

/**
 * Shared sub-navigation tabs (Fase 5 · m3).
 * Replaces the ad-hoc tab markup repeated across Dashboard / Reviews.
 */
export function SegmentedTabs({
  options, value, onChange, variant = "underline", className, ariaLabel,
}: SegmentedTabsProps) {
  if (variant === "pill") {
    return (
      <div className={cn("flex items-center gap-1", className)} role="tablist" aria-label={ariaLabel}>
        {options.map((o) => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                active
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-1 border-b border-[var(--line)]", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="relative px-4 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-t-[var(--radius-xs)]"
            style={{ color: active ? "var(--ink)" : "var(--ink-3)", marginBottom: -1 }}
          >
            {o.label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

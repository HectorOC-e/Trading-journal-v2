import { cn } from "@/lib/utils"

interface ToggleProps {
  on:          boolean
  onChange:    (v: boolean) => void
  disabled?:   boolean
  size?:       "sm" | "md"
  label?:      string
  labelPosition?: "left" | "right"
}

export function Toggle({ on, onChange, disabled, size = "md", label, labelPosition = "right" }: ToggleProps) {
  const sizes = {
    sm: { track: "w-8 h-4",  thumb: "w-3 h-3",  translateOn: "translate-x-4",  translateOff: "translate-x-0.5" },
    md: { track: "w-10 h-5.5", thumb: "w-4 h-4", translateOn: "translate-x-5",  translateOff: "translate-x-0.5" },
  }
  const s = sizes[size]

  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" ? "w-8 h-4" : "w-10 h-[22px]",
        on ? "bg-[var(--win)]" : "bg-[var(--line-2)]"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-sm transition-transform duration-200",
          size === "sm" ? "w-3 h-3" : "w-4 h-4",
          on
            ? size === "sm" ? "translate-x-[18px]" : "translate-x-[22px]"
            : "translate-x-[2px]"
        )}
      />
    </button>
  )

  if (!label) return btn

  return (
    <label className={cn("flex items-center gap-2 cursor-pointer", disabled && "cursor-not-allowed opacity-40")}>
      {labelPosition === "left" && (
        <span className="text-[13px] text-[var(--ink-2)]">{label}</span>
      )}
      {btn}
      {labelPosition === "right" && (
        <span className="text-[13px] text-[var(--ink-2)]">{label}</span>
      )}
    </label>
  )
}

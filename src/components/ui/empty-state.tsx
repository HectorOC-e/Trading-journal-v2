import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon:      LucideIcon
  title:     string
  subtitle?: string
  action?: {
    label:    string
    onClick:  () => void
  }
  secondary?: {
    label:    string
    onClick:  () => void
  }
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EmptyState({ icon: Icon, title, subtitle, action, secondary, size = "md", className }: EmptyStateProps) {
  const iconSizes  = { sm: 18, md: 22, lg: 28 }
  const wrapSizes  = { sm: "w-10 h-10", md: "w-12 h-12", lg: "w-16 h-16" }
  const paddingSz  = { sm: "py-10", md: "py-16", lg: "py-24" }
  const titleSize  = { sm: "text-[13px]", md: "text-[14px]", lg: "text-[16px]" }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center px-6 text-center fade-in",
      paddingSz[size],
      className
    )}>
      <div className={cn(
        "rounded-[var(--radius)] bg-[var(--chip)] flex items-center justify-center mb-4 shrink-0",
        wrapSizes[size]
      )}>
        <Icon size={iconSizes[size]} className="text-[var(--ink-3)]" strokeWidth={1.5} />
      </div>

      <p className={cn("font-semibold text-[var(--ink)] mb-1 tracking-tight", titleSize[size])}>
        {title}
      </p>

      {subtitle && (
        <p className="text-[12px] text-[var(--ink-3)] max-w-[280px] leading-relaxed mb-5">
          {subtitle}
        </p>
      )}

      {(action || secondary) && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {action && (
            <button
              onClick={action.onClick}
              className="h-8 px-4 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-[12px] font-semibold cursor-pointer hover:bg-[var(--accent-h)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              {action.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="h-8 px-4 rounded-[var(--radius-sm)] border border-[var(--line)] bg-transparent text-[var(--ink-2)] text-[12px] font-medium cursor-pointer hover:bg-[var(--chip)] hover:text-[var(--ink)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

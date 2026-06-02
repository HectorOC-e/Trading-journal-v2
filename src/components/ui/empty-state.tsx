import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon:     LucideIcon
  title:    string
  subtitle?: string
  action?:  {
    label:   string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-20 px-6 text-center",
      className
    )}>
      <div className="w-14 h-14 rounded-2xl bg-[var(--chip)] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--ink-3)]" />
      </div>
      <p className="text-[15px] font-semibold text-[var(--ink)] mb-1">{title}</p>
      {subtitle && (
        <p className="text-[13px] text-[var(--ink-3)] max-w-xs leading-relaxed mb-5">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-[13px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

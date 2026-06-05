import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CardProps {
  title?:     string
  sub?:       string
  children:   ReactNode
  className?: string
  action?:    ReactNode
  compact?:   boolean
}

export function Card({ title, sub, children, className, action, compact }: CardProps) {
  return (
    <div className={cn(
      "bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)]",
      compact ? "p-4" : "p-5",
      className
    )}>
      {(title || action) && (
        <div className={cn("flex items-start justify-between gap-3", compact ? "mb-3" : "mb-4")}>
          <div className="min-w-0">
            {title && (
              <p className="text-[13px] font-semibold text-[var(--ink)] leading-snug">{title}</p>
            )}
            {sub && (
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5 leading-snug">{sub}</p>
            )}
          </div>
          {action && (
            <div className="shrink-0">{action}</div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

// TopBar molecule — spec: Trades, Aprendizaje, all screens
// Page title + optional subtitle + right-side action buttons

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface TopBarAction {
  label: string
  icon?: ReactNode
  onClick?: () => void
  variant?: "primary" | "ghost"
}

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: TopBarAction[]
  className?: string
}

export function TopBar({ title, subtitle, actions, className }: TopBarProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-xl font-bold text-[var(--ink)] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--ink-2)] mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "ghost"}
              size="sm"
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

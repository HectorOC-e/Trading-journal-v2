import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

interface TopBarAction {
  label:    string
  icon?:    ReactNode
  onClick?: () => void
  variant?: "primary" | "ghost" | "subtle" | "danger"
  loading?: boolean
  disabled?: boolean
}

interface BreadcrumbItem {
  label:  string
  href?:  string
  onClick?: () => void
}

interface TopBarProps {
  title:        string
  subtitle?:    string
  breadcrumbs?: BreadcrumbItem[]
  actions?:     TopBarAction[]
  className?:   string
  compact?:     boolean
  /** Optional `data-tour` value on the actions group, so a SpotlightTour can
   *  spotlight the primary action (e.g. "Nueva cuenta"). */
  actionsAnchor?: string
}

export function TopBar({ title, subtitle, breadcrumbs, actions, className, compact, actionsAnchor }: TopBarProps) {
  return (
    <div className={cn(
      "flex items-start justify-between gap-3 flex-wrap",
      compact ? "mb-4" : "mb-6",
      className
    )}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-1.5 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight size={11} className="text-[var(--ink-3)] shrink-0" aria-hidden="true" />
                )}
                {crumb.href || crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-[11px] text-[var(--ink-3)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className={cn(
          "font-bold text-[var(--ink)] tracking-tight leading-tight [text-wrap:balance]",
          compact ? "text-[16px]" : "text-[18px] sm:text-[20px]"
        )}>
          {title}
        </h1>

        {subtitle && (
          <p className="text-[12px] text-[var(--ink-3)] mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>

      {actions && actions.length > 0 && (
        <div data-tour={actionsAnchor} className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "ghost"}
              size="sm"
              onClick={action.onClick}
              loading={action.loading}
              disabled={action.disabled}
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

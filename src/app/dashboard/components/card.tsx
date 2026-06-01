import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Card({ title, sub, children, className }: {
  title?: string; sub?: string; children: ReactNode; className?: string
}) {
  return (
    <div className={cn("bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5", className)}>
      {title && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
          {sub && <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

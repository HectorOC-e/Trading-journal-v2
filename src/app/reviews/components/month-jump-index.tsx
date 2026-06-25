"use client"

// "Saltar a mes" jump index for the Reviews timeline (desktop rail only). Renders a
// link per anchor (the live week + each month chapter) and highlights the one
// currently in view via an IntersectionObserver over the timeline section ids.

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface JumpItem { id: string; label: string }

export function MonthJumpIndex({ items }: { items: JumpItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (items.length === 0) return
    const els = items
      .map(it => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el != null)
    if (els.length === 0) return

    // Bias the active line toward the top of the viewport so a section counts as
    // "current" once its header reaches the upper third.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 },
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveId(id)
  }

  if (items.length === 0) return null

  return (
    <nav aria-label="Saltar a mes" className="flex flex-col gap-1">
      <div className="text-[10px] font-bold tracking-[0.13em] text-[var(--ink-3)] mb-1">SALTAR A MES</div>
      {items.map(it => {
        const active = it.id === activeId
        return (
          <button
            key={it.id}
            onClick={() => jump(it.id)}
            className={cn(
              "group flex items-center gap-2 text-left rounded-md px-2 py-1 text-[12px] transition-colors",
              active ? "text-[var(--ink)] font-semibold bg-[var(--chip)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]/60",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                active ? "bg-[var(--accent)]" : "bg-[var(--line)] group-hover:bg-[var(--ink-3)]",
              )}
            />
            <span className="truncate">{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

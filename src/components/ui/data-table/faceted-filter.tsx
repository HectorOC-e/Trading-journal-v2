"use client"

import { useMemo } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Column } from "@tanstack/react-table"

/**
 * Linear-style faceted filter: a chip that opens a popover with the column's
 * distinct values (counts derived from the data) as toggleable checkboxes.
 */
export function FacetedFilter<TData>({
  column,
  title,
  format,
  order,
}: {
  column?: Column<TData, unknown>
  title: string
  /** Pretty-print a raw value for display. */
  format?: (value: string) => string
  /** Optional explicit ordering of option values. */
  order?: string[]
}) {
  const facets = column?.getFacetedUniqueValues()
  const selected = new Set((column?.getFilterValue() as string[]) ?? [])

  const options = useMemo(() => {
    const entries = facets ? Array.from(facets.entries()) : []
    const opts = entries
      .filter(([v]) => v != null && v !== "")
      .map(([value, count]) => ({ value: String(value), count: count as number }))
    if (order) {
      opts.sort((a, b) => {
        const ia = order.indexOf(a.value), ib = order.indexOf(b.value)
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
      })
    } else {
      opts.sort((a, b) => b.count - a.count)
    }
    return opts
  }, [facets, order])

  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    column?.setFilterValue(next.size ? Array.from(next) : undefined)
  }

  const count = selected.size

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] whitespace-nowrap transition-colors active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            count
              ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] font-semibold"
              : "bg-[var(--panel)] text-[var(--ink-2)] border border-[var(--line)] hover:border-[var(--line-2)] hover:text-[var(--ink)]",
          )}
        >
          {title}
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
          <ChevronDown size={12} className="opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] min-w-[180px] max-h-[300px] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-md)] p-1 scale-pop"
          style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
        >
          {options.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-[var(--ink-3)]">Sin opciones</p>
          )}
          {options.map(opt => {
            const isOn = selected.has(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-xs)] text-[13px] text-left hover:bg-[var(--panel-2)] transition-colors"
              >
                <span className={cn(
                  "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors",
                  isOn ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--line-2)]",
                )}>
                  {isOn && <Check size={11} />}
                </span>
                <span className="flex-1 text-[var(--ink)] truncate">{format ? format(opt.value) : opt.value}</span>
                <span className="text-[11px] text-[var(--ink-3)] tabular-nums">{opt.count}</span>
              </button>
            )
          })}
          {count > 0 && (
            <>
              <div className="my-1 border-t border-[var(--line)]" />
              <button
                onClick={() => column?.setFilterValue(undefined)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-xs)] text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--panel-2)] transition-colors"
              >
                <X size={12} /> Limpiar
              </button>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

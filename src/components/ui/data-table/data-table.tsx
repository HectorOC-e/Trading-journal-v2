"use client"

import { useState, type ReactNode } from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DUR, EASE_OUT } from "@/lib/motion"
import type { Density } from "./use-data-table"

// Render as a div-grid (not a real <table>) with ARIA grid roles. This is what
// lets each row be a `motion.div` with layout animation — real <tr> elements
// can't be transform-animated cleanly. Columns align via a shared
// grid-template-columns derived from each column's meta.width.
function gridTemplate<TData>(table: Table<TData>): string {
  return table
    .getVisibleLeafColumns()
    .map(c => c.columnDef.meta?.width ?? "minmax(80px, 1fr)")
    .join(" ")
}

const ROW_PAD: Record<Density, string> = {
  compact:     "py-1.5",
  comfortable: "py-2.5",
}

export function DataTable<TData>({
  table,
  density = "comfortable",
  onRowClick,
  isLoading = false,
  empty,
  className,
  maxHeight = 560,
}: {
  table: Table<TData>
  density?: Density
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  empty?: ReactNode
  className?: string
  maxHeight?: number | string
}) {
  const [scrolled, setScrolled] = useState(false)
  const cols = gridTemplate(table)
  const rows = table.getRowModel().rows
  const colCount = table.getVisibleLeafColumns().length

  return (
    <div
      role="table"
      className={cn(
        "relative overflow-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]",
        className,
      )}
      style={{ maxHeight }}
      onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 0)}
    >
      {/* Header — sticky, with a shadow that appears once you scroll. */}
      <div
        role="rowgroup"
        className="sticky top-0 z-10"
      >
        <div
          role="row"
          className={cn(
            "grid items-center bg-[var(--panel-2)] border-b border-[var(--line)] transition-shadow",
            scrolled && "shadow-[0_4px_12px_oklch(14%_0.018_264_/_0.06)]",
          )}
          style={{ gridTemplateColumns: cols }}
        >
          {table.getHeaderGroups().map(hg =>
            hg.headers.map(header => {
              const canSort = header.column.getCanSort()
              const sorted = header.column.getIsSorted()
              const align = header.column.columnDef.meta?.align ?? "left"
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  className={cn(
                    "px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)] whitespace-nowrap select-none",
                    "flex items-center gap-1",
                    align === "right" && "justify-end",
                    align === "center" && "justify-center",
                    canSort && "cursor-pointer hover:text-[var(--ink-2)] transition-colors",
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {canSort && (
                    <span className="shrink-0 text-[var(--ink-3)]">
                      {sorted === "asc"
                        ? <ArrowUp size={11} className="text-[var(--accent)]" />
                        : sorted === "desc"
                          ? <ArrowDown size={11} className="text-[var(--accent)]" />
                          : <ChevronsUpDown size={11} className="opacity-40" />}
                    </span>
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>

      {/* Body */}
      <div role="rowgroup">
        {isLoading ? (
          <TableSkeleton cols={cols} colCount={colCount} density={density} />
        ) : rows.length === 0 ? (
          <div className="py-14">{empty ?? <DefaultEmpty />}</div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map(row => {
              const selected = row.getIsSelected()
              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ layout: { type: "spring", duration: 0.32, bounce: 0.15 }, opacity: { duration: DUR.item, ease: EASE_OUT } }}
                  role="row"
                  aria-selected={selected}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "grid items-center border-b border-[var(--line)] last:border-b-0",
                    "transition-colors duration-100",
                    onRowClick && "cursor-pointer",
                    selected
                      ? "bg-[var(--accent-soft)]"
                      : onRowClick && "hover:bg-[var(--panel-2)] active:bg-[var(--accent-soft)]",
                  )}
                  style={{ gridTemplateColumns: cols }}
                >
                  {row.getVisibleCells().map(cell => {
                    const align = cell.column.columnDef.meta?.align ?? "left"
                    return (
                      <div
                        key={cell.id}
                        role="cell"
                        className={cn(
                          "px-3 text-[13px] text-[var(--ink-2)] min-w-0",
                          ROW_PAD[density],
                          align === "right" && "text-right",
                          align === "center" && "text-center",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    )
                  })}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function TableSkeleton({ cols, colCount, density }: { cols: string; colCount: number; density: Density }) {
  return (
    <div aria-hidden>
      {Array.from({ length: 8 }).map((_, r) => (
        <div key={r} className="grid items-center border-b border-[var(--line)]" style={{ gridTemplateColumns: cols }}>
          {Array.from({ length: colCount }).map((_, c) => (
            <div key={c} className={cn("px-3", density === "compact" ? "py-1.5" : "py-2.5")}>
              <div className="shimmer h-3.5 rounded" style={{ width: `${50 + ((r + c) % 4) * 12}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Default empty state ───────────────────────────────────────────────────────
function DefaultEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center">
      <p className="text-[13px] font-medium text-[var(--ink-2)]">Sin resultados</p>
      <p className="text-[12px] text-[var(--ink-3)]">Prueba a ajustar los filtros.</p>
    </div>
  )
}

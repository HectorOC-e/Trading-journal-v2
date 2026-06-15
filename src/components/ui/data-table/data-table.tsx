"use client"

import { useState, type ReactNode } from "react"
import { flexRender, type Row as TRow, type Table } from "@tanstack/react-table"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { COLLECTION, EASE_OUT, staggerDelay } from "@/lib/motion"
import { useRovingFocus } from "@/hooks/useRovingFocus"
import type { Density } from "./use-data-table"

type RovingItemProps = { tabIndex: number; ref: (el: HTMLElement | null) => void; onFocus: () => void }

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
  const roving = useRovingFocus(rows.length, {
    onActivate: onRowClick ? (i) => onRowClick(rows[i].original) : undefined,
  })

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
                    "relative px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap select-none",
                    "flex items-center gap-1 transition-colors",
                    sorted ? "text-[var(--accent)]" : "text-[var(--ink-3)]",
                    align === "right" && "justify-end",
                    align === "center" && "justify-center",
                    canSort && "cursor-pointer hover:text-[var(--ink-2)]",
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {canSort && (
                    <span className="shrink-0">
                      {sorted
                        ? <motion.span initial={false} animate={{ rotate: sorted === "desc" ? 180 : 0 }} transition={{ type: "spring", duration: 0.3, bounce: 0.35 }} className="inline-flex"><ArrowUp size={11} className="text-[var(--accent)]" /></motion.span>
                        : <ChevronsUpDown size={11} className="opacity-40" />}
                    </span>
                  )}
                  {/* Active-sort underline — grows in under the sorted column. */}
                  {sorted && (
                    <motion.span
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
                      className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-[var(--accent)] origin-left"
                    />
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>

      {/* Body */}
      <div role="rowgroup" {...(onRowClick ? roving.containerProps : {})}>
        {isLoading ? (
          <TableSkeleton cols={cols} colCount={colCount} density={density} />
        ) : rows.length === 0 ? (
          <div className="py-14">{empty ?? <DefaultEmpty />}</div>
        ) : (
          <AnimatePresence initial>
            {rows.map((row, i) => (
              <Row
                key={row.id}
                row={row}
                index={i}
                cols={cols}
                density={density}
                onRowClick={onRowClick}
                rovingProps={onRowClick ? roving.getItemProps(i) : undefined}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row<TData>({ row, index, cols, density, onRowClick, rovingProps }: {
  row: TRow<TData>
  index: number
  cols: string
  density: Density
  onRowClick?: (row: TData) => void
  rovingProps?: RovingItemProps
}) {
  const selected = row.getIsSelected()
  const delay = staggerDelay(index, "table")
  const spring = COLLECTION.table.spring
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: COLLECTION.table.enterY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{
        layout:  { type: "spring", duration: 0.34, bounce: 0.25 },
        opacity: { duration: 0.22, delay, ease: EASE_OUT },
        y:       { type: "spring", duration: spring.duration, bounce: spring.bounce, delay },
      }}
      role="row"
      aria-selected={selected}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      {...rovingProps}
      className={cn(
        "group relative grid items-center border-b border-[var(--line)] last:border-b-0 outline-none",
        "transition-[background-color,box-shadow] duration-150",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
        onRowClick && "cursor-pointer hover:z-[1] hover:shadow-[var(--shadow-sm)]",
        selected
          ? "bg-[var(--accent-soft)]"
          : onRowClick && "hover:bg-[var(--panel-2)] active:bg-[var(--accent-soft)]",
      )}
      style={{ gridTemplateColumns: cols }}
    >
      {/* Enter flash — new rows pulse accent then settle (skipped on reorder). */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0.45 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, delay, ease: EASE_OUT }}
        className="pointer-events-none absolute inset-0 bg-[var(--accent)]"
        style={{ gridColumn: "1 / -1" }}
      />
      {/* Hover accent bar — slides down the left edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-200"
        style={{ gridColumn: "1 / 2" }}
      />
      {row.getVisibleCells().map(cell => {
        const align = cell.column.columnDef.meta?.align ?? "left"
        return (
          <div
            key={cell.id}
            role="cell"
            className={cn(
              "relative px-3 text-[13px] text-[var(--ink-2)] min-w-0",
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

"use client"

import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/motion"
import type { Density } from "./use-data-table"

// Lightweight, read-only table that shares the DataTable look (header style,
// row lines, density, staggered entrance) WITHOUT the interactive machinery
// (no sorting/filtering/pagination). For small static tables where the full
// DataTable would be over-engineering.

export interface SimpleColumn<T> {
  key: string
  header: ReactNode
  align?: "left" | "right" | "center"
  width?: string                 // grid-template width; default minmax(80px,1fr)
  render?: (row: T, index: number) => ReactNode
  cellClassName?: string
}

const STAGGER_STEP = 0.03
const STAGGER_CAP = 12
const ROW_PAD: Record<Density, string> = { compact: "py-1.5", comfortable: "py-2.5" }

export function SimpleTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  density = "comfortable",
  empty,
  className,
  stagger = true,
  rowClassName,
}: {
  columns: SimpleColumn<T>[]
  data: T[]
  getRowKey?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  density?: Density
  empty?: ReactNode
  className?: string
  stagger?: boolean
  rowClassName?: (row: T, index: number) => string | undefined
}) {
  const cols = columns.map(c => c.width ?? "minmax(80px, 1fr)").join(" ")

  return (
    <div role="table" className={cn("rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden", className)}>
      {/* Header */}
      <div role="row" className="grid items-center bg-[var(--panel-2)] border-b border-[var(--line)]" style={{ gridTemplateColumns: cols }}>
        {columns.map(c => (
          <div
            key={c.key}
            role="columnheader"
            className={cn(
              "px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)] whitespace-nowrap",
              c.align === "right" && "text-right",
              c.align === "center" && "text-center",
            )}
          >
            {c.header}
          </div>
        ))}
      </div>

      {/* Body */}
      {data.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--ink-3)]">{empty ?? "Sin datos"}</div>
      ) : (
        data.map((row, i) => {
          const delay = stagger ? Math.min(i, STAGGER_CAP) * STAGGER_STEP : 0
          return (
            <motion.div
              key={getRowKey?.(row, i) ?? i}
              initial={stagger ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay, ease: EASE_OUT }}
              role="row"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "group relative grid items-center border-b border-[var(--line)] last:border-b-0 transition-colors duration-100",
                onRowClick && "cursor-pointer hover:bg-[var(--panel-2)] active:bg-[var(--accent-soft)]",
                rowClassName?.(row, i),
              )}
              style={{ gridTemplateColumns: cols }}
            >
              {onRowClick && (
                <span aria-hidden className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-200" />
              )}
              {columns.map(c => (
                <div
                  key={c.key}
                  role="cell"
                  className={cn(
                    "px-3 text-[13px] text-[var(--ink-2)] min-w-0",
                    ROW_PAD[density],
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.cellClassName,
                  )}
                >
                  {c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                </div>
              ))}
            </motion.div>
          )
        })
      )}
    </div>
  )
}

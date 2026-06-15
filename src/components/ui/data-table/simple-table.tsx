"use client"

import { useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { COLLECTION, EASE_OUT, staggerDelay, type CollectionPreset } from "@/lib/motion"
import { useRovingFocus } from "@/hooks/useRovingFocus"
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
  preset = "table",
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
  /** Motion preset — defaults to dense "table". */
  preset?: CollectionPreset
}) {
  const cols = columns.map(c => c.width ?? "minmax(80px, 1fr)").join(" ")
  const roving = useRovingFocus(data.length, {
    onActivate: onRowClick ? (i) => onRowClick(data[i]) : undefined,
  })

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
      <div role="rowgroup" {...(onRowClick ? roving.containerProps : {})}>
        {data.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[var(--ink-3)]">{empty ?? "Sin datos"}</div>
        ) : (
          data.map((row, i) => (
            <SimpleRow
              key={getRowKey?.(row, i) ?? i}
              cols={cols}
              delay={stagger ? staggerDelay(i, preset) : 0}
              spring={COLLECTION[preset].spring}
              enterY={COLLECTION[preset].enterY}
              stagger={stagger}
              clickable={!!onRowClick}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              rovingProps={onRowClick ? roving.getItemProps(i) : undefined}
              className={rowClassName?.(row, i)}
            >
              {columns.map(c => (
                <div
                  key={c.key}
                  role="cell"
                  className={cn(
                    "relative px-3 text-[13px] text-[var(--ink-2)] min-w-0",
                    ROW_PAD[density],
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.cellClassName,
                  )}
                >
                  {c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                </div>
              ))}
            </SimpleRow>
          ))
        )}
      </div>
    </div>
  )
}

// ── Row with tap-pulse ────────────────────────────────────────────────────────
// A bare :active state is imperceptible on a quick mobile tap (it ends the moment
// the finger lifts). Instead, every tap/click replays a short accent flash that
// fades out on its own — visible regardless of how brief the touch was.
function SimpleRow({
  children, cols, delay, spring, enterY, stagger, clickable, onClick, rovingProps, className,
}: {
  children: ReactNode
  cols: string
  delay: number
  spring: { duration: number; bounce: number }
  enterY: number
  stagger: boolean
  clickable: boolean
  onClick?: () => void
  rovingProps?: { tabIndex: number; ref: (el: HTMLElement | null) => void; onFocus: () => void }
  className?: string
}) {
  const [pulse, setPulse] = useState(0)
  return (
    <motion.div
      initial={stagger ? { opacity: 0, y: enterY } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ opacity: { duration: 0.24, delay, ease: EASE_OUT }, y: { type: "spring", duration: spring.duration, bounce: spring.bounce, delay } }}
      role="row"
      onClick={onClick}
      onTap={() => setPulse(p => p + 1)}
      {...rovingProps}
      className={cn(
        "group relative grid items-center border-b border-[var(--line)] last:border-b-0 outline-none transition-[background-color,box-shadow] duration-100",
        "hover:bg-[var(--panel-2)]",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]",
        clickable && "cursor-pointer",
        className,
      )}
      style={{ gridTemplateColumns: cols }}
    >
      {stagger && (
        <motion.span aria-hidden initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, delay, ease: EASE_OUT }} className="pointer-events-none absolute inset-0 bg-[var(--accent)]" />
      )}
      {/* Tap/click pulse — replays on every interaction, fades out on its own. */}
      {pulse > 0 && (
        <motion.span key={pulse} aria-hidden initial={{ opacity: 0.32 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }} className="pointer-events-none absolute inset-0 bg-[var(--accent)]" />
      )}
      {/* Hover accent bar (desktop). */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-200" />
      {children}
    </motion.div>
  )
}

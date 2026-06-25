"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/motion"

export type MonthFilter = { year: number; month: number | null } | null

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MONTHS_LONG  = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

function labelFor(v: MonthFilter): string {
  if (!v) return "Calendario"
  if (v.month == null) return String(v.year)
  return `${MONTHS_SHORT[v.month - 1]} ${v.year}`
}

/**
 * Calendar-style month/year filter. The trigger reflects the active filter; the
 * popover navigates years (◀ ▶) and shows a 12-month grid where months that have
 * reviews are highlighted. Picking a month filters the timeline to it; "Todo el
 * año" filters to the whole year; "Todos" clears.
 */
export function ReviewsCalendarFilter({ value, onChange, monthsWithReviews, align = "right" }: {
  value: MonthFilter
  onChange: (v: MonthFilter) => void
  monthsWithReviews: Set<string> // "YYYY-MM"
  align?: "left" | "right" // popover edge to anchor to (rail uses "left")
}) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(value?.year ?? new Date().getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [open])

  const toggle = () => {
    if (!open) setViewYear(value?.year ?? new Date().getFullYear()) // sync the grid to the active year on open
    setOpen(o => !o)
  }

  const active = value != null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] border",
          active
            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
            : "bg-[var(--panel-2)] text-[var(--ink-2)] border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--accent)]/50",
        )}
      >
        <Calendar size={13} />
        {labelFor(value)}
        {active && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar filtro de fecha"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="ml-0.5 -mr-1 grid place-items-center w-4 h-4 rounded-full hover:bg-white/20"
          >
            <X size={11} />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            style={{ transformOrigin: align === "left" ? "top left" : "top right" }}
            className={cn(
              "absolute top-9 z-30 w-[248px] max-w-[calc(100vw-2rem)] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-lg)] p-3",
              align === "left" ? "left-0" : "right-0",
            )}
          >
            {/* Year nav */}
            <div className="flex items-center justify-between mb-2.5">
              <button onClick={() => setViewYear(y => y - 1)} className="grid place-items-center w-7 h-7 rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] active:scale-90 transition">
                <ChevronLeft size={15} />
              </button>
              <span className="font-mono font-bold text-[14px] text-[var(--ink)]">{viewYear}</span>
              <button onClick={() => setViewYear(y => y + 1)} className="grid place-items-center w-7 h-7 rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] active:scale-90 transition">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const month = i + 1
                const has = monthsWithReviews.has(`${viewYear}-${String(month).padStart(2, "0")}`)
                const isActive = value?.year === viewYear && value?.month === month
                return (
                  <button
                    key={m}
                    disabled={!has}
                    onClick={() => { onChange({ year: viewYear, month }); setOpen(false) }}
                    title={has ? `${MONTHS_LONG[i]} ${viewYear}` : "Sin reviews"}
                    className={cn(
                      "relative h-9 rounded-md text-[12px] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : has
                          ? "bg-[var(--panel-2)] text-[var(--ink-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                          : "text-[var(--ink-3)] opacity-40 cursor-not-allowed",
                    )}
                  >
                    {m}
                    {has && !isActive && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--line)]">
              <button
                onClick={() => { onChange({ year: viewYear, month: null }); setOpen(false) }}
                className="text-[11.5px] font-medium text-[var(--accent)] hover:underline"
              >
                Todo {viewYear}
              </button>
              {value != null && (
                <button onClick={() => { onChange(null); setOpen(false) }} className="text-[11.5px] text-[var(--ink-3)] hover:text-[var(--ink)]">
                  Quitar filtro
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

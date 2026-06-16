"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, X } from "lucide-react"

export interface TourStep {
  /** Value of the target element's `data-tour` attribute. */
  anchor: string
  title: string
  body: string
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8          // breathing room around the highlighted element
const CARD_W = 300
const GAP = 12         // gap between cutout and card

function readRect(anchor: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/**
 * A small, dependency-free guided tour: dims the page and spotlights one
 * `data-tour` anchor at a time with an explanatory card. Reusable across pages;
 * the parent owns open state + persistence (e.g. a "seen" flag).
 */
export function SpotlightTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const reduce = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)

  const step = steps[i]

  // Reset to the first step every time the tour opens.
  useEffect(() => { if (open) setI(0) }, [open])

  // Scroll the anchor into view when the step changes.
  useEffect(() => {
    if (!open || !step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
  }, [open, step, reduce])

  // Measure (and keep measuring on resize/scroll) the active anchor's rect.
  useLayoutEffect(() => {
    if (!open || !step) return
    let raf = 0
    const measure = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setRect(readRect(step.anchor))) }
    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    const t = setTimeout(measure, 320) // after smooth-scroll settles
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); clearTimeout(t); cancelAnimationFrame(raf) }
  }, [open, step])

  const finish = useCallback(() => { onClose() }, [onClose])
  const next = useCallback(() => { if (i < steps.length - 1) setI(i + 1); else finish() }, [i, steps.length, finish])
  const back = useCallback(() => setI(v => Math.max(0, v - 1)), [])

  // Keyboard nav.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish()
      else if (e.key === "ArrowRight" || e.key === "Enter") next()
      else if (e.key === "ArrowLeft") back()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, next, back, finish])

  if (!open || !step) return null

  // Card placement: below the cutout if there's room, else above.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200
  let cardTop = vh / 2 - 80, cardLeft = vw / 2 - CARD_W / 2
  if (rect) {
    const below = rect.top + rect.height + PAD + GAP
    const wantAbove = below + 160 > vh
    cardTop = wantAbove ? Math.max(12, rect.top - PAD - GAP - 150) : below
    cardLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12)
  }

  const dur = reduce ? 0 : 0.22
  const ease = [0.23, 1, 0.32, 1] as const

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Tutorial de la página">
      {/* Dim + spotlight cutout via a big box-shadow on the anchor rect. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.anchor}
          initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: dur }}
          className="absolute rounded-[var(--radius)] pointer-events-none"
          style={
            rect
              ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)", outline: "2px solid var(--accent)", outlineOffset: 2 }
              : { inset: 0, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }
          }
        />
      </AnimatePresence>

      {/* Backdrop click = skip/close. */}
      <button aria-label="Cerrar tutorial" onClick={finish} className="absolute inset-0 w-full h-full cursor-default" />

      {/* Step card */}
      <motion.div
        ref={cardRef}
        key={`card-${i}`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: dur, ease }}
        className="absolute rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-lg)] p-4"
        style={{ top: cardTop, left: cardLeft, width: CARD_W }}
      >
        <button onClick={finish} aria-label="Saltar tutorial"
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)] transition-colors active:scale-95">
          <X size={15} />
        </button>
        <p className="text-eyebrow mb-1">{`Paso ${i + 1} de ${steps.length}`}</p>
        <p className="text-[14px] font-semibold text-[var(--ink)] leading-tight pr-6" aria-live="polite">{step.title}</p>
        <p className="text-[12.5px] text-[var(--ink-2)] mt-1.5 leading-snug">{step.body}</p>

        <div className="flex items-center justify-between mt-3.5">
          <div className="flex items-center gap-1">
            {steps.map((_, k) => (
              <span key={k} className="rounded-full transition-all" style={{ width: k === i ? 16 : 6, height: 6, background: k === i ? "var(--accent)" : "var(--line-2)" }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {i > 0 && (
              <button onClick={back}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] text-[12px] hover:bg-[var(--chip)] transition-colors active:scale-95">
                <ArrowLeft size={13} /> Atrás
              </button>
            )}
            <button onClick={next}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] text-[12px] font-medium hover:bg-[var(--accent-h)] transition-colors active:scale-95">
              {i < steps.length - 1 ? <>Siguiente <ArrowRight size={13} /></> : "Listo"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

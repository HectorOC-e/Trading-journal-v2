"use client"

import { useEffect, useRef, useState } from "react"
import { animate, useReducedMotion } from "framer-motion"
import { DUR, EASE_OUT } from "@/lib/motion"

/**
 * Animated number that counts up on mount and re-animates when `value` changes.
 *
 * Accepts a numeric value OR an already-formatted string (e.g. "$1,234.50",
 * "+12.5%", "-$3,400"). For strings it parses the prefix/suffix, the decimal
 * precision and whether the number is grouped with thousands separators, then
 * reformats every interpolated frame so the output is visually identical to the
 * static label — only animated.
 *
 * Respects prefers-reduced-motion: jumps straight to the final value.
 */
export function CountUp({
  value,
  className,
  style,
  /** Force-disable the animation (e.g. inside a virtualized list). */
  animate: shouldAnimate = true,
}: {
  value: string | number
  className?: string
  style?: React.CSSProperties
  animate?: boolean
}) {
  const reduce = useReducedMotion()
  const parsed = parse(value)
  const { prefix, suffix, target, decimals, grouped, literal } = parsed
  const [display, setDisplay] = useState(() =>
    reduce || !shouldAnimate ? format(target, decimals, grouped) : format(0, decimals, grouped),
  )
  const prev = useRef(0)

  useEffect(() => {
    if (literal != null) return
    if (reduce || !shouldAnimate) {
      setDisplay(format(target, decimals, grouped))
      prev.current = target
      return
    }
    const from = prev.current
    const controls = animate(from, target, {
      duration: DUR.count,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(format(v, decimals, grouped)),
    })
    prev.current = target
    return () => controls.stop()
  }, [literal, target, decimals, grouped, reduce, shouldAnimate])

  // Non-numeric value (e.g. "—", "n/d") — render as-is, nothing to count.
  if (literal != null) return <span className={className} style={style}>{literal}</span>

  return (
    <span className={className} style={style}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

// ── Parsing ────────────────────────────────────────────────────────────────
interface Parsed {
  prefix: string
  suffix: string
  target: number
  decimals: number
  grouped: boolean
  /** Set when the value has no numeric part (e.g. "—") — render verbatim. */
  literal?: string
}

function parse(value: string | number): Parsed {
  if (typeof value === "number") {
    return { prefix: "", suffix: "", target: value, decimals: 0, grouped: false }
  }
  // First numeric run (with optional grouping/decimals) is the value; whatever
  // sits before it is the prefix ($, +, -$ …) and after it the suffix (%, " min").
  const m = value.match(/[\d,]*\.?\d+/)
  if (!m || m.index == null) return { prefix: "", suffix: "", target: 0, decimals: 0, grouped: false, literal: value }
  const core = m[0]
  const prefix = value.slice(0, m.index)
  const suffix = value.slice(m.index + core.length)
  const grouped = core.includes(",")
  const cleaned = core.replace(/,/g, "")
  const dot = cleaned.indexOf(".")
  const decimals = dot === -1 ? 0 : cleaned.length - dot - 1
  const target = parseFloat(cleaned) || 0
  return { prefix, suffix, target, decimals, grouped }
}

function format(n: number, decimals: number, grouped: boolean): string {
  if (grouped) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }
  return n.toFixed(decimals)
}

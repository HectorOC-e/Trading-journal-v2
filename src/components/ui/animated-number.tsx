"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Counts a number up to its target on mount (and animates between values when
 * the target changes). Count-up is a rare, first-paint flourish — exactly the
 * kind of animation Emil says is worth it — so it's enabled by default but
 * fully skipped under prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 700,
}: {
  value: number
  format?: (n: number) => string
  durationMs?: number
}) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const to = value
    const from = fromRef.current
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce || from === to || !Number.isFinite(to)) {
      setDisplay(to)
      fromRef.current = to
      return
    }
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic
    let raf = 0
    let start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / durationMs)
      setDisplay(from + (to - from) * ease(p))
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return <>{format(display)}</>
}

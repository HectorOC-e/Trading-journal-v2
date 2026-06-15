"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Orientation = "vertical" | "grid"

interface RovingOptions {
  /** "grid" enables ←/→ + row math via `columns`. */
  orientation?: Orientation
  columns?: number
  /** Activate (Enter/Space) the focused item. */
  onActivate?: (index: number) => void
  /** Wrap around at the ends. */
  loop?: boolean
}

/**
 * Roving tabindex keyboard navigation for a collection of items (table rows,
 * list rows, card grids). One item is tabbable at a time; ↑/↓ (and ←/→ in grid
 * mode, Home/End) move focus; Enter/Space activate. Returns props to spread on
 * the container and on each item.
 */
export function useRovingFocus(count: number, opts: RovingOptions = {}) {
  const { orientation = "vertical", columns = 1, onActivate, loop = false } = opts
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  // Keep active index in range when the collection shrinks (filter/page change).
  useEffect(() => {
    if (active > count - 1) setActive(Math.max(0, count - 1))
  }, [count, active])

  const focusIndex = useCallback((i: number) => {
    const clamped = loop
      ? (i + count) % count
      : Math.max(0, Math.min(count - 1, i))
    setActive(clamped)
    refs.current[clamped]?.focus()
  }, [count, loop])

  const onContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (count === 0) return
    const cols = orientation === "grid" ? Math.max(1, columns) : 1
    let next: number | null = null
    switch (e.key) {
      case "ArrowDown": next = active + cols; break
      case "ArrowUp":   next = active - cols; break
      case "ArrowRight": if (orientation === "grid") next = active + 1; break
      case "ArrowLeft":  if (orientation === "grid") next = active - 1; break
      case "Home": next = 0; break
      case "End":  next = count - 1; break
      case "Enter":
      case " ":
        if (onActivate) { e.preventDefault(); onActivate(active) }
        return
      default: return
    }
    if (next == null) return
    e.preventDefault()
    focusIndex(next)
  }, [active, columns, count, orientation, onActivate, focusIndex])

  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === active ? 0 : -1,
    ref: (el: HTMLElement | null) => { refs.current[index] = el },
    onFocus: () => setActive(index),
  }), [active])

  return {
    activeIndex: active,
    setActiveIndex: setActive,
    containerProps: { onKeyDown: onContainerKeyDown },
    getItemProps,
  }
}

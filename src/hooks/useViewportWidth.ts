"use client"

import { useSyncExternalStore } from "react"

/** Tailwind-aligned breakpoints used for responsive column hiding. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024 } as const
export type Breakpoint = keyof typeof BREAKPOINTS

function subscribe(callback: () => void): () => void {
  window.addEventListener("resize", callback)
  return () => window.removeEventListener("resize", callback)
}

/**
 * Current viewport width via useSyncExternalStore — reliable under the React
 * Compiler (a plain useState+useEffect can be skipped/mis-memoized). Returns
 * null on the server so SSR renders all columns; React re-reads the real width
 * right after hydration without a mismatch.
 */
export function useViewportWidth(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth,  // client snapshot
    () => null,               // server snapshot (SSR-safe)
  )
}

/** A column with `hideBelow` is hidden when the viewport is narrower than it. */
export function isHiddenAt(hideBelow: Breakpoint | undefined, width: number | null): boolean {
  if (!hideBelow || width == null) return false
  return width < BREAKPOINTS[hideBelow]
}

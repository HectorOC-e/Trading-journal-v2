// ── Motion system ─────────────────────────────────────────────────────────
// Crisp / pro personality: strong ease-out, no bounce, everything <300ms.
// Mirrors the CSS tokens in globals.css (--ease-out) so CSS and framer-motion
// animations feel identical. Per Emil Kowalski's design-engineering rules:
//   · only transform + opacity (GPU)
//   · ease-out for enters, short durations, subtle press feedback
//   · reduced-motion ⇒ keep opacity, drop movement (handled at call sites via
//     framer's useReducedMotion)
import type { Transition, Variants } from "framer-motion"

/** Strong ease-out — identical curve to CSS `--ease-out`. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Durations (seconds). Keep UI motion under 0.3s. */
export const DUR = {
  press: 0.12,
  hover: 0.16,
  item: 0.22,
  enter: 0.28,
  count: 0.6, // count-up is a rare mount/data-change event → can be a touch longer
} as const

/** Delay between staggered children (40ms — short, never blocks). */
export const STAGGER_STEP = 0.04

export const enterTransition: Transition = { duration: DUR.enter, ease: EASE_OUT }
export const itemTransition: Transition = { duration: DUR.item, ease: EASE_OUT }

/** Container that staggers its children in. Pair with `fadeUpItem`. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.02 },
  },
}

/** Child entrance: fade + 8px rise. Nothing appears from nothing. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: itemTransition },
}

/** Plain fade (no movement) — for reduced-motion fallbacks. */
export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.item, ease: EASE_OUT } },
}

/** Section/page entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: enterTransition },
}

/** Hover-lift + press-scale for pressable cards. Crisp, no bounce. */
export const pressable = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: DUR.hover, ease: EASE_OUT },
} as const

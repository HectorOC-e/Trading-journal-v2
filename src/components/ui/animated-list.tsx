"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { COLLECTION, EASE_OUT, staggerDelay, type CollectionPreset } from "@/lib/motion"
import { useRovingFocus } from "@/hooks/useRovingFocus"

/**
 * Shared motion + keyboard-focus wrapper for any repeated collection that isn't
 * a DataTable/SimpleTable (rule rows, cards, grids…). Applies the chosen preset:
 *   · stagger entrance + enter flash (all)
 *   · hover accent bar (list) or hover lift (card)
 *   · roving tabindex + focus-visible ring
 * The caller supplies the inner content via `renderItem`; AnimatedList owns the
 * animated, focusable shell so every surface feels identical.
 */
export function AnimatedList<T>({
  items,
  getKey,
  renderItem,
  onItemClick,
  preset = "list",
  columns = 1,
  className,
  itemClassName,
}: {
  items: T[]
  getKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
  onItemClick?: (item: T, index: number) => void
  preset?: CollectionPreset
  /** >1 enables grid roving (←/→). */
  columns?: number
  className?: string
  itemClassName?: string
}) {
  const roving = useRovingFocus(items.length, {
    orientation: columns > 1 ? "grid" : "vertical",
    columns,
    onActivate: onItemClick ? (i) => onItemClick(items[i], i) : undefined,
  })
  const m = COLLECTION[preset]
  const isCard = preset === "card"
  const [activeKey, setActiveKey] = useState<string | null>(null)

  return (
    <div className={className} {...(onItemClick ? roving.containerProps : {})}>
      <AnimatePresence initial>
        {items.map((item, i) => {
          const key = getKey(item, i)
          return (
          <AnimatedItem
            key={key}
            delay={staggerDelay(i, preset)}
            spring={m.spring}
            enterY={m.enterY}
            isCard={isCard}
            hoverLift={m.hoverLift}
            clickable={!!onItemClick}
            active={key === activeKey}
            onActivate={() => setActiveKey(key)}
            onClick={onItemClick ? () => onItemClick(item, i) : undefined}
            rovingProps={onItemClick ? roving.getItemProps(i) : undefined}
            itemClassName={itemClassName}
          >
            {renderItem(item, i)}
          </AnimatedItem>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Tap/click replays a short accent pulse that fades out on its own — perceptible
// on mobile where a bare :active ends the instant the finger lifts.
function AnimatedItem({
  children, delay, spring, enterY, isCard, hoverLift, clickable, active, onActivate, onClick, rovingProps, itemClassName,
}: {
  children: ReactNode
  delay: number
  spring: { duration: number; bounce: number }
  enterY: number
  isCard: boolean
  hoverLift: number
  clickable: boolean
  active?: boolean
  onActivate?: () => void
  onClick?: () => void
  rovingProps?: { tabIndex: number; ref: (el: HTMLElement | null) => void; onFocus: () => void }
  itemClassName?: string
}) {
  const [pulse, setPulse] = useState(0)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: enterY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{
        layout: { type: "spring", duration: 0.34, bounce: 0.25 },
        opacity: { duration: 0.24, delay, ease: EASE_OUT },
        y: { type: "spring", duration: spring.duration, bounce: spring.bounce, delay },
      }}
      whileHover={isCard ? { y: hoverLift } : undefined}
      whileTap={isCard ? { scale: 0.985 } : undefined}
      onClick={onClick}
      onTap={() => { setPulse(p => p + 1); onActivate?.() }}
      {...rovingProps}
      className={cn(
        "group relative outline-none rounded-[var(--radius)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
        clickable && "cursor-pointer",
        itemClassName,
      )}
    >
      {/* Enter flash */}
      <motion.span aria-hidden initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, delay, ease: EASE_OUT }} className="pointer-events-none absolute inset-0 rounded-[var(--radius)] bg-[var(--accent)]" />
      {/* Tap/click pulse */}
      {pulse > 0 && (
        <motion.span key={pulse} aria-hidden initial={{ opacity: 0.3 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }} className="pointer-events-none absolute inset-0 rounded-[var(--radius)] bg-[var(--accent)]" />
      )}
      {/* Active tint — stays until another item is tapped. */}
      {active && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[var(--radius)] bg-[var(--accent)] opacity-[0.10]" />
      )}
      {/* List preset: accent bar — hover, and stays while active. */}
      {!isCard && (
        <span aria-hidden className={cn("pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[var(--accent)] origin-top transition-transform duration-200 group-hover:scale-y-100", active ? "scale-y-100" : "scale-y-0")} />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

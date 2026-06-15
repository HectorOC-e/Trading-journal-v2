"use client"

import { type ReactNode } from "react"
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

  return (
    <div className={className} {...(onItemClick ? roving.containerProps : {})}>
      <AnimatePresence initial>
        {items.map((item, i) => {
          const delay = staggerDelay(i, preset)
          return (
            <motion.div
              key={getKey(item, i)}
              layout
              initial={{ opacity: 0, y: m.enterY }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{
                layout: { type: "spring", duration: 0.34, bounce: 0.25 },
                opacity: { duration: 0.24, delay, ease: EASE_OUT },
                y: { type: "spring", duration: m.spring.duration, bounce: m.spring.bounce, delay },
              }}
              whileHover={isCard ? { y: m.hoverLift } : undefined}
              whileTap={isCard ? { scale: 0.985 } : undefined}
              onClick={onItemClick ? () => onItemClick(item, i) : undefined}
              {...(onItemClick ? roving.getItemProps(i) : {})}
              className={cn(
                "group relative outline-none rounded-[var(--radius)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
                onItemClick && "cursor-pointer",
                itemClassName,
              )}
            >
              {/* Enter flash */}
              <motion.span
                aria-hidden
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.7, delay, ease: EASE_OUT }}
                className="pointer-events-none absolute inset-0 rounded-[var(--radius)] bg-[var(--accent)]"
              />
              {/* List preset: accent bar — hover (desktop) + active/tap (mobile). */}
              {!isCard && (
                <span aria-hidden className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[var(--accent)] origin-top scale-y-0 group-hover:scale-y-100 group-active:scale-y-100 transition-transform duration-200" />
              )}
              <div className="relative">{renderItem(item, i)}</div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  DUR,
  EASE_OUT,
  fadeUp,
  fadeUpItem,
  pressable,
  staggerContainer,
} from "@/lib/motion"

/**
 * Motion primitives (crisp / pro). All respect prefers-reduced-motion globally
 * via <MotionConfig reducedMotion="user"> in the app shell, which strips
 * transform-based motion while keeping opacity.
 */

/** Stagger container — animates children in one after another. */
export function Stagger({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Child of <Stagger>. Fade + 8px rise. */
export function StaggerItem({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={className} variants={fadeUpItem} {...props}>
      {children}
    </motion.div>
  )
}

/** One-shot section/page entrance (fade + rise). */
export function FadeIn({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Pressable card — hover-lift + press-scale + optional entrance.
 * Use for clickable cards/rows. Keeps press feedback consistent with Button.
 */
export function PressCard({
  className,
  children,
  entrance = false,
  ...props
}: HTMLMotionProps<"div"> & { entrance?: boolean }) {
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      {...(entrance
        ? { variants: fadeUpItem }
        : {})}
      whileHover={pressable.whileHover}
      whileTap={pressable.whileTap}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

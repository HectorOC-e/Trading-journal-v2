"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

/** Mobile bottom sheet: drag-down (or backdrop tap / Esc) to dismiss. */
export function CenterSheet({ open, onClose, children }: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[81] flex max-h-[85vh] flex-col rounded-t-[20px] border-t border-[var(--line)] bg-[var(--panel)]"
            style={{ boxShadow: "0 -16px 40px rgba(0,0,0,0.5)" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
          >
            <div className="mx-auto mb-1 mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--line)]" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface DrawerPanelProps {
  open:      boolean
  onClose:   () => void
  children:  React.ReactNode
  /** Desktop width in px (default 480). On mobile it becomes a near-fullscreen sheet. */
  width?:    number
  /** Accessible label for the dialog. */
  ariaLabel?: string
  className?: string
}

/**
 * Unified detail-overlay pattern (UI/UX redesign · Fase 2).
 * Replaces the per-page 340px push-rails that strangled the main column (C3).
 * - Desktop/tablet: slides from the right over a backdrop, does NOT reflow content.
 * - Mobile (<768): sheet inset between the top bar (52px) and the bottom nav (60px).
 * - Closes on Esc, backdrop click, or explicit control. Locks body scroll while open.
 */
export function DrawerPanel({
  open,
  onClose,
  children,
  width = 480,
  ariaLabel = "Panel de detalle",
  className,
}: DrawerPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const panelStyle: React.CSSProperties = isMobile
    ? {
        left: 0, right: 0, top: 52, bottom: 60,
        borderTop: "1px solid var(--line)",
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
      }
    : {
        top: 0, right: 0, bottom: 0,
        width, maxWidth: "100vw",
        borderLeft: "1px solid var(--line)",
      }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[45]"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 fade-in"
        style={{ background: "rgba(0,0,0,0.40)" }}
        aria-hidden="true"
      />
      <div
        className={cn("absolute bg-[var(--panel)] overflow-y-auto", className)}
        style={{
          ...panelStyle,
          background: "var(--panel)",
          boxShadow: "var(--shadow-lg)",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {children}
      </div>
    </div>
  )
}

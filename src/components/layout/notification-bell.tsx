"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/lib/notifications"
import { CenterPanel } from "@/components/notifications/center-panel"

/**
 * Notification center bell. The dropdown is portalled to document.body and
 * positioned from the button rect (escapes the sidebar's overflow:hidden).
 * Data comes from the persisted `notifications` router via useNotifications().
 */
export function NotificationBell({
  placement = "up",
  align = "right",
  compact = false,
}: {
  placement?: "up" | "down"
  align?: "left" | "right"
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<React.CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { count } = useNotifications()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    function place() {
      const r = btnRef.current!.getBoundingClientRect()
      const c: React.CSSProperties = { position: "fixed" }
      if (align === "left") c.left = r.left
      else c.right = Math.max(8, window.innerWidth - r.right)
      if (placement === "up") c.bottom = window.innerHeight - r.top + 8
      else c.top = r.bottom + 8
      setCoords(c)
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [open, align, placement])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className={cn(
          "relative flex items-center justify-center rounded-[var(--radius-xs)] transition-colors",
          compact ? "w-8 h-8" : "w-7 h-7",
          "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]",
          open && "bg-[var(--chip)] text-[var(--ink)]",
        )}
        style={!compact ? { border: "1px solid var(--line)" } : undefined}
      >
        <Bell size={compact ? 16 : 14} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{ background: "var(--loss)", border: "1.5px solid var(--panel)" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          className="w-[380px] max-w-[calc(100vw-16px)] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden scale-pop"
          style={{ ...coords, zIndex: 70, boxShadow: "var(--shadow-lg)" }}
        >
          <CenterPanel onClose={() => setOpen(false)} />
        </div>,
        document.body,
      )}
    </div>
  )
}

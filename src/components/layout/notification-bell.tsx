"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Bell, Lock, Clock, BookOpen, ShieldCheck, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications, type AppNotification } from "@/lib/notifications"

const TONE_ICON = {
  danger:   Lock,
  warning:  Clock,
  info:     BookOpen,
  reminder: ShieldCheck,
} as const

function toneColor(t: AppNotification["tone"]) {
  return t === "danger" ? "var(--loss)" : t === "warning" ? "var(--be)" : t === "reminder" ? "var(--ink-3)" : "var(--accent)"
}

/**
 * Notification center bell (Fase 6).
 * The dropdown is rendered through a PORTAL to document.body and positioned with
 * fixed coords from the button rect — this escapes the sidebar's overflow:hidden
 * (which previously clipped it). Anchors via `align` so it never opens off-screen.
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

  const { active, count, dismiss, clearAll } = useNotifications()

  useEffect(() => setMounted(true), [])

  // Close on outside click (account for the portalled panel being outside the button)
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

  // Position the portalled panel relative to the button
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
          className="w-[300px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden scale-pop"
          style={{ ...coords, zIndex: 70, boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between px-3.5 h-11 border-b border-[var(--line)]">
            <p className="text-[12.5px] font-semibold text-[var(--ink)]">Notificaciones</p>
            {count > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors"
              >
                <CheckCheck size={13} /> Limpiar
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 py-9 px-4 text-center">
              <Check size={22} className="text-[var(--win)]" />
              <p className="text-[12px] text-[var(--ink-3)]">Todo al día. Sin alertas.</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto py-1">
              {active.slice(0, 8).map((n) => {
                const Icon = TONE_ICON[n.tone]
                return (
                  <div key={n.id} className="group flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-[var(--chip)] transition-colors">
                    <span className="mt-0.5 shrink-0" style={{ color: toneColor(n.tone) }}><Icon size={15} /></span>
                    <Link href={n.href} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-[var(--ink)] leading-snug">{n.title}</span>
                      {n.body && <span className="block text-[10.5px] text-[var(--ink-3)] leading-snug line-clamp-2 mt-0.5">{n.body}</span>}
                    </Link>
                    <button
                      onClick={() => dismiss(n.id)}
                      aria-label="Descartar"
                      className="shrink-0 w-6 h-6 -mr-1 rounded flex items-center justify-center text-[var(--ink-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--ink)] hover:bg-[var(--line)] transition-[color,background-color,opacity]"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <Link
            href="/notificaciones"
            onClick={() => setOpen(false)}
            className="block text-center text-[11.5px] font-medium text-[var(--accent)] py-2.5 border-t border-[var(--line)] hover:bg-[var(--chip)] transition-colors"
          >
            Ver todas las notificaciones
          </Link>
        </div>,
        document.body,
      )}
    </div>
  )
}

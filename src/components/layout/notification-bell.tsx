"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Bell, Lock, Clock, BookOpen, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"

type Note = {
  id:    string
  icon:  React.ComponentType<{ size?: number | string }>
  text:  string
  sub?:  string
  href:  string
  tone:  "loss" | "be" | "accent"
}

/**
 * Notification center (Fase 5 · E2).
 * Aggregates actionable signals (locked accounts, overdue/pending reviews) into
 * a bell + dropdown. Anchored in the Sidebar (desktop/tablet footer) and the
 * mobile header — there is no global desktop top-bar, so the sidebar is the home.
 */
export function NotificationBell({ placement = "up", compact = false }: { placement?: "up" | "down"; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Global component (sidebar): cache aggressively so navigating pages reuses
  // the app-wide React Query cache instead of refetching on every route change.
  const opts = { staleTime: 60_000, refetchOnWindowFocus: false }
  const { data: accounts = [] } = trpc.accounts.list.useQuery(undefined, opts)
  const { data: stats }         = trpc.learningResources.stats.useQuery(undefined, opts)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const lockedAccounts = accounts.filter((a) => a.locked)
  const urgent = stats?.urgentReviews ?? []
  const pending = stats?.pendingReviewsCount ?? 0

  const notes: Note[] = [
    ...lockedAccounts.map((a) => ({
      id: `lock-${a.id}`,
      icon: Lock,
      text: `${a.name} bloqueada`,
      sub: a.lockReason || "Límite alcanzado",
      href: "/cuentas",
      tone: "loss" as const,
    })),
    ...(urgent.length > 0 ? [{
      id: "urgent-reviews",
      icon: Clock,
      text: `${urgent.length} review${urgent.length !== 1 ? "s" : ""} vencida${urgent.length !== 1 ? "s" : ""}`,
      sub: "Recursos que necesitan repaso ya",
      href: "/aprendizaje",
      tone: "be" as const,
    }] : []),
    ...(pending > 0 ? [{
      id: "pending-reviews",
      icon: BookOpen,
      text: `${pending} recurso${pending !== 1 ? "s" : ""} por repasar`,
      href: "/aprendizaje",
      tone: "accent" as const,
    }] : []),
  ]

  const count = notes.length
  const toneColor = (t: Note["tone"]) => t === "loss" ? "var(--loss)" : t === "be" ? "var(--be)" : "var(--accent)"

  return (
    <div ref={ref} className="relative">
      <button
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

      {open && (
        <div
          className="absolute z-[60] w-[280px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden scale-pop"
          style={{
            boxShadow: "var(--shadow-lg)",
            right: 0,
            ...(placement === "up" ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
          }}
        >
          <div className="flex items-center justify-between px-3.5 h-10 border-b border-[var(--line)]">
            <p className="text-[12px] font-semibold text-[var(--ink)]">Notificaciones</p>
            {count > 0 && <span className="text-[10px] text-[var(--ink-3)]">{count} pendiente{count !== 1 ? "s" : ""}</span>}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <Check size={22} className="text-[var(--win)]" />
              <p className="text-[12px] text-[var(--ink-3)]">Todo al día. Sin alertas.</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto py-1">
              {notes.map((n) => {
                const Icon = n.icon
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-[var(--chip)] transition-colors"
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: toneColor(n.tone) }}><Icon size={15} /></span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium text-[var(--ink)] leading-snug">{n.text}</span>
                      {n.sub && <span className="block text-[10.5px] text-[var(--ink-3)] truncate">{n.sub}</span>}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { Archive, Check } from "lucide-react"
import { TYPE_STYLE } from "@/components/notifications/toast"
import { priorityColor, type AppNotification } from "@/lib/notifications"
import type { NotifType } from "@/lib/messages/types"

/** Short, locale-aware timestamp: time today, weekday this week, else date. */
export function formatNotifTime(createdAt: string | Date, now = new Date()): string {
  const d = new Date(createdAt)
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
  }
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  if (d >= weekAgo) return d.toLocaleDateString("es", { weekday: "short" })
  return d.toLocaleDateString("es", { day: "numeric", month: "short" })
}

export interface NotificationItemProps {
  n: AppNotification
  onMarkRead: (id: string) => void
  onArchive:  (id: string) => void
  onNavigate?: () => void
  /** Mobile: drag left → Archivar, drag right → Leído. */
  swipeable?: boolean
}

export function NotificationItem({ n, onMarkRead, onArchive, onNavigate, swipeable = false }: NotificationItemProps) {
  const accent = priorityColor(n.priority)
  const { color: typeColor, Icon } = TYPE_STYLE[n.type as NotifType] ?? TYPE_STYLE.INFO
  const unread = !n.readAt

  function handleClick() {
    if (unread) onMarkRead(n.id)
    if (n.href) { onNavigate?.(); window.location.assign(n.href) }
  }

  const content = (
    <>
      {unread && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: accent }} />}
      <span
        className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: `color-mix(in srgb, ${typeColor} 16%, transparent)`, color: typeColor }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[12.5px] font-semibold leading-snug text-[var(--ink)]">
            {n.title}
            <span className="ml-1.5 align-middle text-[9px] font-bold" style={{ color: accent }}>{n.priority}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--ink-3)]">{formatNotifTime(n.createdAt)}</span>
        </div>
        {n.body && <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--ink-3)] line-clamp-2">{n.body}</span>}
      </div>
      {unread && <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: "var(--accent)" }} />}
    </>
  )

  const fgStyle: React.CSSProperties = {
    background: unread ? `color-mix(in srgb, ${accent} 6%, transparent)` : "var(--panel)",
    opacity: unread ? 1 : 0.62,
  }

  if (swipeable) {
    return (
      <div className="relative overflow-hidden">
        {/* Action backgrounds revealed under the row */}
        <div className="absolute inset-y-0 left-0 flex items-center bg-[var(--accent)] px-4 text-[11px] font-semibold text-white"><Check size={13} className="mr-1" /> Leído</div>
        <div className="absolute inset-y-0 right-0 flex items-center bg-[var(--loss)] px-4 text-[11px] font-semibold text-white">Archivar <Archive size={13} className="ml-1" /></div>
        <motion.div
          drag="x"
          dragSnapToOrigin
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.55}
          onDragEnd={(_, info) => {
            if (info.offset.x < -90) onArchive(n.id)
            else if (info.offset.x > 90 && unread) onMarkRead(n.id)
          }}
          onClick={handleClick}
          className="relative flex items-start gap-2.5 px-4 py-2.5"
          style={fgStyle}
        >
          {content}
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="group relative flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--chip)] cursor-pointer"
      style={fgStyle}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick() }}
    >
      {content}
      <button
        onClick={(e) => { e.stopPropagation(); onArchive(n.id) }}
        aria-label="Archivar notificación"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-[var(--ink-3)] opacity-0 transition-[color,opacity] hover:bg-[var(--line)] hover:text-[var(--ink)] group-hover:opacity-100"
      >
        <Archive size={12} />
      </button>
    </div>
  )
}

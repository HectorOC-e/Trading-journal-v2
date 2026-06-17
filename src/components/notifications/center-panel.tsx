"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { CheckCheck, BellOff } from "lucide-react"
import { useNotifications, groupByTime } from "@/lib/notifications"
import { NotificationItem } from "@/components/notifications/notification-item"

/** Bell dropdown content: filter chips, time-grouped list, footer to full center. */
export function CenterPanel({ onClose, swipeable = false }: { onClose: () => void; swipeable?: boolean }) {
  const { items, count, markRead, markAllRead, archive } = useNotifications()
  const [filter, setFilter] = useState<"all" | "unread" | string>("all")

  const categories = useMemo<string[]>(
    () => Array.from(new Set(items.map((n) => n.category as string))),
    [items],
  )

  const filtered = useMemo(() => {
    if (filter === "all") return items
    if (filter === "unread") return items.filter((n) => !n.readAt)
    return items.filter((n) => n.category === filter)
  }, [items, filter])

  const groups = groupByTime(filtered)

  const chip = (key: string, label: string) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] transition-colors ${
        filter === key ? "bg-[var(--ink)] text-[var(--panel)]" : "border border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex max-h-[min(560px,80vh)] flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[var(--ink)]">Notificaciones</span>
          {count > 0 && (
            <span className="rounded-full bg-[var(--loss)] px-[7px] py-px text-[10px] font-bold text-white">{count}</span>
          )}
        </div>
        {count > 0 && (
          <button onClick={() => markAllRead()} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--accent)]">
            <CheckCheck size={13} /> Marcar leídas
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--line)] px-4 py-2.5">
        {chip("all", "Todas")}
        {chip("unread", "No leídas")}
        {categories.map((c) => chip(c, c))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellOff size={22} className="text-[var(--ink-3)]" />
            <p className="text-[12px] text-[var(--ink-3)]">Todo al día. Sin notificaciones.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.bucket}>
              <div className="px-4 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{g.bucket}</div>
              {g.items.map((n) => (
                <NotificationItem key={n.id} n={n} onMarkRead={markRead} onArchive={archive} onNavigate={onClose} swipeable={swipeable} />
              ))}
            </div>
          ))
        )}
      </div>

      <Link
        href="/notificaciones"
        onClick={onClose}
        className="border-t border-[var(--line)] py-3 text-center text-[12px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--chip)]"
      >
        Ver todas en el centro →
      </Link>
    </div>
  )
}

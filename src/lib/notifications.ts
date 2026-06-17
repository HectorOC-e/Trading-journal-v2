"use client"

// Notifications client hook — backed by the persisted `notifications` tRPC router
// (Epic 1). Replaces the old derived list (which leaked every active Rule as a
// notification). The bell, panel, page and sidebar badges all read from here.

import { useMemo } from "react"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

export type AppNotification = RouterOutputs["notifications"]["list"]["items"][number]
export type NotifCategory = AppNotification["category"]

/** Priority → accent color (drives the left bar / icon tint in the center). */
export function priorityColor(priority: string): string {
  switch (priority) {
    case "P0": return "var(--loss)"
    case "P1": return "#f59e0b"
    case "P2": return "var(--accent)"
    default:   return "var(--ink-3)"
  }
}

export type TimeBucket = "Hoy" | "Esta semana" | "Antes"

export function timeBucket(createdAt: string | Date, now = new Date()): TimeBucket {
  const d = new Date(createdAt)
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return "Hoy"
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  return d >= weekAgo ? "Esta semana" : "Antes"
}

/** Group items into ordered time buckets, preserving input order within a bucket. */
export function groupByTime(items: AppNotification[]): { bucket: TimeBucket; items: AppNotification[] }[] {
  const order: TimeBucket[] = ["Hoy", "Esta semana", "Antes"]
  const map = new Map<TimeBucket, AppNotification[]>()
  for (const n of items) {
    const b = timeBucket(n.createdAt)
    const arr = map.get(b) ?? []; arr.push(n); map.set(b, arr)
  }
  return order.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)! }))
}

export function useNotifications() {
  const utils = trpc.useUtils()
  const opts  = { staleTime: 30_000, refetchOnWindowFocus: false }

  const { data: list }  = trpc.notifications.list.useQuery({ limit: 20 }, opts)
  const { data: count = 0 } = trpc.notifications.unreadCount.useQuery(undefined, opts)

  const invalidate = () => {
    void utils.notifications.list.invalidate()
    void utils.notifications.unreadCount.invalidate()
  }
  const markRead    = trpc.notifications.markRead.useMutation({ onSuccess: invalidate })
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: invalidate })
  const archive     = trpc.notifications.archive.useMutation({ onSuccess: invalidate })

  const items = useMemo(() => list?.items ?? [], [list])

  const unreadByCategory = useMemo(() => {
    const m: Record<string, number> = {}
    for (const n of items) if (!n.readAt) m[n.category] = (m[n.category] ?? 0) + 1
    return m
  }, [items])

  return {
    items,
    count,
    unreadByCategory,
    markRead:    (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    archive:     (id: string) => archive.mutate(id),
  }
}

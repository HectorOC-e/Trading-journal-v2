"use client"

import { useState, useMemo } from "react"
import { CheckCheck, BellOff, Search } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { trpc } from "@/lib/trpc/client"
import { groupByTime, type AppNotification } from "@/lib/notifications"
import { NotificationItem } from "@/components/notifications/notification-item"

const CATEGORIES = ["Cuenta", "Reglas", "Reviews", "Aprendizaje", "Trading", "Sistema"] as const

export default function NotificacionesPage() {
  const utils = trpc.useUtils()
  const [category, setCategory] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(30)

  const query = trpc.notifications.list.useQuery(
    { limit, unreadOnly, includeArchived, ...(category ? { category: category as typeof CATEGORIES[number] } : {}) },
    { staleTime: 30_000 },
  )
  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery(undefined, { staleTime: 30_000 })

  const invalidate = () => { void utils.notifications.list.invalidate(); void utils.notifications.unreadCount.invalidate() }
  const markRead    = trpc.notifications.markRead.useMutation({ onSuccess: invalidate })
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: invalidate })
  const archive     = trpc.notifications.archive.useMutation({ onSuccess: invalidate })

  const items = useMemo<AppNotification[]>(() => (query.data?.items ?? []) as AppNotification[], [query.data])
  const hasMore = !!query.data?.nextCursor
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
  }, [items, search])
  const groups = groupByTime(visible)

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] transition-colors ${
        active ? "bg-[var(--ink)] text-[var(--panel)]" : "border border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  )

  return (
    <main aria-label="Notificaciones">
      <TopBar
        title="Notificaciones"
        subtitle={unread > 0 ? `${unread} sin leer` : "Todo al día"}
        actions={unread > 0 ? [{ label: "Marcar leídas", icon: <CheckCheck size={14} />, variant: "ghost" as const, onClick: () => markAllRead.mutate() }] : []}
      />

      <div className="mb-4 flex max-w-[760px] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3">
          <Search size={14} className="text-[var(--ink-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notificaciones…"
            className="h-9 flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {chip(!category && !unreadOnly && !includeArchived, "Todas", () => { setCategory(null); setUnreadOnly(false); setIncludeArchived(false) })}
          {chip(unreadOnly, "No leídas", () => { setUnreadOnly((v) => !v) })}
          {CATEGORIES.map((c) => chip(category === c, c, () => setCategory((cur) => (cur === c ? null : c))))}
          {chip(includeArchived, "Incluir archivadas", () => setIncludeArchived((v) => !v))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--win-soft)]">
            <BellOff size={22} className="text-[var(--win)]" />
          </div>
          <p className="text-[14px] font-semibold text-[var(--ink)]">{query.isLoading ? "Cargando…" : "Sin notificaciones"}</p>
          <p className="max-w-[320px] text-[12px] text-[var(--ink-3)]">
            Aquí verás cuentas bloqueadas, reglas disparadas, reviews vencidas, importaciones y avisos del sistema.
          </p>
        </div>
      ) : (
        <div className="max-w-[760px] overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]">
          {groups.map((g) => (
            <div key={g.bucket}>
              <div className="border-b border-[var(--line)] bg-[var(--panel-2)] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{g.bucket}</div>
              {g.items.map((n) => (
                <NotificationItem key={n.id} n={n} onMarkRead={markRead.mutate} onArchive={archive.mutate} />
              ))}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex max-w-[760px] justify-center">
          <button
            onClick={() => setLimit((l) => l + 30)}
            disabled={query.isFetching}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] px-4 py-2 text-[12px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--chip)] disabled:opacity-50"
          >
            {query.isFetching ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </main>
  )
}

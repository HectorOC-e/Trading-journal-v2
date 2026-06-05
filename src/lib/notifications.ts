"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { trpc } from "@/lib/trpc/client"

// ─────────────────────────────────────────────────────────────────────────────
// Notifications (Fase 6)
// Derived from existing data (no dedicated table): locked accounts, overdue /
// pending reviews, active trading rules. Dismissal state is shared app-wide via a
// zustand store backed by localStorage, so the bell and /notificaciones stay in sync.
// Extensible: add new builders in buildNotifications() as event sources appear
// (e.g. an email/event log for "review sent to email").
// ─────────────────────────────────────────────────────────────────────────────

export type NotifTone = "danger" | "warning" | "info" | "reminder"
export type NotifCategory = "Cuenta" | "Reviews" | "Aprendizaje" | "Reglas"

export interface AppNotification {
  id:       string
  category: NotifCategory
  title:    string
  body?:    string
  href:     string
  tone:     NotifTone
}

const LS_KEY = "tj-dismissed-notifs"

function readDismissed(): string[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[] } catch { return [] }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

interface DismissedState {
  dismissed: string[]
  dismiss:   (id: string) => void
  dismissMany: (ids: string[]) => void
  restore:   (id: string) => void
}

export const useDismissedNotifs = create<DismissedState>((set) => ({
  dismissed: readDismissed(),
  dismiss: (id) => set((s) => {
    const next = s.dismissed.includes(id) ? s.dismissed : [...s.dismissed, id]
    writeDismissed(next); return { dismissed: next }
  }),
  dismissMany: (ids) => set((s) => {
    const next = Array.from(new Set([...s.dismissed, ...ids]))
    writeDismissed(next); return { dismissed: next }
  }),
  restore: (id) => set((s) => {
    const next = s.dismissed.filter((d) => d !== id)
    writeDismissed(next); return { dismissed: next }
  }),
}))

const TONE_RANK: Record<NotifTone, number> = { danger: 0, warning: 1, info: 2, reminder: 3 }

/**
 * Aggregates notifications + dismissal state. Use in any client component.
 * Queries are cached so navigating pages does not refetch.
 */
export function useNotifications() {
  const opts = { staleTime: 60_000, refetchOnWindowFocus: false }
  const { data: accounts = [] } = trpc.accounts.list.useQuery(undefined, opts)
  const { data: stats }         = trpc.learningResources.stats.useQuery(undefined, opts)
  const { data: rules = [] }    = trpc.rules.list.useQuery(undefined, opts)

  const { dismissed, dismiss, dismissMany, restore } = useDismissedNotifs()

  const all = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = []

    // Cuentas bloqueadas
    for (const a of accounts) {
      if (a.locked) {
        list.push({
          id: `lock-${a.id}`, category: "Cuenta", tone: "danger",
          title: `${a.name} bloqueada`,
          body: a.lockReason || "Límite de riesgo alcanzado. Desbloquéala en Cuentas.",
          href: "/cuentas",
        })
      }
    }

    // Reviews vencidas
    const urgent = stats?.urgentReviews ?? []
    if (urgent.length > 0) {
      list.push({
        id: `reviews-urgent-${urgent.length}`, category: "Aprendizaje", tone: "warning",
        title: `${urgent.length} review${urgent.length !== 1 ? "s" : ""} vencida${urgent.length !== 1 ? "s" : ""}`,
        body: "Tienes recursos cuyo repaso ya venció. Repásalos para no perder retención.",
        href: "/aprendizaje",
      })
    }

    // Reviews pendientes
    const pending = stats?.pendingReviewsCount ?? 0
    if (pending > 0) {
      list.push({
        id: `reviews-pending-${pending}`, category: "Aprendizaje", tone: "info",
        title: `${pending} recurso${pending !== 1 ? "s" : ""} por repasar`,
        body: "Recursos marcados para review esta semana.",
        href: "/aprendizaje",
      })
    }

    // Reglas activas (recordatorios de disciplina)
    for (const r of rules) {
      if (r.enabled) {
        list.push({
          id: `rule-${r.id}`, category: "Reglas", tone: "reminder",
          title: r.name,
          body: r.description || `Regla activa · ${r.severity}`,
          href: "/reglas",
        })
      }
    }

    return list.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
  }, [accounts, stats, rules])

  const active = useMemo(() => all.filter((n) => !dismissed.includes(n.id)), [all, dismissed])

  return {
    all,
    active,
    count: active.length,
    dismiss,
    clearAll: () => dismissMany(active.map((n) => n.id)),
    restore,
  }
}

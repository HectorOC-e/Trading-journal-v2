"use client"

import { useState } from "react"
import { CheckCircle2, Circle, ChevronDown, X, Rocket } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

type ChecklistItem = {
  id:       string
  label:    string
  done:     boolean
  href?:    string
}

function ItemRow({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--panel-2)] transition-colors">
      {item.done
        ? <CheckCircle2 size={15} className="text-[var(--win)] shrink-0" />
        : <Circle       size={15} className="text-[var(--ink-3)] shrink-0" />
      }
      <span className={`text-[12px] flex-1 ${item.done ? "line-through text-[var(--ink-3)]" : "text-[var(--ink-2)]"}`}>
        {item.label}
      </span>
      {!item.done && item.href && (
        <a
          href={item.href}
          className="text-[10px] font-semibold text-[var(--accent)] hover:underline shrink-0"
        >
          Ir →
        </a>
      )}
    </div>
  )
}

export function OnboardingChecklist() {
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("tj-onboarding-dismissed") === "1" } catch { return false }
  })

  const { data: accounts  = [] } = trpc.accounts.list.useQuery(undefined,          { staleTime: 60_000 })
  const { data: setups    = [] } = trpc.setups.list.useQuery(undefined,             { staleTime: 60_000 })
  const { data: tradePg        } = trpc.trades.list.useQuery({ limit: 1 },          { staleTime: 60_000 })
  const { data: profile        } = trpc.profile.get.useQuery(undefined,             { staleTime: 60_000 })

  if (dismissed) return null

  const tradeCount = tradePg?.items.length ?? 0

  const items: ChecklistItem[] = [
    {
      id:    "account",
      label: "Crea tu primera cuenta de trading",
      done:  accounts.length > 0,
      href:  "/cuentas",
    },
    {
      id:    "setup",
      label: "Añade un setup a tu Playbook",
      done:  setups.length > 0,
      href:  "/playbook",
    },
    {
      id:    "trade",
      label: "Registra tu primer trade",
      done:  tradeCount > 0,
      href:  "/trades",
    },
    {
      id:    "profile",
      label: "Completa tu perfil",
      done:  !!(profile?.name && profile.name.length > 0),
      href:  "/perfil",
    },
  ]

  const doneCount = items.filter(i => i.done).length
  const allDone   = doneCount === items.length

  if (allDone) {
    // Auto-dismiss when all steps are complete
    try { localStorage.setItem("tj-onboarding-dismissed", "1") } catch { /* noop */ }
    return null
  }

  const pct = Math.round((doneCount / items.length) * 100)

  function dismiss() {
    try { localStorage.setItem("tj-onboarding-dismissed", "1") } catch { /* noop */ }
    setDismissed(true)
  }

  return (
    <div
      className="rounded-[var(--radius)] border border-[var(--accent-soft)] bg-[var(--panel)] overflow-hidden"
      style={{ borderLeft: "3px solid var(--accent)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
          <Rocket size={14} className="text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">Primeros pasos</p>
          <p className="text-[11px] text-[var(--ink-3)]">{doneCount}/{items.length} completados</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Progress ring */}
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="11" fill="none" stroke="var(--line)" strokeWidth="2.5" />
            <circle
              cx="14" cy="14" r="11" fill="none"
              stroke="var(--accent)" strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 11}`}
              strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 14 14)"
            />
            <text x="14" y="18" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--ink)">{pct}%</text>
          </svg>
          <ChevronDown
            size={14}
            className={`text-[var(--ink-3)] transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
          <button
            onClick={(e) => { e.stopPropagation(); dismiss() }}
            className="text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            aria-label="Cerrar guía de inicio"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="px-3 pb-3 border-t border-[var(--line)]">
          <div className="pt-2">
            {items.map(item => <ItemRow key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}

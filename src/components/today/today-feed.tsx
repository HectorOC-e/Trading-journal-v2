"use client"

import { useRouter } from "next/navigation"
import {
  ShieldAlert, AlertTriangle, ShieldCheck, Lightbulb, Target, TrendingUp, Bell, Gauge, ArrowRight, Sun,
} from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { RiskBudgetMeter } from "@/components/risk/risk-budget-meter"
import type { SignalKind, SignalSeverity } from "@/domains/cognitive/today/feed"

const KIND_ICON: Record<SignalKind, React.ComponentType<{ size?: number | string }>> = {
  intervention: ShieldAlert,
  risk: Gauge,
  anomaly: AlertTriangle,
  suggestion: ShieldCheck,
  insight: Lightbulb,
  commitment: Target,
  reinforcement: TrendingUp,
  notification: Bell,
}

function severityColor(s: SignalSeverity): { color: string; bg: string } {
  switch (s) {
    case "critical": return { color: "var(--loss)", bg: "var(--loss-soft)" }
    case "warning": return { color: "var(--intervene)", bg: "var(--intervene-soft)" }
    case "positive": return { color: "var(--win)", bg: "var(--win-soft)" }
    default: return { color: "var(--ink-2)", bg: "var(--chip)" }
  }
}

/** HOY feed (S13, E11) — the single prioritized list that answers "qué hago hoy".
 *  Critical signals on top (never sink), calm reinforcement at the bottom. */
export function TodayFeed() {
  const router = useRouter()
  const { data, isLoading } = trpc.today.feed.useQuery(undefined, { staleTime: 30_000 })

  if (isLoading) {
    return <div className="h-32 rounded-[var(--radius)] animate-pulse mb-6" style={{ background: "var(--panel-2)" }} />
  }
  if (!data) return null

  const hasBudget = data.budget?.hasLimit
  if (data.feed.length === 0 && !hasBudget) return null

  return (
    <section aria-label="Hoy" className="mb-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sun size={15} style={{ color: "var(--coach)" }} />
        <h2 className="text-[14px] font-bold text-[var(--ink)]">Hoy</h2>
        <span className="text-[11px] text-[var(--ink-3)]">— qué mover para mejorar y no romperte</span>
      </div>

      {hasBudget && <RiskBudgetMeter budget={data.budget!} />}

      {data.feed.length === 0 ? (
        <p className="text-[12px] text-[var(--ink-3)] rounded-[var(--radius)] border border-dashed border-[var(--line)] py-6 text-center">
          Todo en calma. Ninguna señal exige tu atención ahora.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.feed.map((item) => {
            const Icon = KIND_ICON[item.kind]
            const sc = severityColor(item.severity)
            return (
              <li key={item.id}
                className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-3 hover:border-[var(--ink-3)] transition-colors">
                <span className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] shrink-0 mt-0.5" style={{ background: sc.bg, color: sc.color }}>
                  <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ink)] leading-snug">{item.title}</p>
                  {item.body && <p className="text-[11.5px] text-[var(--ink-3)] leading-snug mt-0.5">{item.body}</p>}
                </div>
                {item.cta?.href && (
                  <button onClick={() => router.push(item.cta!.href!)}
                    className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--accent)] hover:underline self-center">
                    {item.cta.label} <ArrowRight size={12} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

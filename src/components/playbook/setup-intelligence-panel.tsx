"use client"

import { Activity, GitCompareArrows, TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { EdgeEvolutionChart } from "./edge-evolution-chart"
import type { RouterOutputs } from "@/server/trpc/root"

type Drift = NonNullable<RouterOutputs["playbook"]["setup"]>["drift"]

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })

const DECAY_META: Record<string, { label: string; color: string; bg: string }> = {
  decaying: { label: "Edge en deterioro", color: "var(--loss)", bg: "var(--loss-soft)" },
  improving: { label: "Edge mejorando", color: "var(--win)", bg: "var(--win-soft)" },
  stable: { label: "Edge estable", color: "var(--ink-2)", bg: "var(--chip)" },
  insufficient: { label: "Muestra insuficiente", color: "var(--ink-3)", bg: "var(--chip)" },
}

function driftValue(dim: NonNullable<Drift["topDrift"]>): string {
  const v = (x: string | number) => (typeof x === "number" ? (dim.dimension === "winRate" ? `${fmt(x)}%` : dim.dimension === "avgR" ? `${fmt(x)}R` : String(x)) : x)
  const name = dim.dimension === "winRate" ? "win rate" : dim.dimension === "avgR" ? "avg R" : "dirección"
  return `${name}: definido ${v(dim.defined)} vs operado ${v(dim.actual)}`
}

/** MEJORAR surface (S10) — per-setup playbook intelligence: edge decay (with
 *  significance), definition-vs-execution drift, the edge evolution curve, and
 *  the before/after of the last redefinition. Read-only; deterministic (P2). */
export function SetupIntelligencePanel({ setupId }: { setupId: string }) {
  const { data, isLoading } = trpc.playbook.setup.useQuery({ setupId }, { staleTime: 30_000 })

  if (isLoading) return <div className="h-28 rounded-[var(--radius-sm)] animate-pulse" style={{ background: "var(--panel-2)" }} />
  if (!data || !data.hasData) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2"><TrendingUp size={11} className="text-[var(--ink-3)]" /><p className="text-eyebrow">Inteligencia del playbook</p></div>
        <p className="text-[11px] text-[var(--ink-3)] bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-3">
          Registra trades cerrados con este setup para analizar su edge, drift y evolución.
        </p>
      </div>
    )
  }

  const decay = DECAY_META[data.decay.status] ?? DECAY_META.insufficient
  const drift = data.drift
  const redef = data.redefinition

  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><TrendingUp size={11} className="text-[var(--accent)]" /><p className="text-eyebrow">Inteligencia del playbook</p></div>
      <div className="flex flex-col gap-3">

        {/* Edge decay verdict */}
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2.5" style={{ background: decay.bg }}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: decay.color }}>
            <Activity size={13} /> {decay.label}
          </span>
          {data.decay.recentAvgR != null && data.decay.baselineAvgR != null && (
            <span className="num text-[11px]" style={{ color: decay.color }}>
              {fmt(data.decay.recentAvgR)}R vs {fmt(data.decay.baselineAvgR)}R base
            </span>
          )}
        </div>

        {/* Drift */}
        {drift.status === "drifting" && drift.topDrift && (
          <div className="flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2.5" style={{ background: "var(--be-soft)" }}>
            <GitCompareArrows size={13} className="mt-0.5 shrink-0" style={{ color: "var(--be)" }} />
            <p className="text-[11.5px] leading-snug" style={{ color: "var(--be)" }}>
              Drift en {driftValue(drift.topDrift)}. Operas distinto a como lo definiste.
            </p>
          </div>
        )}

        {/* Evolution curve */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)] mb-1">Evolución del edge (avg R)</p>
          <EdgeEvolutionChart windows={data.evolution} />
        </div>

        {/* Redefinition before/after */}
        {redef && redef.winner && (
          <p className="text-[11px] text-[var(--ink-3)] num">
            Tras la última redefinición: {redef.winner === "actual" ? "mejor" : "peor"} edge ({fmt(redef.a.avgR)}R vs {fmt(redef.b.avgR)}R){redef.significant ? " · significativo" : ""}.
          </p>
        )}
      </div>
    </div>
  )
}

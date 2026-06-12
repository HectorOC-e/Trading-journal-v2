"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { FilterBar } from "@/components/ui/filter-bar"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { IntelligencePanel } from "@/components/ui/intelligence-panel"
import { trpc } from "@/lib/trpc/client"
import { useDashboardStats, type Period } from "../dashboard/hooks/use-dashboard-stats"
import { TabDisciplina } from "../dashboard/tabs/tab-disciplina"

// Pillar route (Fase 3): Psicología was buried as the dashboard "Disciplina" tab.
// Now a first-class destination in the nav.
const PERIODS = [
  { value: "7d", label: "7D" }, { value: "1M", label: "1M" }, { value: "3M", label: "3M" },
  { value: "6M", label: "6M" }, { value: "1Y", label: "1A" }, { value: "ALL", label: "Todo" },
]

const EMOTION_LABELS: Record<string, string> = {
  calm: "Tranquilo", anxious: "Ansioso", excited: "Eufórico",
  fearful: "Temeroso", overconfident: "Sobreconfiado", "sin registro": "Sin registro",
}

export default function PsicologiaPage() {
  const [period, setPeriod] = useState<Period>("3M")
  const { stats, isLoading, isError } = useDashboardStats(period)
  const { data: psychInsights = [], isLoading: psychLoading } =
    trpc.analytics.psychologyInsights.useQuery({ period: period as never }, { staleTime: 30_000 })
  const { data: bundle } = trpc.analytics.overview.useQuery({ period: period as never }, { staleTime: 30_000 })

  return (
    <main aria-label="Psicología">
      <TopBar
        title="Psicología"
        subtitle="Análisis conductual · patrones, sesgos y disciplina"
      />
      <FilterBar
        options={PERIODS}
        value={period}
        onChange={(v) => setPeriod(v as Period)}
        className="mb-5"
        ariaLabel="Periodo"
      />

      {/* Psychology Intelligence layer — patterns, biases, habits + AI narrative */}
      <div className="mb-6">
        <IntelligencePanel
          insights={psychInsights}
          isLoading={psychLoading}
          endpoint="/api/psychology-ai"
          period={period}
          title="Inteligencia psicológica"
          subtitle="Patrones conductuales · sesgos · hábitos"
          emptyHint="Registra emociones y flags en tus trades para detectar patrones psicológicos."
        />
      </div>

      {/* Emociones, mood y energía — correlación estado→resultado */}
      {bundle && bundle.psychology.byEmotion.length > 0 && (
        <section aria-label="Emociones y sesiones" className="mb-6 rounded-[var(--radius)] bg-[var(--panel)] border border-[var(--line)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-3">Emociones &amp; sesiones</p>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Mood / energía */}
            <div className="flex gap-4">
              <div>
                <p className="num text-[20px] font-bold text-[var(--ink)]">{bundle.psychology.avgPreMood ?? "—"}<span className="text-[12px] text-[var(--ink-3)]">/5</span></p>
                <p className="text-[10px] text-[var(--ink-3)] mt-1">Mood pre · {bundle.psychology.sessions} sesiones</p>
              </div>
              <div>
                <p className="num text-[20px] font-bold text-[var(--ink)]">{bundle.psychology.avgEnergy ?? "—"}<span className="text-[12px] text-[var(--ink-3)]">/5</span></p>
                <p className="text-[10px] text-[var(--ink-3)] mt-1">Energía media</p>
              </div>
              <div>
                <p className="num text-[20px] font-bold" style={{ color: "var(--loss)" }}>{bundle.psychology.fomoCount + bundle.psychology.revengeCount}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-1">FOMO {bundle.psychology.fomoCount} · Revenge {bundle.psychology.revengeCount}</p>
              </div>
            </div>
            {/* Por emoción (correlación estado→P&L) */}
            <div className="md:col-span-2">
              <p className="text-[10px] font-semibold text-[var(--ink-3)] mb-1.5">P&amp;L y win rate según el estado emocional antes de operar</p>
              <div className="flex flex-col">
                {bundle.psychology.byEmotion.slice(0, 6).map((e) => (
                  <div key={e.emotion} className="flex items-center justify-between py-1 border-b border-[var(--line)] last:border-0 text-sm">
                    <span className="text-[var(--ink-2)] w-32">{EMOTION_LABELS[e.emotion] ?? e.emotion} <span className="text-[var(--ink-3)] text-[11px]">· {e.trades}</span></span>
                    <span className="text-[var(--ink-3)] text-[12px] num">{e.winRate}% WR</span>
                    <span className="num font-semibold" style={{ color: e.avgPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{e.avgPnl >= 0 ? "+" : ""}{e.avgPnl} avg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {isLoading ? (
        <SkeletonKpiStrip />
      ) : isError || !stats ? (
        <p className="text-sm text-[var(--loss)] py-8">No se pudieron cargar los datos. Recarga la página.</p>
      ) : (
        <TabDisciplina kpis={stats.kpis} discipline={stats.discipline} />
      )}
    </main>
  )
}

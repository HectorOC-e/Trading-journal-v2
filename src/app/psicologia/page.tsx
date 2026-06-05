"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { FilterBar } from "@/components/ui/filter-bar"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { useDashboardStats, type Period } from "../dashboard/hooks/use-dashboard-stats"
import { TabDisciplina } from "../dashboard/tabs/tab-disciplina"

// Pillar route (Fase 3): Psicología was buried as the dashboard "Disciplina" tab.
// Now a first-class destination in the nav.
const PERIODS = [
  { value: "7d", label: "7D" }, { value: "1M", label: "1M" }, { value: "3M", label: "3M" },
  { value: "6M", label: "6M" }, { value: "1Y", label: "1A" }, { value: "ALL", label: "Todo" },
]

export default function PsicologiaPage() {
  const [period, setPeriod] = useState<Period>("3M")
  const { stats, isLoading, isError } = useDashboardStats(period)

  return (
    <main aria-label="Psicología">
      <TopBar
        title="Psicología"
        subtitle="Disciplina, emociones y control de impulsos en tu operativa"
      />
      <FilterBar
        options={PERIODS}
        value={period}
        onChange={(v) => setPeriod(v as Period)}
        className="mb-6"
        ariaLabel="Periodo"
      />

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

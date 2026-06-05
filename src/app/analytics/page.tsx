"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { FilterBar } from "@/components/ui/filter-bar"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { useDashboardStats, type Period } from "../dashboard/hooks/use-dashboard-stats"
import { TabPortfolio } from "../dashboard/tabs/tab-portfolio"
import { TabOperador } from "../dashboard/tabs/tab-operador"

// Pillar route (Fase 3): consolidates the analytical dashboard tabs
// (Portfolio + Operador) into a first-class "Analytics" destination.
const PERIODS = [
  { value: "7d", label: "7D" }, { value: "1M", label: "1M" }, { value: "3M", label: "3M" },
  { value: "6M", label: "6M" }, { value: "1Y", label: "1A" }, { value: "ALL", label: "Todo" },
]

type View = "portfolio" | "operador"
const VIEWS = [
  { value: "portfolio", label: "Portfolio" },
  { value: "operador",  label: "Operador" },
]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("3M")
  const [view, setView] = useState<View>("portfolio")
  const { stats, accounts, isLoading, isError } = useDashboardStats(period)

  return (
    <main aria-label="Analytics">
      <TopBar
        title="Analytics"
        subtitle="Rendimiento del portfolio y análisis del operador"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <FilterBar
          options={VIEWS}
          value={view}
          onChange={(v) => setView(v as View)}
          ariaLabel="Vista de analytics"
        />
        <FilterBar
          options={PERIODS}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          ariaLabel="Periodo"
        />
      </div>

      {isLoading ? (
        <SkeletonKpiStrip />
      ) : isError || !stats ? (
        <p className="text-sm text-[var(--loss)] py-8">No se pudieron cargar los datos. Recarga la página.</p>
      ) : view === "portfolio" ? (
        <TabPortfolio
          kpis={stats.kpis}
          pnlByDate={stats.pnlByDate}
          propFirmStatus={stats.propFirmStatus}
          accountStats={stats.accountStats}
          equityCurve={stats.equityCurve}
          discipline={stats.discipline}
          accounts={accounts}
          period={period}
          onPeriodChange={setPeriod}
        />
      ) : (
        <TabOperador
          kpis={stats.kpis}
          accountStats={stats.accountStats}
          equityCurve={stats.equityCurve}
          sessionStats={stats.sessionStats}
          pnlBySymbol={stats.pnlBySymbol}
          hourStats={stats.hourStats}
          recentTrades={stats.recentTrades}
          executionStats={stats.executionStats}
          accounts={accounts}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
    </main>
  )
}

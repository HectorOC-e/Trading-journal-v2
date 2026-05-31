"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { TopBar } from "@/components/layout/top-bar"
import { useDashboardStats } from "./hooks/use-dashboard-stats"

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL"
import { TabPortfolio }  from "./tabs/tab-portfolio"
import { TabOperador }   from "./tabs/tab-operador"
import { TabDisciplina } from "./tabs/tab-disciplina"
import { TabPlaybook }   from "./tabs/tab-playbook"

type Tab = "portfolio" | "operador" | "disciplina" | "playbook"

const TABS = [
  { value: "portfolio",  label: "Portfolio" },
  { value: "operador",   label: "Operador" },
  { value: "disciplina", label: "Disciplina" },
  { value: "playbook",   label: "Playbook" },
]

export default function DashboardPage() {
  const [tab, setTab]       = useState<Tab>("portfolio")
  const [period, setPeriod] = useState<Period>("3M")
  const { stats, accounts, isLoading, isError } = useDashboardStats(period)

  if (isLoading) {
    return (
      <div>
        <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
        <div className="flex items-center justify-center h-64 text-[var(--ink-3)] text-sm">Cargando…</div>
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div>
        <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-[var(--ink-3)] text-sm">No se pudo cargar el dashboard.</p>
          <button
            className="text-[12px] px-4 py-1.5 rounded border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
      <FilterBar options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} className="mb-6" />
      {tab === "portfolio" && (
        <TabPortfolio
          kpis={stats.kpis}
          pnlByDate={stats.pnlByDate}
          propFirmStatus={stats.propFirmStatus}
          accountStats={stats.accountStats}
          accounts={accounts}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
      {tab === "operador" && (
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
      {tab === "disciplina" && (
        <TabDisciplina
          kpis={stats.kpis}
          discipline={stats.discipline}
        />
      )}
      {tab === "playbook" && <TabPlaybook />}
    </div>
  )
}

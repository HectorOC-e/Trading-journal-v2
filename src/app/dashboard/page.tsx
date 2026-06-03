"use client"

import { useState, useEffect, useRef } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { TopBar } from "@/components/layout/top-bar"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { useDashboardStats, type Period } from "./hooks/use-dashboard-stats"
import { trpc } from "@/lib/trpc/client"
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

const VALID_PERIODS: Period[] = ["7d", "1M", "3M", "6M", "1Y", "ALL"]
const PERIOD_STORAGE_KEY = "tj-dashboard-period"

export default function DashboardPage() {
  const [tab, setTab]       = useState<Tab>("portfolio")
  const [period, setPeriod] = useState<Period>("3M")
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const tabDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { stats, accounts, isLoading, isError } = useDashboardStats(period)
  const { data: prefs } = trpc.preferences.get.useQuery()
  const updatePrefs = trpc.preferences.update.useMutation({
    onError: () => { /* silent */ },
  })

  // Load saved tab from preferences and period from localStorage once
  useEffect(() => {
    if (!prefs || prefsLoaded) return
    if (prefs.defaultTab && ["portfolio", "operador", "disciplina", "playbook"].includes(prefs.defaultTab)) {
      setTab(prefs.defaultTab as Tab)
    }
    try {
      const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY) as Period | null
      if (savedPeriod && VALID_PERIODS.includes(savedPeriod)) {
        setPeriod(savedPeriod)
      }
    } catch {
      // localStorage unavailable (e.g. private-browsing quota exceeded)
    }
    setPrefsLoaded(true)
  }, [prefs, prefsLoaded])

  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    if (tabDebounceRef.current) clearTimeout(tabDebounceRef.current)
    tabDebounceRef.current = setTimeout(() => {
      updatePrefs.mutate({ defaultTab: newTab })
    }, 500)
  }

  function handlePeriodChange(p: Period) {
    setPeriod(p)
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, p)
    } catch {
      // localStorage unavailable
    }
  }

  if (isLoading) {
    return (
      <main aria-label="Panel principal" aria-busy="true">
        <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
        <FilterBar options={TABS} value={tab} onChange={(v) => handleTabChange(v as Tab)} className="mb-6" ariaLabel="Secciones del dashboard" />
        <SkeletonKpiStrip />
        <div className="flex items-center justify-center h-40 text-[var(--ink-3)] text-sm" aria-live="polite">
          Cargando…
        </div>
      </main>
    )
  }

  if (isError || !stats) {
    return (
      <main aria-label="Panel principal">
        <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
        <div className="flex flex-col items-center justify-center h-64 gap-3" role="alert">
          <p className="text-[var(--ink-3)] text-sm">No se pudo cargar el dashboard.</p>
          <button
            className="text-[12px] px-4 py-1.5 rounded border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  return (
    <main aria-label="Panel principal">
      <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
      <FilterBar
        options={TABS}
        value={tab}
        onChange={(v) => handleTabChange(v as Tab)}
        className="mb-6"
        ariaLabel="Secciones del dashboard"
      />
      {tab === "portfolio" && (
        <TabPortfolio
          kpis={stats.kpis}
          pnlByDate={stats.pnlByDate}
          propFirmStatus={stats.propFirmStatus}
          accountStats={stats.accountStats}
          accounts={accounts}
          period={period}
          onPeriodChange={handlePeriodChange}
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
          onPeriodChange={handlePeriodChange}
        />
      )}
      {tab === "disciplina" && (
        <TabDisciplina
          kpis={stats.kpis}
          discipline={stats.discipline}
        />
      )}
      {tab === "playbook" && <TabPlaybook />}
    </main>
  )
}

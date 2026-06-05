"use client"

import { useState, useEffect, useRef } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { TopBar } from "@/components/layout/top-bar"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { useDashboardStats, type Period } from "./hooks/use-dashboard-stats"
import { trpc } from "@/lib/trpc/client"
import { TabPortfolio }  from "./tabs/tab-portfolio"
import { TabOperador }   from "./tabs/tab-operador"
import { TabDisciplina } from "./tabs/tab-disciplina"
import { TabPlaybook }   from "./tabs/tab-playbook"
import { FileDown } from "lucide-react"
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist"

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
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] py-16 px-6 text-center"
          role="alert"
        >
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--loss-soft)] flex items-center justify-center">
            <span className="text-[var(--loss)] text-[16px] font-bold">!</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink)]">No se pudo cargar el dashboard</p>
            <p className="text-[12px] text-[var(--ink-3)] mt-1">Verifica tu conexión e intenta de nuevo.</p>
          </div>
          <button
            className="h-8 px-4 rounded-[var(--radius-sm)] text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-h)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.97]"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  const heroNet = stats.kpis.netPnl ?? 0
  const heroPositive = heroNet >= 0
  const heroNetLabel = heroPositive
    ? `+$${heroNet.toLocaleString()}`
    : `-$${Math.abs(heroNet).toLocaleString()}`
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Buenos días"
    if (h < 19) return "Buenas tardes"
    return "Buenas noches"
  })()
  const todayLabel = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })

  return (
    <main aria-label="Panel principal">
      {/* Hero header (E3/E4) — greeting + Net P&L héroe */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--ink-3)] capitalize">{todayLabel}</p>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[var(--ink)] tracking-tight leading-tight">
            {greeting}
          </h1>
        </div>
        <div
          className="flex items-stretch gap-4 rounded-[var(--radius-lg)] border px-5 py-3.5"
          style={{
            background: heroPositive ? "var(--win-soft)" : "var(--loss-soft)",
            borderColor: heroPositive ? "var(--win)" : "var(--loss)",
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)]">Net P&L · periodo</p>
            <p className="num text-[26px] font-bold leading-tight" style={{ color: heroPositive ? "var(--win)" : "var(--loss)" }}>
              {heroNetLabel}
            </p>
          </div>
          <div className="w-px self-stretch" style={{ background: heroPositive ? "var(--win)" : "var(--loss)", opacity: 0.25 }} />
          <div className="flex flex-col justify-center gap-1">
            <p className="text-[11px] text-[var(--ink-2)]"><span className="num font-semibold text-[var(--ink)]">{Math.round(stats.kpis.winRate)}%</span> win rate</p>
            <p className="text-[11px] text-[var(--ink-2)]"><span className="num font-semibold text-[var(--ink)]">{stats.kpis.total}</span> trades</p>
          </div>
          <button
            onClick={() => window.open("/dashboard/export", "_blank")}
            className="self-center ml-1 flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] text-[var(--ink-2)] hover:text-[var(--ink)] text-[12px] font-medium transition-colors"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>
      <SegmentedTabs
        options={TABS}
        value={tab}
        onChange={(v) => handleTabChange(v as Tab)}
        ariaLabel="Secciones del dashboard"
        className="mb-6"
      />
      {tab === "portfolio" && (
        <div className="flex flex-col gap-4">
          <OnboardingChecklist />
          <TabPortfolio
            kpis={stats.kpis}
            pnlByDate={stats.pnlByDate}
            propFirmStatus={stats.propFirmStatus}
            accountStats={stats.accountStats}
            equityCurve={stats.equityCurve}
            discipline={stats.discipline}
            accounts={accounts}
            period={period}
            onPeriodChange={handlePeriodChange}
          />
        </div>
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

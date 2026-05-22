// Dashboard screen — spec: design-spec/dashboard.html
// 4 tabs: Portfolio · Operador · Disciplina · Playbook

"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { FilterBar } from "@/components/ui/filter-bar"
import { cn } from "@/lib/utils"
import { mockTrades, mockAccounts } from "@/mock-data"

type Tab = "portfolio" | "operador" | "disciplina" | "playbook"

const TABS = [
  { value: "portfolio",  label: "Portfolio" },
  { value: "operador",   label: "Operador" },
  { value: "disciplina", label: "Disciplina" },
  { value: "playbook",   label: "Playbook" },
]

const PORTFOLIO_KPIS = [
  { label: "Balance Total", value: "$103,640", sub: "todas las cuentas", trend: "up"      as const, mono: true },
  { label: "Net P&L mes",   value: "+$3,540",  sub: "+3.5%",             trend: "up"      as const, mono: true },
  { label: "Win Rate",      value: "65%",      sub: "23 trades",         trend: "up"      as const, mono: true },
  { label: "Mejor setup",   value: "OR",       sub: "64% WR · +1.8R",   trend: "neutral" as const, mono: false },
]

const OPERADOR_KPIS = [
  { label: "Equity",   value: "$103,640", sub: "FXify 100K · Ph2", trend: "up"      as const, mono: true },
  { label: "Net P&L",  value: "+$2,640",  sub: "esta semana",      trend: "up"      as const, mono: true },
  { label: "Trades",   value: "23",       sub: "este mes",         trend: "neutral" as const, mono: true },
  { label: "Avg R",    value: "+1.8R",    sub: "ganadores",        trend: "up"      as const, mono: true },
]

const DISCIPLINA_KPIS = [
  { label: "Score",       value: "78/100", sub: "esta semana",    trend: "up"   as const, mono: true },
  { label: "Violaciones", value: "7",      sub: "este mes",       trend: "down" as const, mono: true },
  { label: "Plan rate",   value: "82%",    sub: "trades en plan", trend: "up"   as const, mono: true },
  { label: "DO-NOT-TAKE", value: "3",      sub: "evitados",       trend: "neutral" as const, mono: true },
]

const PLAYBOOK_KPIS = [
  { label: "Setups activos", value: "8",   sub: "configurados",     trend: "neutral" as const, mono: true },
  { label: "Mejor setup",    value: "LG",  sub: "71% WR · +2.2R",  trend: "up"      as const, mono: false },
  { label: "Trades A+",      value: "34%", sub: "del total",        trend: "up"      as const, mono: true },
  { label: "Avg RR",         value: "1.8", sub: "todos los setups", trend: "up"      as const, mono: true },
]

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
      {title && <p className="text-eyebrow mb-3">{title}</p>}
      {children}
    </div>
  )
}

function StatRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[var(--line)] last:border-0 text-sm">
      <span className="text-[var(--ink-2)]">{label}</span>
      <span className={cn("font-mono font-semibold", valueClass ?? "text-[var(--ink)]")}>{value}</span>
    </div>
  )
}

function TabPortfolio() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 flex flex-col gap-4">
        <Section title="Distribución por cuenta">
          <div className="flex items-center justify-center py-6">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="var(--line)" strokeWidth="24" />
              <circle cx="80" cy="80" r="60" fill="none" stroke="var(--accent)" strokeWidth="24"
                strokeDasharray="226 150" strokeLinecap="round" transform="rotate(-90 80 80)" />
              <text x="80" y="76" textAnchor="middle" fill="var(--ink)" fontSize="18" fontWeight="700" fontFamily="JetBrains Mono">65%</text>
              <text x="80" y="92" textAnchor="middle" fill="var(--ink-3)" fontSize="10">FXify</text>
            </svg>
          </div>
        </Section>
        <Section title="Cuentas">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-eyebrow border-b border-[var(--line)]">
                {["Cuenta","Balance","P&L","Estado"].map(h => (
                  <th key={h} className="pb-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockAccounts.map(a => (
                <tr key={a.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2.5 font-medium text-[var(--ink)]">{a.name}</td>
                  <td className="py-2.5 font-mono">${a.initialBalance.toLocaleString()}</td>
                  <td className="py-2.5 font-mono text-[var(--win)]">+$3,640</td>
                  <td className="py-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--win-soft)] text-[var(--win)] font-semibold">
                      Activa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
      <div className="flex flex-col gap-4">
        <Section title="Prop Firm Rules — FXify">
          <StatRow label="Max Drawdown" value="10%" />
          <StatRow label="Daily Loss"   value="5%" />
          <StatRow label="Objetivo"     value="8%" />
          <StatRow label="Trades/día"   value="3" />
          <StatRow label="Símbolos"     value="NQ, ES, MNQ" />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[var(--ink-3)] mb-1">
              <span>Progreso fase</span>
              <span className="font-mono text-[var(--win)]">3.6%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full bg-[var(--win)]" style={{ width: "45%" }} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

function TabOperador() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 flex flex-col gap-4">
        <Section title="Equity Curve — FXify 100K">
          <div className="h-48">
            <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
              <polyline points="0,140 50,120 100,100 150,90 200,70 250,85 300,60 350,45 400,30"
                fill="none" stroke="var(--accent)" strokeWidth="2" />
              <polyline points="0,140 50,135 100,125 150,120 200,110 250,115 300,100 350,90 400,80"
                fill="none" stroke="var(--be)" strokeWidth="2" strokeDasharray="4 2" />
            </svg>
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
              <span className="w-3 h-0.5 bg-[var(--accent)] inline-block" />Balance
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
              <span className="w-3 h-0.5 bg-[var(--be)] inline-block" />Equity
            </span>
          </div>
        </Section>
        <Section title="Trades recientes">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-eyebrow border-b border-[var(--line)]">
                {["","Símbolo","Fecha","R","P&L"].map(h => (
                  <th key={h} className="pb-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockTrades.map(t => (
                <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      t.direction === "LONG"
                        ? "bg-[var(--win-soft)] text-[var(--win)]"
                        : "bg-[var(--loss-soft)] text-[var(--loss)]"
                    )}>{t.direction}</span>
                  </td>
                  <td className="py-2 font-mono font-semibold text-[var(--ink)]">{t.symbol}</td>
                  <td className="py-2 text-[var(--ink-2)]">{t.date}</td>
                  <td className={cn("py-2 font-mono font-semibold",
                    (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"
                  )}>
                    {(t.rMultiple ?? 0) >= 0 ? "+" : ""}{t.rMultiple}R
                  </td>
                  <td className={cn("py-2 font-mono",
                    (t.pnl ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"
                  )}>
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${t.pnl?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
      <div className="flex flex-col gap-4">
        <Section title="Cuenta activa">
          <StatRow label="Balance"  value="$103,640" />
          <StatRow label="Equity"   value="$103,220" />
          <StatRow label="Drawdown" value="-0.4%"    valueClass="text-[var(--loss)]" />
          <StatRow label="Objetivo" value="8%" />
        </Section>
      </div>
    </div>
  )
}

function TabDisciplina() {
  const violations = [
    { rule: "Operar fuera de sesión",     count: 2 },
    { rule: "Exceder máximo de trades",   count: 3 },
    { rule: "Pérdida diaria sobre límite",count: 1 },
    { rule: "Operar símbolo no permitido",count: 1 },
  ]
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 flex flex-col gap-4">
        <div className="rounded-[var(--radius)] border border-[var(--loss)] bg-[var(--loss-soft)] px-4 py-3 text-sm font-semibold text-[var(--loss)]">
          🚫 DO-NOT-TAKE activo — Has alcanzado 3 trades hoy
        </div>
        <Section title="Violaciones este mes">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-eyebrow border-b border-[var(--line)]">
                {["Regla","Veces"].map(h => (
                  <th key={h} className="pb-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.rule} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2.5 text-[var(--ink)]">{v.rule}</td>
                  <td className="py-2.5 font-mono font-bold text-[var(--loss)]">{v.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
      <div className="flex flex-col gap-4">
        <Section title="Score semanal">
          <div className="text-center py-4">
            <p className="text-4xl font-bold font-mono text-[var(--ink)]">78</p>
            <p className="text-sm text-[var(--ink-3)] mt-1">de 100</p>
            <div className="mt-3 h-2 rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full bg-[var(--be)]" style={{ width: "78%" }} />
            </div>
          </div>
          <StatRow label="Plan rate"   value="82%" valueClass="text-[var(--win)]" />
          <StatRow label="Violaciones" value="7"   valueClass="text-[var(--loss)]" />
        </Section>
      </div>
    </div>
  )
}

const SETUPS = [
  { abbr: "OR", name: "Opening Range Break", wr: "64%", avgR: "+1.80", trades: 18 },
  { abbr: "FA", name: "Failed Auction",       wr: "52%", avgR: "+8.90", trades: 11 },
  { abbr: "LR", name: "London Reversal",      wr: "58%", avgR: "+1.40", trades: 8  },
  { abbr: "LG", name: "Liquidity Grab",       wr: "71%", avgR: "+2.20", trades: 14 },
  { abbr: "TC", name: "Trend Continuation",   wr: "49%", avgR: "+0.60", trades: 6  },
  { abbr: "AS", name: "Asia Sweep",           wr: "55%", avgR: "+1.10", trades: 9  },
]

function TabPlaybook() {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Setups · Rendimiento">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-eyebrow border-b border-[var(--line)]">
              {["Setup","Nombre","Win %","Avg R","Trades"].map(h => (
                <th key={h} className="pb-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SETUPS.map(s => (
              <tr key={s.abbr} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                <td className="py-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold">
                    {s.abbr}
                  </span>
                </td>
                <td className="py-2.5 font-medium text-[var(--ink)]">{s.name}</td>
                <td className="py-2.5 font-mono font-semibold text-[var(--win)]">{s.wr}</td>
                <td className="py-2.5 font-mono font-semibold text-[var(--win)]">{s.avgR}</td>
                <td className="py-2.5 font-mono text-[var(--ink-2)]">{s.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

const KPI_MAP: Record<Tab, import("@/types").KpiCard[]> = {
  portfolio:  PORTFOLIO_KPIS,
  operador:   OPERADOR_KPIS,
  disciplina: DISCIPLINA_KPIS,
  playbook:   PLAYBOOK_KPIS,
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("portfolio")

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <TopBar title="Dashboard" subtitle="FXify 100K · Phase 2 · Sem. 20" />
      <FilterBar
        options={TABS}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        className="mb-5"
      />
      <KpiStrip items={KPI_MAP[tab]} className="mb-6" />
      {tab === "portfolio"  && <TabPortfolio />}
      {tab === "operador"   && <TabOperador />}
      {tab === "disciplina" && <TabDisciplina />}
      {tab === "playbook"   && <TabPlaybook />}
    </div>
  )
}

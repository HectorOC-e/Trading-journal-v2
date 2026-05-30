"use client"

import { useState, useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { FilterBar } from "@/components/ui/filter-bar"
import { TopBar } from "@/components/layout/top-bar"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { TrendingUp, TrendingDown, Target, BarChart2, Shield, CheckCircle2, Percent, Activity, Award } from "lucide-react"
import { RuleBar } from "@/components/ui/rule-bar"
import { KpiCard } from "@/components/ui/kpi-card"
import type { RouterOutputs } from "@/server/trpc/root"

type Tab = "portfolio" | "operador" | "disciplina" | "playbook"

const TABS = [
  { value: "portfolio",  label: "Portfolio" },
  { value: "operador",   label: "Operador" },
  { value: "disciplina", label: "Disciplina" },
  { value: "playbook",   label: "Playbook" },
]

type DashboardStats  = RouterOutputs["trades"]["dashboardStats"]
type AccountMeta     = RouterOutputs["accounts"]["list"][number]

/* ── Shared helpers ────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { color: string; label: string; icon: string }> = {
  PROP_FIRM:      { color: "#4f6ef7", label: "PROP FIRM",  icon: "🏢" },
  PERSONAL:       { color: "#22c55e", label: "PERSONAL",   icon: "👤" },
  DEMO_PROP:      { color: "#9b59b6", label: "DEMO PROP",  icon: "🖥️" },
  DEMO_PERSONAL:  { color: "#a78bfa", label: "DEMO",       icon: "🖥️" },
  BACKTEST:       { color: "#f59e0b", label: "BACKTEST",   icon: "📊" },
  QA:             { color: "#6b7280", label: "QA",         icon: "🔬" },
}

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
function fmtDate(iso: string) {
  const [, m, d] = iso.split("-")
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]}`
}

function Card({ title, sub, children, className }: {
  title?: string; sub?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5", className)}>
      {title && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
          {sub && <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

interface TooltipPayload { dataKey: string; name: string; value: number; color: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--ink-3)] mb-1.5 font-medium">{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB PORTFOLIO
═══════════════════════════════════════════ */
function PropFirmRules({ propFirmStatus }: { propFirmStatus: DashboardStats["propFirmStatus"] }) {
  if (propFirmStatus.length === 0) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
      <p className="text-[13px] font-semibold text-[var(--ink)]">Reglas Prop Firm · progreso</p>
      <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">
        Risk engine evalúa estos límites antes de aceptar cada nuevo trade.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {propFirmStatus.map(a => (
          <div key={a.accountId}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] p-4 flex flex-col gap-3"
            style={{ borderLeft: `3px solid ${a.status === "OK" ? "var(--win)" : "var(--loss)"}` }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{a.name}</p>
              <span className="text-[10px] font-bold tracking-wider"
                style={{ color: a.status === "OK" ? "var(--win)" : "var(--loss)" }}>
                {a.status}
              </span>
            </div>
            <RuleBar label="Max drawdown total" usedPct={a.ddPctUsed} displayRight={`${a.ddPctUsed.toFixed(1)}%`} />
            <RuleBar label="Pérdida diaria"      usedPct={a.dailyLossPct} displayRight={`${a.dailyLossPct.toFixed(1)}%`} />
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--ink-2)]">Trades / día</span>
                <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">
                  <span style={{ color: a.tradesMax > 0 && a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--ink)" }}>{a.tradesUsed}</span>
                  <span className="text-[var(--ink-3)]"> / {a.tradesMax > 0 ? a.tradesMax : "∞"}</span>
                </span>
              </div>
              {a.tradesMax > 0 && (
                <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((a.tradesUsed / a.tradesMax) * 100, 100)}%`,
                      background: a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--win)",
                    }} />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--ink-3)]">
              Símbolos permitidos: <span className="text-[var(--ink-2)] font-medium">
                {(a as { accountId: string; name: string; ddPctUsed: number; dailyLossPct: number; tradesUsed: number; tradesMax: number; status: "OK" | "ALERTA" } & { allowedSymbols?: string[] }).allowedSymbols?.join(", ") || "—"}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabPortfolio({
  kpis, pnlByDate, propFirmStatus, accountStats, accounts,
}: {
  kpis:           DashboardStats["kpis"]
  pnlByDate:      DashboardStats["pnlByDate"]
  propFirmStatus: DashboardStats["propFirmStatus"]
  accountStats:   DashboardStats["accountStats"]
  accounts:       AccountMeta[]
}) {
  const totalInitial = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.initialBalance), 0),
    [accounts],
  )
  const donutData = useMemo(() => accounts.map(a => {
    const meta = TYPE_META[a.type] ?? { color: "#6b7280" }
    const pct  = totalInitial > 0 ? (Number(a.initialBalance) / totalInitial) * 100 : 0
    return { name: a.name, value: parseFloat(pct.toFixed(1)), color: meta.color }
  }), [accounts, totalInitial])

  const barData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {}
    for (const entry of pnlByDate) {
      const name = accounts.find(a => a.id === entry.accountId)?.name ?? entry.accountId
      if (!byDate[entry.date]) byDate[entry.date] = {}
      byDate[entry.date][name] = (byDate[entry.date][name] ?? 0) + entry.pnl
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-15)
      .map(([date, vals]) => ({ date: fmtDate(date), ...vals }))
  }, [pnlByDate, accounts])

  const barAccountNames = useMemo(() => {
    const names = new Set<string>()
    for (const entry of pnlByDate) names.add(accounts.find(a => a.id === entry.accountId)?.name ?? entry.accountId)
    return Array.from(names)
  }, [pnlByDate, accounts])

  const accountsTable = useMemo(() => {
    return accountStats.map(s => {
      const a = accounts.find(acc => acc.id === s.accountId)
      return { ...s, name: a?.name ?? s.accountId, type: a?.type ?? "PERSONAL", status: a?.status ?? "ACTIVE" }
    })
  }, [accountStats, accounts])

  const pf = kpis.profitFactor
  const { netPnl, wins, total, winRate, avgR, sharpeRatio, expectancyDollar, bestDay, worstDay, tradeStreak } = kpis

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Net P&L total"
          value={`${netPnl >= 0 ? "+" : "-"}$${Math.abs(netPnl).toFixed(2)}`}
          sub={`${total} operaciones cerradas`}
          color={netPnl >= 0 ? "var(--win)" : "var(--loss)"}
          icon={netPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} />
        <KpiCard label="Profit Factor"
          value={pf === 999 ? "∞" : pf.toFixed(4)}
          sub="todas las cuentas"
          icon={<Activity size={15} />} />
        <KpiCard label="Win Rate"
          value={`${winRate.toFixed(2)}%`}
          sub={`${wins} / ${total} operaciones`}
          icon={<Percent size={15} />} />
        <KpiCard label="Avg R"
          value={`${avgR >= 0 ? "+" : ""}${avgR.toFixed(4)}R`}
          sub="promedio rMultiple"
          color={avgR >= 0 ? "var(--win)" : "var(--loss)"}
          icon={<Target size={15} />} />
        <KpiCard label="Sharpe Ratio"
          value={sharpeRatio != null ? sharpeRatio.toFixed(4) : "—"}
          sub="avgR / desv. estándar R"
          color={sharpeRatio != null && sharpeRatio >= 1 ? "var(--win)" : sharpeRatio != null && sharpeRatio < 0 ? "var(--loss)" : undefined}
          icon={<BarChart2 size={15} />} />
        <KpiCard label="Expectancy $"
          value={`${expectancyDollar >= 0 ? "+" : "-"}$${Math.abs(expectancyDollar).toFixed(2)}`}
          sub="por trade promedio"
          color={expectancyDollar >= 0 ? "var(--win)" : "var(--loss)"}
          icon={<CheckCircle2 size={15} />} />
        <KpiCard label="Mejor día"
          value={bestDay ? `+$${bestDay.pnl.toFixed(2)}` : "—"}
          sub={bestDay ? fmtDate(bestDay.date) : "sin datos"}
          color="var(--win)"
          icon={<TrendingUp size={15} />} />
        <KpiCard label="Peor día"
          value={worstDay && worstDay.pnl < 0 ? `-$${Math.abs(worstDay.pnl).toFixed(2)}` : "—"}
          sub={worstDay && worstDay.pnl < 0 ? fmtDate(worstDay.date) : "sin datos"}
          color="var(--loss)"
          icon={<TrendingDown size={15} />} />
        {tradeStreak && (
          <KpiCard label="Racha actual"
            value={`${tradeStreak.count}${tradeStreak.isWin ? "W" : "L"}`}
            sub={tradeStreak.isWin ? "victorias consecutivas" : "pérdidas consecutivas"}
            color={tradeStreak.isWin ? "var(--win)" : "var(--loss)"}
            icon={<Award size={15} />} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Asignación por cuenta" sub="Ponderación por balance inicial">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div style={{ width: 120, flexShrink: 0 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData.length > 0 ? donutData : [{ name: "Sin cuentas", value: 1, color: "var(--line)" }]}
                    cx={75} cy={75} innerRadius={50} outerRadius={72}
                    dataKey="value" strokeWidth={2} stroke="var(--panel)">
                    {(donutData.length > 0 ? donutData : [{ color: "var(--line)" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-[var(--ink)] flex-1">{d.name}</span>
                  <span className="text-[11px] font-mono font-bold text-[var(--ink-2)]">{d.value}%</span>
                </div>
              ))}
              {donutData.length === 0 && <p className="text-[11px] text-[var(--ink-3)]">Sin cuentas</p>}
            </div>
          </div>
        </Card>

        <Card title="P&L diario por cuenta" sub="Últimas 15 sesiones · USD">
          {barData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={barData} barSize={10} barCategoryGap="28%">
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 0 ? `+$${v}` : `-$${Math.abs(v)}`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chip)", opacity: 0.5 }} />
                  {barAccountNames.map((name, i) => {
                    const meta = accounts.find(a => a.name === name)
                    const color = meta ? (TYPE_META[meta.type]?.color ?? "#4f6ef7") : "#4f6ef7"
                    const isLast = i === barAccountNames.length - 1
                    return (
                      <Bar key={name} dataKey={name} stackId="a" fill={color}
                        radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1 flex-wrap">
                {barAccountNames.map(name => {
                  const meta = accounts.find(a => a.name === name)
                  const color = meta ? (TYPE_META[meta.type]?.color ?? "#4f6ef7") : "#4f6ef7"
                  return (
                    <span key={name} className="flex items-center gap-1.5 text-[10px] text-[var(--ink-3)]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{name}
                    </span>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-[175px] flex items-center justify-center text-[var(--ink-3)] text-sm">Sin datos de trades</div>
          )}
        </Card>
      </div>

      <PropFirmRules propFirmStatus={propFirmStatus} />

      <Card title="Comparación de cuentas">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Cuenta","Balance","P&L mes","Win %","Drawdown","Estado"].map(h => (
                  <th key={h} className="pb-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accountsTable.map(a => (
                <tr key={a.accountId} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-3 font-medium text-[var(--ink)] text-sm">{a.name}</td>
                  <td className="py-3 font-mono text-sm text-[var(--ink)]">${a.balance.toFixed(2)}</td>
                  <td className={cn("py-3 font-mono text-sm font-semibold", a.pnlMonth >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {a.pnlMonth >= 0 ? "+" : "-"}${Math.abs(a.pnlMonth).toFixed(2)}
                  </td>
                  <td className="py-3 font-mono text-sm text-[var(--ink)]">{a.winRate.toFixed(2)}%</td>
                  <td className={cn("py-3 font-mono text-sm", a.drawdownPct > 0 ? "text-[var(--loss)]" : "text-[var(--ink-3)]")}>
                    {a.drawdownPct > 0 ? `-${a.drawdownPct.toFixed(1)}%` : "0.0%"}
                  </td>
                  <td className="py-3">
                    <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full",
                      a.status === "ACTIVE" ? "bg-[var(--win-soft)] text-[var(--win)]"
                      : a.status === "PAUSED" ? "bg-[var(--be-soft)] text-[var(--be)]"
                      : "bg-[var(--chip)] text-[var(--ink-3)]"
                    )}>
                      {a.status === "ACTIVE" ? "Activa" : a.status === "PAUSED" ? "Pausada" : a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {accountsTable.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-[var(--ink-3)] text-sm">Sin cuentas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB OPERADOR
═══════════════════════════════════════════ */
const TRADE_FILTERS = ["Todos", "A+", "Plan seguido", "Off-plan", "Con violación"]

function TabOperador({
  kpis, accountStats, equityCurve, sessionStats, pnlBySymbol, hourStats, recentTrades, executionStats, accounts,
}: {
  kpis:           DashboardStats["kpis"]
  accountStats:   DashboardStats["accountStats"]
  equityCurve:    DashboardStats["equityCurve"]
  sessionStats:   DashboardStats["sessionStats"]
  pnlBySymbol:    DashboardStats["pnlBySymbol"]
  hourStats:      DashboardStats["hourStats"]
  recentTrades:   DashboardStats["recentTrades"]
  executionStats: DashboardStats["executionStats"]
  accounts:       AccountMeta[]
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [tradeFilter, setTradeFilter] = useState("Todos")

  const accountCards = useMemo(() => {
    return accountStats.map(s => {
      const a    = accounts.find(acc => acc.id === s.accountId)
      const meta = TYPE_META[a?.type ?? "PERSONAL"] ?? { color: "#6b7280", label: "—", icon: "📊" }
      return {
        ...s,
        name:      a?.name   ?? s.accountId,
        type:      a?.type   ?? "PERSONAL",
        color:     meta.color,
        typeLabel: meta.label,
        typeIcon:  meta.icon,
      }
    })
  }, [accountStats, accounts])

  const totalPortfolio = accountCards.reduce((s, a) => s + a.balance, 0)
  const activeId       = selectedAccountId ?? accountCards[0]?.accountId ?? null
  const activeCard     = accountCards.find(a => a.accountId === activeId) ?? accountCards[0]

  const equityData = useMemo(() => {
    if (!activeId) return []
    return equityCurve
      .filter(p => p.accountId === activeId)
      .map(p => ({ date: fmtDate(p.date), balance: p.balance }))
  }, [activeId, equityCurve])

  const equityStart      = equityData[0]?.balance ?? Number(activeCard?.sparkline?.[0] ?? 0)
  const equityEnd        = equityData[equityData.length - 1]?.balance ?? equityStart
  const equityChangePct  = equityStart > 0 ? ((equityEnd - equityStart) / equityStart) * 100 : 0

  const filteredTrades = useMemo(() => {
    let list = [...recentTrades]
    if (tradeFilter === "A+")            list = list.filter(t => t.tags.includes("A+"))
    if (tradeFilter === "Plan seguido")  list = list.filter(t => t.setupId != null)
    if (tradeFilter === "Off-plan")      list = list.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan"))
    if (tradeFilter === "Con violación") list = list.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan") || t.tags.includes("Revanche"))
    return list.slice(0, 10)
  }, [recentTrades, tradeFilter])

  const { avgDurationMinutes, avgPlannedRisk, avgPlannedReward, riskRewardRatio } = executionStats

  return (
    <div className="flex flex-col gap-4">
      {/* ── Equity hero ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-6 py-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-eyebrow mb-2">Equity · {activeCard?.name ?? "—"}</p>
            <div className="flex items-baseline gap-3">
              <p style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)", lineHeight: 1 }}>
                ${equityEnd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className={cn("flex items-center gap-1 text-sm font-semibold", equityChangePct >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                {equityChangePct >= 0 ? "↑" : "↓"} {equityChangePct >= 0 ? "+" : ""}{equityChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          {equityData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={equityData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="balance" name="Balance" stroke="#4f6ef7" strokeWidth={2.5}
                  fill="url(#gradBal)" dot={false} activeDot={{ r: 5, fill: "#4f6ef7", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[var(--ink-3)] text-sm">Sin suficientes datos para la curva de equidad</div>
          )}
          <div className="flex gap-5 mt-1 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-px inline-block" style={{ background: "#4f6ef7" }} />
              <span className="text-xs text-[var(--ink-3)]">Balance</span>
              <span className="text-xs font-mono font-semibold text-[var(--ink)]">
                ${equityEnd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Account cards ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Tus cuentas</p>
          <p className="text-[11px] text-[var(--ink-3)]">
            {accountCards.length} cuentas · portfolio consolidado{" "}
            <span className="font-mono font-semibold text-[var(--ink)]">
              ${totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {accountCards.map(a => {
            const active = (selectedAccountId ?? accountCards[0]?.accountId) === a.accountId
            return (
              <button key={a.accountId} onClick={() => setSelectedAccountId(a.accountId)}
                className="text-left rounded-[var(--radius-sm)] p-3 border transition-all"
                style={{
                  border: active ? `1.5px solid ${a.color}` : "1.5px solid var(--line)",
                  background: active ? "var(--panel-2)" : "transparent",
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: `${a.color}22`, color: a.color }}>
                    {a.typeIcon}
                  </div>
                  <span className="text-[9px] font-bold text-[var(--ink-3)] uppercase tracking-wider">{a.typeLabel}</span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--ink)] leading-tight mb-1.5">{a.name}</p>
                <p className="font-mono font-bold text-[var(--ink)] text-[14px] leading-none">
                  ${a.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={cn("text-[10px] font-semibold mt-1 font-mono",
                  a.pnlToday > 0 ? "text-[var(--win)]" : a.pnlToday < 0 ? "text-[var(--loss)]" : "text-[var(--ink-3)]")}>
                  {a.pnlToday > 0 ? "+" : ""}{a.pnlToday === 0 ? "0.00" : a.pnlToday.toFixed(2)} USD hoy
                </p>
              </button>
            )
          })}
          {accountCards.length === 0 && (
            <div className="col-span-4 py-4 text-center text-[var(--ink-3)] text-sm">Sin cuentas registradas</div>
          )}
        </div>
      </div>

      {/* ── Trades recientes ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Trades recientes</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TRADE_FILTERS.map(f => (
              <button key={f} onClick={() => setTradeFilter(f)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background: tradeFilter === f ? "var(--accent)" : "var(--chip)",
                  color: tradeFilter === f ? "white" : "var(--ink-2)",
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Símbolo · Setup","R","P&L Neto","Sesión · Tags","Fecha"].map(h => (
                  <th key={h} className="pb-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map(t => (
                <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-base leading-none", t.direction === "LONG" ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                        {t.direction === "LONG" ? "↑" : "↓"}
                      </span>
                      <div>
                        <p className="font-mono font-bold text-[var(--ink)] text-sm">
                          {t.symbol}<span className="font-sans font-normal text-[var(--ink-3)] text-xs ml-1">· {t.direction}</span>
                        </p>
                        <p className="text-[10px] text-[var(--ink-3)]">{t.setupName ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn("py-3 font-mono font-bold text-sm", (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.rMultiple ?? 0) >= 0 ? "+" : ""}{(t.rMultiple ?? 0).toFixed(2)}R
                  </td>
                  <td className={cn("py-3 font-mono font-bold text-sm", t.pnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3">
                    <p className="text-xs text-[var(--ink-2)] mb-1">{t.session ?? "—"}</p>
                    <div className="flex gap-1 flex-wrap">
                      {t.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: tag === "A+" ? "var(--accent-soft)" : "var(--chip)",
                            color: tag === "A+" ? "var(--accent)" : "var(--ink-2)",
                          }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-xs text-[var(--ink-3)]">{fmtDate(t.date)}</td>
                </tr>
              ))}
              {filteredTrades.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-[var(--ink-3)] text-sm">Sin trades</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Rendimiento por sesión ── */}
      <Card title="Rendimiento por sesión">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Sesión","Trades","Win %","Avg R"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessionStats.map(s => (
                <tr key={s.session} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-2.5 text-sm text-[var(--ink)]">{s.session}</td>
                  <td className="py-2.5 font-mono text-sm text-[var(--ink-2)]">{s.trades}</td>
                  <td className={cn("py-2.5 font-mono text-sm font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {s.winRate.toFixed(1)}%
                  </td>
                  <td className={cn("py-2.5 font-mono text-sm font-semibold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {s.avgR > 0 ? "+" : ""}{s.avgR.toFixed(2)}R
                  </td>
                </tr>
              ))}
              {sessionStats.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[var(--ink-3)] text-sm">Sin datos de sesiones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="P&L por símbolo" sub="Rendimiento neto acumulado por instrumento">
          {pnlBySymbol.length === 0 ? (
            <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin datos</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  {["Símbolo","Trades","Win %","Net P&L"].map(h => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pnlBySymbol.map(s => (
                  <tr key={s.symbol} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                    <td className="py-2 font-mono font-bold text-sm text-[var(--ink)]">{s.symbol}</td>
                    <td className="py-2 font-mono text-sm text-[var(--ink-2)]">{s.trades}</td>
                    <td className={cn("py-2 font-mono text-sm font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                      {s.winRate.toFixed(2)}%
                    </td>
                    <td className={cn("py-2 font-mono text-sm font-semibold", s.pnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                      {s.pnl >= 0 ? "+" : "-"}${Math.abs(s.pnl).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Horario óptimo" sub="Por hora de apertura · avg R desc.">
          {hourStats.length === 0 ? (
            <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin datos de openTime</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  {["Hora","Trades","Win %","Avg R"].map(h => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hourStats.slice(0, 8).map(h => (
                  <tr key={h.hour} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                    <td className="py-2 font-mono font-bold text-sm text-[var(--ink)]">{String(h.hour).padStart(2, "0")}:00</td>
                    <td className="py-2 font-mono text-sm text-[var(--ink-2)]">{h.trades}</td>
                    <td className={cn("py-2 font-mono text-sm font-semibold", h.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                      {h.winRate.toFixed(2)}%
                    </td>
                    <td className={cn("py-2 font-mono text-sm font-semibold", h.avgR >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                      {h.avgR >= 0 ? "+" : ""}{h.avgR.toFixed(4)}R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Métricas de ejecución" sub="Tiempo en posición y riesgo/objetivo planificado">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Tiempo prom. en trade",
              value: avgDurationMinutes != null
                ? avgDurationMinutes >= 60
                  ? `${Math.floor(avgDurationMinutes / 60)}h ${Math.round(avgDurationMinutes % 60)}m`
                  : `${avgDurationMinutes.toFixed(1)} min`
                : "—",
              sub: "entre openTime y closeTime",
            },
            { label: "Riesgo Planificado prom.", value: avgPlannedRisk   != null ? `$${avgPlannedRisk.toFixed(2)}`   : "—", sub: "riesgo en $ al abrir el trade"       },
            { label: "Reward Planificado prom.", value: avgPlannedReward != null ? `$${avgPlannedReward.toFixed(2)}` : "—", sub: "objetivo en $ al abrir el trade"      },
            { label: "Ratio Reward/Riesgo",      value: riskRewardRatio  != null ? riskRewardRatio.toFixed(4)        : "—", sub: "objetivo / riesgo planificado"         },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-[var(--panel-2)] rounded-[var(--radius-sm)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--ink-3)] font-semibold mb-2">{label}</p>
              <p className="text-[22px] font-mono font-bold text-[var(--ink)] leading-none">{value}</p>
              <p className="text-[10px] text-[var(--ink-3)] mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB DISCIPLINA
═══════════════════════════════════════════ */
const HEAT_COLORS: Record<string, string> = {
  "null": "var(--panel-2)",
  "0": "var(--win)",
  "1": "var(--be)",
  "2": "var(--loss)",
}
const DAYS  = ["L","M","X","J","V","S","D"]
const WEEKS = 12

type HeatVal = null | 0 | 1 | 2

function TabDisciplina({ kpis, discipline }: {
  kpis:       DashboardStats["kpis"]
  discipline: DashboardStats["discipline"]
}) {
  const today    = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  const heatmap = useMemo((): HeatVal[][] => {
    const dateMap: Record<string, HeatVal> = {}
    for (const { date, severity } of discipline.heatmapData) {
      dateMap[date] = severity as HeatVal
    }
    const grid: HeatVal[][] = DAYS.map(() => Array(WEEKS).fill(null))
    const endDate = new Date(today)
    const dayOfWeek = (endDate.getDay() + 6) % 7
    endDate.setDate(endDate.getDate() - dayOfWeek + 6)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1))
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate)
        cellDate.setDate(startDate.getDate() + w * 7 + d)
        if (cellDate > today) { grid[d][w] = null; continue }
        const iso = cellDate.toISOString().slice(0, 10)
        grid[d][w] = dateMap[iso] !== undefined ? dateMap[iso] : null
      }
    }
    return grid
  }, [discipline.heatmapData, todayISO])

  const { composition, aplusStats, violations, weeklyScore, rDistribution, costoIndisciplina, rachaDiasLimpios } = discipline
  const { tradesCountToday } = kpis
  const total = kpis.total

  const disciplineScore = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
  const planSeguidoPct  = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
  const totalViolations = violations.reduce((s, v) => s + v.count, 0)
  const sinViolacionPct = total > 0 ? (((total - totalViolations) / total) * 100).toFixed(2) : "0.00"

  const compData = [
    { name: "Plan seguido", value: composition.planSeguido, color: "var(--win)"  },
    { name: "Plan parcial",  value: composition.partial,    color: "var(--be)"   },
    { name: "Off-plan",      value: composition.offPlan,    color: "var(--loss)" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Costo indisciplina"
          value={`${costoIndisciplina >= 0 ? "+" : "-"}$${Math.abs(costoIndisciplina).toFixed(2)}`}
          sub="P&L acumulado off-plan"
          color={costoIndisciplina < 0 ? "var(--loss)" : "var(--ink-3)"}
          icon={<Shield size={15} />} />
        <KpiCard label="Racha días limpios"
          value={String(rachaDiasLimpios)}
          sub="días consecutivos sin violación"
          color={rachaDiasLimpios >= 3 ? "var(--win)" : rachaDiasLimpios >= 1 ? "var(--be)" : "var(--loss)"}
          icon={<CheckCircle2 size={15} />} />
        <KpiCard label="A+ Win Rate"
          value={aplusStats.aplusWr != null ? `${aplusStats.aplusWr.toFixed(2)}%` : "—"}
          sub={`vs std ${aplusStats.stdWr != null ? aplusStats.stdWr.toFixed(2) + "%" : "—"} · ${aplusStats.aplusCount} A+`}
          color={aplusStats.aplusWr != null && aplusStats.stdWr != null && aplusStats.aplusWr > aplusStats.stdWr ? "var(--win)" : undefined}
          icon={<Award size={15} />} />
        <KpiCard label="A+ Avg R"
          value={aplusStats.aplusAvgR != null ? `${aplusStats.aplusAvgR >= 0 ? "+" : ""}${aplusStats.aplusAvgR.toFixed(4)}R` : "—"}
          sub={`vs std ${aplusStats.stdAvgR != null ? (aplusStats.stdAvgR >= 0 ? "+" : "") + aplusStats.stdAvgR.toFixed(4) + "R" : "—"}`}
          color={aplusStats.aplusAvgR != null ? (aplusStats.aplusAvgR >= 0 ? "var(--win)" : "var(--loss)") : undefined}
          icon={<Target size={15} />} />
      </div>

      {weeklyScore.length > 1 && (
        <Card title="Discipline Score semanal" sub="% trades plan seguido por semana · últimas 12 semanas">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={weeklyScore} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke="#4f6ef7" strokeWidth={2}
                fill="url(#gradScore)" dot={{ r: 3, fill: "#4f6ef7", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tradesCountToday >= 3 && (
        <div className="rounded-[var(--radius)] border border-[var(--loss)] px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(180,40,40,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--loss)] flex items-center justify-center text-white text-sm font-bold shrink-0">!</div>
            <div>
              <p className="text-sm font-bold text-[var(--loss)]">DO-NOT-TAKE · {tradesCountToday} trades hoy</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5">Verifica los límites de tu plan operativo antes de continuar.</p>
            </div>
          </div>
          <button className="text-xs font-semibold text-[var(--ink-3)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-1.5 whitespace-nowrap hover:text-[var(--ink)] transition-colors shrink-0">
            Ver registro →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-2 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-eyebrow mb-3">Discipline Score · acumulado</p>
          <div className="flex items-baseline gap-3 mb-1">
            <p style={{ fontSize: 52, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)", lineHeight: 1 }}>{disciplineScore}</p>
            <p className="text-[var(--ink-3)] text-lg font-mono">/ 100.00</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            {[
              { label: "Sin violación",   value: `${sinViolacionPct}%`,  sub: `${total} trades total`,          color: "var(--win)"  },
              { label: "Plan seguido",    value: `${planSeguidoPct}%`,   sub: `${composition.planSeguido} / ${total}`, color: "#4f6ef7" },
              { label: "Off-plan count",  value: `${composition.offPlan}`, sub: "trades off-plan",              color: "var(--loss)" },
            ].map(m => (
              <div key={m.label} className="border-l-2 pl-3" style={{ borderColor: m.color }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-1">{m.label}</p>
                <p className="font-mono font-bold text-[var(--ink)]" style={{ fontSize: 22 }}>{m.value}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5 flex flex-col">
          <p className="text-eyebrow mb-4">Composición global</p>
          <div className="flex-1 flex items-center gap-4">
            <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={total > 0 ? compData : [{ name: "Sin datos", value: 1, color: "var(--line)" }]}
                    cx={55} cy={55} innerRadius={36} outerRadius={54}
                    dataKey="value" strokeWidth={2} stroke="var(--panel)">
                    {(total > 0 ? compData : [{ color: "var(--line)" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p className="font-mono font-bold text-[var(--ink)] text-sm">{total}</p>
                <p className="text-[9px] text-[var(--ink-3)]">trades</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {compData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-[var(--ink-2)]">{d.name} · <strong className="text-[var(--ink)]">{d.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Heatmap de disciplina · últimas 12 semanas</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">Cada celda = un día. Color = severidad máxima de violación ese día.</p>
          </div>
          <div className="flex items-center gap-3">
            {[["var(--win)","Limpio"],["var(--be)","Menor"],["var(--loss)","Mayor"]].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1.5 text-[10px] text-[var(--ink-3)]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="flex mb-1 pl-5">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex-1 text-center" style={{ minWidth: 32 }}>
                {w % 2 === 0 && <span className="text-[9px] text-[var(--ink-3)]">S{w + 1}</span>}
              </div>
            ))}
          </div>
          {heatmap.map((row, di) => (
            <div key={di} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[10px] text-[var(--ink-3)] w-4 shrink-0 text-right mr-1">{DAYS[di]}</span>
              {row.map((val, wi) => (
                <div key={wi} className="flex-1 rounded-sm transition-colors cursor-pointer hover:opacity-80"
                  style={{
                    minWidth: 28, height: 28,
                    background: HEAT_COLORS[String(val)],
                    border: "1px solid var(--panel)",
                  }}
                  title={val === null ? "Sin trading" : val === 0 ? "Limpio" : val === 1 ? "Violación menor" : "Violación mayor"}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Distribución de R · acumulado" sub="Frecuencia de outcomes vs. expectativa.">
          <div className="flex items-end gap-1.5 h-32 mt-2">
            {rDistribution.map(d => {
              const maxCount = Math.max(...rDistribution.map(x => x.count), 1)
              const h = (d.count / maxCount) * 100
              const isNeg = d.bucket.startsWith("-")
              return (
                <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono font-bold text-[var(--ink-3)]">{d.count}</span>
                  <div className="w-full rounded-t-sm transition-all"
                    style={{ height: `${h}%`, background: isNeg ? "var(--loss)" : d.bucket === "0R" ? "var(--be)" : "var(--win)", minHeight: 4 }} />
                  <span className="text-[9px] text-[var(--ink-3)]">{d.bucket}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Violaciones por tag">
          <div className="flex justify-end mb-3">
            <button className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Ver registro →</button>
          </div>
          <div className="flex flex-col gap-0">
            {violations.map(v => (
              <div key={v.rule} className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: v.severity === "mayor" ? "var(--loss)" : "var(--be)" }} />
                <p className="flex-1 text-sm text-[var(--ink)]">{v.rule}</p>
                <span className="font-mono font-bold text-[var(--ink)] text-sm shrink-0">{v.count}</span>
              </div>
            ))}
            {violations.length === 0 && (
              <p className="py-4 text-center text-[var(--ink-3)] text-sm">Sin violaciones registradas</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB PLAYBOOK
═══════════════════════════════════════════ */
function sessionCellColor(pct: number) {
  if (pct >= 65) return { bg: "rgba(34,197,94,0.20)", text: "var(--win)"  }
  if (pct >= 50) return { bg: "rgba(232,150,42,0.20)", text: "var(--be)"  }
  return           { bg: "rgba(224,85,85,0.20)",  text: "var(--loss)" }
}
function checklistColor(pct: number) {
  if (pct >= 80) return "var(--win)"
  if (pct >= 65) return "var(--be)"
  return "var(--loss)"
}

function TabPlaybook({
  setupStats, sessionMatrix, directionStats,
}: {
  setupStats:     DashboardStats["setupStats"]
  sessionMatrix:  DashboardStats["sessionMatrix"]
  directionStats: DashboardStats["directionStats"]
}) {
  const playbookSummary = useMemo(() => {
    if (setupStats.length === 0) return null
    const mostUsed       = setupStats.reduce((a, b) => b.trades > a.trades ? b : a)
    const mostProfitable = setupStats.reduce((a, b) => b.netPnl > a.netPnl ? b : a)
    const bestAplus      = setupStats.reduce((a, b) =>
      (b.aplusCount / Math.max(b.trades, 1)) > (a.aplusCount / Math.max(a.trades, 1)) ? b : a,
    )
    const setupInStreak  = setupStats.reduce((a, b) => b.currentStreak > a.currentStreak ? b : a)
    return {
      mostUsed,
      mostProfitable,
      bestAplus: { ...bestAplus, aplusRate: bestAplus.trades > 0 ? bestAplus.aplusCount / bestAplus.trades * 100 : 0 },
      setupInStreak,
    }
  }, [setupStats])

  // Reshape sessionMatrix for the grid component
  const sessionGrid = useMemo(() => {
    const SESSIONS = ["New York", "London Close", "London", "Asia"] as const
    return setupStats.slice(0, 6).map(s => {
      const rows = sessionMatrix.filter(r => r.setupId === s.setupId)
      const wr = (sess: string) => rows.find(r => r.session === sess)?.winRate ?? null
      return {
        setup:  s.setupId,
        abbr:   s.abbr,
        color:  s.color,
        name:   s.name,
        nyam:   wr("New York"),
        nypm:   wr("London Close"),
        london: wr("London"),
        asia:   wr("Asia"),
      }
    })
  }, [setupStats, sessionMatrix])

  const directionMap = useMemo(() => {
    return new Map(directionStats.map(d => [d.setupId, d]))
  }, [directionStats])

  return (
    <div className="flex flex-col gap-4">
      {playbookSummary && (
        <div className="flex flex-wrap gap-2">
          {[
            { icon: "📊", label: "Más usado",    text: `${playbookSummary.mostUsed.abbr} · ${playbookSummary.mostUsed.trades} trades`, color: "#4f6ef7" },
            { icon: "💰", label: "Más rentable",  text: `${playbookSummary.mostProfitable.abbr} · ${playbookSummary.mostProfitable.netPnl >= 0 ? "+" : "-"}$${Math.abs(playbookSummary.mostProfitable.netPnl).toFixed(2)}`, color: "var(--win)" },
            { icon: "🔥", label: "En racha",       text: playbookSummary.setupInStreak.currentStreak > 0 ? `${playbookSummary.setupInStreak.abbr} · ${playbookSummary.setupInStreak.currentStreak}W` : "—", color: "var(--be)" },
            { icon: "⭐", label: "Mejor A+",       text: `${playbookSummary.bestAplus.abbr} · ${playbookSummary.bestAplus.aplusRate.toFixed(2)}%`, color: "var(--accent)" },
          ].map(({ icon, label, text, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)]">
              <span className="text-sm">{icon}</span>
              <span className="text-[10px] text-[var(--ink-3)] uppercase tracking-wider font-semibold">{label}:</span>
              <span className="text-[12px] font-mono font-bold" style={{ color }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Playbook · rendimiento por setup</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">Métricas agregadas desde tu registro de trades.</p>
          </div>
        </div>
        {setupStats.length === 0 ? (
          <p className="text-center text-[var(--ink-3)] text-sm py-8">Sin setups registrados. Crea setups en la sección Playbook.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {setupStats.map(s => {
              const win       = s.winRate >= 50
              const lineColor = win ? "#22c55e" : "#e05555"
              const W = 240, H = 64
              const max   = Math.max(...s.equityCurve)
              const min   = Math.min(...s.equityCurve)
              const range = max - min || 1
              const pts   = s.equityCurve.map((v, i) => ({
                x: (i / (s.equityCurve.length - 1)) * W,
                y: H - 6 - ((v - min) / range) * (H - 16),
              }))
              const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
              const areaPath = linePath + ` L${W},${H} L0,${H} Z`
              const fillId   = `pf-${s.abbr}`
              return (
                <div key={s.setupId}
                  className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden cursor-pointer hover:border-[var(--line-2)] transition-colors"
                  style={{ background: "var(--panel-2)" }}>
                  <div className="flex items-center gap-2.5 p-3 pb-2">
                    <span className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: s.color }}>{s.abbr}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{s.trades} trades</p>
                    </div>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 64 }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={lineColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#${fillId})`} />
                    <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.8"
                      strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  <div className="px-3 pt-2 pb-1 grid grid-cols-3 gap-1">
                    {[
                      ["Win", `${s.winRate}%`, win ? "var(--win)" : "var(--loss)"],
                      ["Avg R", `${s.avgR > 0 ? "+" : ""}${s.avgR.toFixed(2)}`, s.avgR > 0 ? "var(--win)" : "var(--loss)"],
                      ["Cum",  `${s.cumR > 0 ? "+" : ""}${s.cumR.toFixed(1)}R`, s.cumR > 0 ? "var(--win)" : "var(--loss)"],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <p className="text-[9px] text-[var(--ink-3)] uppercase tracking-wider">{l}</p>
                        <p className="text-[13px] font-mono font-bold" style={{ color: c as string }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-2.5 flex justify-between text-[10px] text-[var(--ink-3)]">
                    <span>P&amp;L: <span className={s.netPnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"}>
                      {s.netPnl >= 0 ? "+" : ""}${Math.abs(s.netPnl).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Setup × Sesión · win rate</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">Identifica el contexto donde cada setup performa mejor.</p>
          {sessionGrid.length === 0 ? (
            <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin datos suficientes</p>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "180px repeat(4, 1fr)" }}>
              <div />
              {["NY","LDN CL","LONDON","ASIA"].map(s => (
                <div key={s} className="text-center text-[9px] font-bold text-[var(--ink-3)] uppercase tracking-wider pb-1">{s}</div>
              ))}
              {sessionGrid.flatMap(row => [
                <div key={`${row.setup}-label`} className="flex items-center gap-2 py-1">
                  <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ background: row.color }}>{row.abbr}</span>
                  <span className="text-[11px] text-[var(--ink-2)] truncate">{row.name}</span>
                </div>,
                ...[row.nyam, row.nypm, row.london, row.asia].map((pct, ci) => {
                  if (pct === null) return (
                    <div key={`${row.setup}-${ci}`} className="rounded-[6px] flex items-center justify-center py-2 text-[12px] font-mono font-bold text-[var(--ink-3)]"
                      style={{ background: "var(--chip)" }}>—</div>
                  )
                  const { bg, text } = sessionCellColor(pct)
                  return (
                    <div key={`${row.setup}-${ci}`} className="rounded-[6px] flex items-center justify-center py-2 text-[12px] font-mono font-bold"
                      style={{ background: bg, color: text }}>
                      {pct}%
                    </div>
                  )
                }),
              ])}
            </div>
          )}
        </div>

        {directionStats.length > 0 && (
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
            <p className="text-[13px] font-semibold text-[var(--ink)] mb-0.5">Rendimiento por dirección</p>
            <p className="text-[11px] text-[var(--ink-3)] mb-4">Long vs Short por setup · solo setups con ambas direcciones.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[var(--ink-3)] text-[11px] uppercase tracking-wider">
                    <th className="text-left pb-2 font-semibold">Setup</th>
                    <th className="text-right pb-2 font-semibold">Long</th>
                    <th className="text-right pb-2 font-semibold">Long WR%</th>
                    <th className="text-right pb-2 font-semibold">Long avgR</th>
                    <th className="text-right pb-2 font-semibold">Short</th>
                    <th className="text-right pb-2 font-semibold">Short WR%</th>
                    <th className="text-right pb-2 font-semibold">Short avgR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {directionStats.map(d => {
                    const setup = setupStats.find(s => s.setupId === d.setupId)
                    return (
                      <tr key={d.setupId}>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: setup?.color ?? "#4f6ef7" }}>{setup?.abbr ?? "?"}</span>
                            <span className="text-[var(--ink)]">{setup?.name ?? d.setupId}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono text-[var(--ink-3)]">{d.longCount}</td>
                        <td className="py-2 text-right font-mono font-bold" style={{ color: d.longWr >= 50 ? "var(--win)" : "var(--loss)" }}>{d.longWr.toFixed(2)}%</td>
                        <td className="py-2 text-right font-mono font-bold" style={{ color: d.longAvgR >= 0 ? "var(--win)" : "var(--loss)" }}>{d.longAvgR.toFixed(4)}R</td>
                        <td className="py-2 text-right font-mono text-[var(--ink-3)]">{d.shortCount}</td>
                        <td className="py-2 text-right font-mono font-bold" style={{ color: d.shortWr >= 50 ? "var(--win)" : "var(--loss)" }}>{d.shortWr.toFixed(2)}%</td>
                        <td className="py-2 text-right font-mono font-bold" style={{ color: d.shortAvgR >= 0 ? "var(--win)" : "var(--loss)" }}>{d.shortAvgR.toFixed(4)}R</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">A+ Checklist · cumplimiento</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-5">% de trades con tag A+ por setup.</p>
          <div className="flex flex-col gap-4">
            {setupStats.slice(0, 6).map(s => {
              const pct   = s.trades > 0 ? (s.aplusCount / s.trades * 100) : 0
              const color = checklistColor(pct)
              return (
                <div key={s.setupId}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ background: s.color }}>{s.abbr}</span>
                      <span className="text-[12px] text-[var(--ink)]">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold" style={{ color }}>{pct.toFixed(2)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct.toFixed(2)}%`, background: color }} />
                  </div>
                </div>
              )
            })}
            {setupStats.length === 0 && <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin setups</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   PAGE
═══════════════════════════════════════════ */
export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("portfolio")

  const { data: stats }    = trpc.trades.dashboardStats.useQuery()
  const { data: accounts = [] } = trpc.accounts.list.useQuery()

  if (!stats) {
    return (
      <div>
        <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
        <div className="flex items-center justify-center h-64 text-[var(--ink-3)] text-sm">Cargando…</div>
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
        />
      )}
      {tab === "disciplina" && (
        <TabDisciplina
          kpis={stats.kpis}
          discipline={stats.discipline}
        />
      )}
      {tab === "playbook" && (
        <TabPlaybook
          setupStats={stats.setupStats}
          sessionMatrix={stats.sessionMatrix}
          directionStats={stats.directionStats}
        />
      )}
    </div>
  )
}

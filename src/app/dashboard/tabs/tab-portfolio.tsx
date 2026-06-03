"use client"

import { useMemo } from "react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Target, BarChart2, CheckCircle2, Percent, Activity, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/ui/kpi-card"
import { Card } from "../components/card"
import { ChartTooltip } from "../components/chart-tooltip"
import { PropFirmRules } from "../components/prop-firm-rules"
import { TYPE_META, fmtDate } from "../components/shared"
import { GoalProgressWidget } from "../components/goal-progress-widget"
import type { RouterOutputs } from "@/server/trpc/root"

type DashboardStats = RouterOutputs["trades"]["dashboardStats"]
type AccountMeta    = RouterOutputs["accounts"]["list"][number]

type Period = "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"
const PERIODS: Period[] = ["7d", "1M", "3M", "6M", "1Y", "ALL"]

export function TabPortfolio({
  kpis, pnlByDate, propFirmStatus, accountStats, accounts, period, onPeriodChange,
}: {
  kpis:           DashboardStats["kpis"]
  pnlByDate:      DashboardStats["pnlByDate"]
  propFirmStatus: DashboardStats["propFirmStatus"]
  accountStats:   DashboardStats["accountStats"]
  accounts:       AccountMeta[]
  period:         Period
  onPeriodChange: (p: Period) => void
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
      <div className="flex justify-end">
        <div className="flex gap-1 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] p-0.5">
          {PERIODS.map(p => (
            <button key={p} onClick={() => onPeriodChange(p)}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold rounded-[4px] transition-colors",
                period === p ? "bg-[var(--accent)] text-white" : "text-[var(--ink-3)] hover:text-[var(--ink)]",
              )}>
              {p}
            </button>
          ))}
        </div>
      </div>
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

      <GoalProgressWidget kpis={kpis} weeklyTradesCount={kpis.tradesCountWeek} />

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

"use client"

import { useState, useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import { SimpleTable } from "@/components/ui/data-table"
import { Card } from "../components/card"
import { ChartTooltip } from "../components/chart-tooltip"
import { TYPE_META, fmtDate } from "../components/shared"
import type { RouterOutputs } from "@/server/trpc/root"

type DashboardStats = RouterOutputs["trades"]["dashboardStats"]
type AccountMeta    = RouterOutputs["accounts"]["list"][number]

const TRADE_FILTERS = ["Todos", "A+", "Plan seguido", "Off-plan", "Con violación"]

type Period = "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"
const PERIODS: Period[] = ["7d", "1M", "3M", "6M", "1Y", "ALL"]

export function TabOperador({
  kpis, accountStats, equityCurve, sessionStats, pnlBySymbol, hourStats, recentTrades, executionStats, accounts, period, onPeriodChange,
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
  period:         Period
  onPeriodChange: (p: Period) => void
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [tradeFilter, setTradeFilter] = useState("Todos")

  const accountCards = useMemo(() => {
    return accountStats.map(s => {
      const a    = accounts.find(acc => acc.id === s.accountId)
      const meta = TYPE_META[a?.type ?? "PERSONAL"] ?? { color: "#6b7280", label: "—" }
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
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="balance" name="Balance" stroke="var(--accent)" strokeWidth={2.5}
                  fill="url(#gradBal)" dot={false} activeDot={{ r: 5, fill: "var(--accent)", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[var(--ink-3)] text-sm">Sin suficientes datos para la curva de equidad</div>
          )}
          <div className="flex gap-5 mt-1 pt-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-px inline-block" style={{ background: "var(--accent)" }} />
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
                className="text-left rounded-[var(--radius-sm)] p-3 border transition-[color,background-color,border-color,box-shadow,transform,opacity]"
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
        <SimpleTable
          data={filteredTrades}
          getRowKey={(t) => t.id}
          empty="Sin trades"
          columns={[
            { key: "symbol", header: "Símbolo · Setup", width: "minmax(150px, 2fr)", render: (t) => (
              <div className="flex items-center gap-2">
                <span className={cn("text-base leading-none", t.direction === "LONG" ? "text-[var(--win)]" : "text-[var(--loss)]")}>{t.direction === "LONG" ? "↑" : "↓"}</span>
                <div>
                  <p className="font-mono font-bold text-[var(--ink)] text-sm">{t.symbol}<span className="font-sans font-normal text-[var(--ink-3)] text-xs ml-1">· {t.direction}</span></p>
                  <p className="text-[10px] text-[var(--ink-3)]">{t.setupName ?? "—"}</p>
                </div>
              </div>
            ) },
            { key: "r", header: "R", align: "right", width: "minmax(60px, 0.7fr)", render: (t) => <span className={cn("font-mono font-bold text-sm", (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{(t.rMultiple ?? 0) >= 0 ? "+" : ""}{(t.rMultiple ?? 0).toFixed(2)}R</span> },
            { key: "pnl", header: "P&L Neto", align: "right", render: (t) => <span className={cn("font-mono font-bold text-sm", t.pnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{t.pnl >= 0 ? "+" : "-"}${Math.abs(t.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            { key: "session", header: "Sesión · Tags", width: "minmax(120px, 1.4fr)", render: (t) => (
              <div>
                <p className="text-xs text-[var(--ink-2)] mb-1">{t.session ?? "—"}</p>
                <div className="flex gap-1 flex-wrap">
                  {t.tags.map(tag => <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: tag === "A+" ? "var(--accent-soft)" : "var(--chip)", color: tag === "A+" ? "var(--accent)" : "var(--ink-2)" }}>{tag}</span>)}
                </div>
              </div>
            ) },
            { key: "date", header: "Fecha", width: "minmax(80px, 0.9fr)", render: (t) => <span className="text-xs text-[var(--ink-3)]">{fmtDate(t.date)}</span> },
          ]}
        />
      </div>

      {/* ── Rendimiento por sesión ── */}
      <Card title="Rendimiento por sesión">
        <SimpleTable
          data={sessionStats}
          getRowKey={(s) => s.session}
          empty="Sin datos de sesiones"
          columns={[
            { key: "session", header: "Sesión", width: "minmax(120px, 2fr)", render: (s) => <span className="text-sm text-[var(--ink)]">{s.session}</span> },
            { key: "trades", header: "Trades", align: "right", render: (s) => <span className="font-mono text-sm text-[var(--ink-2)]">{s.trades}</span> },
            { key: "winRate", header: "Win %", align: "right", render: (s) => <span className={cn("font-mono text-sm font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.winRate.toFixed(1)}%</span> },
            { key: "avgR", header: "Avg R", align: "right", render: (s) => <span className={cn("font-mono text-sm font-semibold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.avgR > 0 ? "+" : ""}{s.avgR.toFixed(2)}R</span> },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="P&L por símbolo" sub="Rendimiento neto acumulado por instrumento">
          <SimpleTable
            data={pnlBySymbol}
            getRowKey={(s) => s.symbol}
            density="compact"
            empty="Sin datos"
            columns={[
              { key: "symbol", header: "Símbolo", width: "minmax(80px, 1.4fr)", render: (s) => <span className="font-mono font-bold text-sm text-[var(--ink)]">{s.symbol}</span> },
              { key: "trades", header: "Trades", align: "right", render: (s) => <span className="font-mono text-sm text-[var(--ink-2)]">{s.trades}</span> },
              { key: "winRate", header: "Win %", align: "right", render: (s) => <span className={cn("font-mono text-sm font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.winRate.toFixed(2)}%</span> },
              { key: "pnl", header: "Net P&L", align: "right", render: (s) => <span className={cn("font-mono text-sm font-semibold", s.pnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.pnl >= 0 ? "+" : "-"}${Math.abs(s.pnl).toFixed(2)}</span> },
            ]}
          />
        </Card>

        <Card title="Horario óptimo" sub="Por hora de apertura · avg R desc.">
          <SimpleTable
            data={hourStats.slice(0, 8)}
            getRowKey={(h) => String(h.hour)}
            density="compact"
            empty="Sin datos de openTime"
            columns={[
              { key: "hour", header: "Hora", width: "minmax(70px, 1.2fr)", render: (h) => <span className="font-mono font-bold text-sm text-[var(--ink)]">{String(h.hour).padStart(2, "0")}:00</span> },
              { key: "trades", header: "Trades", align: "right", render: (h) => <span className="font-mono text-sm text-[var(--ink-2)]">{h.trades}</span> },
              { key: "winRate", header: "Win %", align: "right", render: (h) => <span className={cn("font-mono text-sm font-semibold", h.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{h.winRate.toFixed(2)}%</span> },
              { key: "avgR", header: "Avg R", align: "right", render: (h) => <span className={cn("font-mono text-sm font-semibold", h.avgR >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{h.avgR >= 0 ? "+" : ""}{h.avgR.toFixed(4)}R</span> },
            ]}
          />
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
            { label: "Riesgo Planificado prom.", value: avgPlannedRisk   != null ? `$${avgPlannedRisk.toFixed(2)}`   : "—", sub: "riesgo en $ al abrir el trade"  },
            { label: "Reward Planificado prom.", value: avgPlannedReward != null ? `$${avgPlannedReward.toFixed(2)}` : "—", sub: "objetivo en $ al abrir el trade" },
            { label: "Ratio Reward/Riesgo",      value: riskRewardRatio  != null ? riskRewardRatio.toFixed(4)        : "—", sub: "objetivo / riesgo planificado"   },
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

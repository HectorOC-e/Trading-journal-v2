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
import { TrendingUp, TrendingDown, Target, BarChart2, Shield, CheckCircle2, Percent, Activity, BookOpen, Award } from "lucide-react"
import { calcSharpeRatio, getISOWeekKey } from "@/lib/formulas"

type Tab = "portfolio" | "operador" | "disciplina" | "playbook"

const TABS = [
  { value: "portfolio",  label: "Portfolio" },
  { value: "operador",   label: "Operador" },
  { value: "disciplina", label: "Disciplina" },
  { value: "playbook",   label: "Playbook" },
]

/* ── TYPE_META ── */
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

/* ── Card wrapper ── */
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

/* ── KPI card ── */
function KpiCard({ label, value, sub, color, delta, icon }: {
  label: string; value: string; sub: string; color?: string; delta?: string; icon?: React.ReactNode
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-5 py-4 flex flex-col gap-1.5">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          {label}
        </p>
        {icon && <span style={{ color: "var(--ink-3)", opacity: 0.65 }}>{icon}</span>}
      </div>
      <p style={{ fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: color ?? "var(--accent)", lineHeight: 1 }}>
        {value}
      </p>
      <div className="flex items-center gap-2">
        <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</p>
        {delta && (
          <span style={{ fontSize: 10, fontWeight: 600, color: delta.startsWith("+") ? "var(--win)" : "var(--loss)" }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Tooltip ── */
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

/* ── Sparkline con área de relleno ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Sparkline({ data, color, win }: { data: number[]; color: string; win: boolean }) {
  const W = 200, H = 48
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pad = 4

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`

  const fillId = `fill-${color.replace(/[^a-z0-9]/gi, "")}-${win ? "w" : "l"}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 48 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   PROP FIRM RULES WIDGET
═══════════════════════════════════════════ */
function RuleBar({ pct, label, value }: { pct: number; label: string; value: string }) {
  const color = pct >= 80 ? "var(--loss)" : pct >= 60 ? "var(--be)" : "#4f6ef7"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[var(--ink-2)]">{label}</span>
        <span className="text-[11px] font-mono font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

type PropAccountItem = {
  id: string
  name: string
  status: "OK" | "ALERTA"
  drawdownPct: number
  dailyLossPct: number
  tradesUsed: number
  tradesMax: number
  symbols: string
}

function PropFirmRules({ propAccounts }: { propAccounts: PropAccountItem[] }) {
  if (propAccounts.length === 0) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
      <p className="text-[13px] font-semibold text-[var(--ink)]">Reglas Prop Firm · progreso</p>
      <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">
        Risk engine evalúa estos límites antes de aceptar cada nuevo trade.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {propAccounts.map(a => (
          <div key={a.id}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] p-4 flex flex-col gap-3"
            style={{ borderLeft: `3px solid ${a.status === "OK" ? "var(--win)" : "var(--loss)"}` }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{a.name}</p>
              <span className="text-[10px] font-bold tracking-wider"
                style={{ color: a.status === "OK" ? "var(--win)" : "var(--loss)" }}>
                {a.status}
              </span>
            </div>
            {/* Bars */}
            <RuleBar label="Max drawdown total" value={`${a.drawdownPct.toFixed(1)}%`} pct={a.drawdownPct} />
            <RuleBar label="Pérdida diaria"      value={`${a.dailyLossPct.toFixed(1)}%`} pct={a.dailyLossPct} />
            {/* Trades counter */}
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
            {/* Symbols */}
            <p className="text-[10px] text-[var(--ink-3)]">
              Símbolos permitidos: <span className="text-[var(--ink-2)] font-medium">{a.symbols || "—"}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB PORTFOLIO
═══════════════════════════════════════════ */
const HEAT_COLORS: Record<string, string> = {
  "null": "var(--panel-2)",
  "0": "var(--win)",
  "1": "var(--be)",
  "2": "var(--loss)",
}

type Trade = {
  id: string
  symbol: string
  direction: string
  status: string
  pnl: number | null
  rMultiple: number | null
  date: string
  session: string | null
  tags: string[]
  setupId: string | null
  accountId: string
  setup: { name: string; abbreviation: string; color?: string } | null
  account: {
    id: string
    name: string
    type: string
    initialBalance: number
    ddDailyPct: number | null
    ddTotalPct: number | null
    maxTradesPerDay: number | null
    allowedSymbols: string[]
  } | null
  openTime: string | null
  closeTime: string | null
  entry: number | null
  stop: number | null
  target: number | null
  size: number | null
  createdAt: string
}

type AccountRow = {
  id: string
  name: string
  type: string
  initialBalance: number | string
  ddDailyPct: number | null | string
  ddTotalPct: number | null | string
  maxTradesPerDay: number | null
  allowedSymbols: string[]
  status: string
}

function TabPortfolio({ closedTrades, accounts }: { closedTrades: Trade[]; accounts: AccountRow[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const nowMonth = new Date()
  const monthStart = new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1).toISOString().slice(0, 10)

  const netPnl = useMemo(() => closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0), [closedTrades])
  const wins = useMemo(() => closedTrades.filter(t => (t.pnl ?? 0) > 0).length, [closedTrades])
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : "0.0"
  const avgR = useMemo(() => {
    const rs = closedTrades.filter(t => t.rMultiple != null)
    return rs.length > 0 ? rs.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / rs.length : 0
  }, [closedTrades])

  const grossWin = useMemo(() => closedTrades.filter(t => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0), [closedTrades])
  const grossLoss = useMemo(() => Math.abs(closedTrades.filter(t => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0)), [closedTrades])
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0

  // Sharpe ratio (mean R / sample stdDev R — Bessel correction n-1)
  const sharpe = useMemo(() => {
    const rs = closedTrades.filter(t => t.rMultiple != null).map(t => t.rMultiple!)
    return calcSharpeRatio(rs)
  }, [closedTrades])

  // Expectancy in $
  const expectancyDollar = useMemo(() => {
    if (closedTrades.length === 0) return null
    const winsT   = closedTrades.filter(t => (t.pnl ?? 0) > 0)
    const lossesT = closedTrades.filter(t => (t.pnl ?? 0) < 0)
    const avgWin  = winsT.length   > 0 ? winsT.reduce((s, t) => s + (t.pnl ?? 0), 0)   / winsT.length   : 0
    const avgLoss = lossesT.length > 0 ? Math.abs(lossesT.reduce((s, t) => s + (t.pnl ?? 0), 0) / lossesT.length) : 0
    const wr = winsT.length / closedTrades.length
    const lr = lossesT.length / closedTrades.length
    return avgWin * wr - avgLoss * lr
  }, [closedTrades])

  // Best / worst day
  const { bestDay, worstDay } = useMemo(() => {
    const byDate: Record<string, number> = {}
    for (const t of closedTrades) byDate[t.date] = (byDate[t.date] ?? 0) + (t.pnl ?? 0)
    const entries = Object.entries(byDate)
    if (entries.length === 0) return { bestDay: null, worstDay: null }
    const best  = entries.reduce((a, b) => b[1] > a[1] ? b : a)
    const worst = entries.reduce((a, b) => b[1] < a[1] ? b : a)
    return { bestDay: { date: best[0], pnl: best[1] }, worstDay: { date: worst[0], pnl: worst[1] } }
  }, [closedTrades])

  // Current consecutive win/loss streak
  const streak = useMemo(() => {
    const sorted = [...closedTrades].sort((a, b) => b.date.localeCompare(a.date))
    if (sorted.length === 0) return null
    const first = sorted[0].pnl ?? 0
    if (first === 0) return null
    const isWin = first > 0
    let count = 0
    for (const t of sorted) {
      const p = t.pnl ?? 0
      if (isWin ? p > 0 : p < 0) count++
      else break
    }
    return { count, isWin }
  }, [closedTrades])

  // Donut: allocation by account initialBalance
  const totalInitial = useMemo(() => accounts.reduce((s, a) => s + Number(a.initialBalance), 0), [accounts])
  const donutData = useMemo(() => accounts.map(a => {
    const meta = TYPE_META[a.type] ?? { color: "#6b7280" }
    const pct = totalInitial > 0 ? (Number(a.initialBalance) / totalInitial) * 100 : 0
    return { name: a.name, value: parseFloat(pct.toFixed(1)), color: meta.color }
  }), [accounts, totalInitial])

  // Bar chart: group by date + accountId (last 15 sessions)
  const barData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {}
    for (const t of closedTrades) {
      if (!byDate[t.date]) byDate[t.date] = {}
      const acctName = t.account?.name ?? t.accountId
      byDate[t.date][acctName] = (byDate[t.date][acctName] ?? 0) + (t.pnl ?? 0)
    }
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-15)
    return sorted.map(([date, vals]) => ({ date: fmtDate(date), ...vals }))
  }, [closedTrades])

  const barAccountNames = useMemo(() => {
    const names = new Set<string>()
    for (const t of closedTrades) names.add(t.account?.name ?? t.accountId)
    return Array.from(names)
  }, [closedTrades])

  // Prop firm accounts
  const propAccounts = useMemo((): PropAccountItem[] => {
    return accounts
      .filter(a => a.type === "PROP_FIRM" || a.type === "DEMO_PROP")
      .map(a => {
        const acctTrades = closedTrades.filter(t => t.accountId === a.id)
        const balance = Number(a.initialBalance)

        // Peak drawdown
        let cum = 0, peak = 0, maxDd = 0
        for (const t of [...acctTrades].sort((x, y) => x.date.localeCompare(y.date))) {
          cum += (t.pnl ?? 0)
          if (cum > peak) peak = cum
          const dd = peak - cum
          if (dd > maxDd) maxDd = dd
        }
        const ddTotalLimit = Number(a.ddTotalPct ?? 5)
        const ddPctUsed = balance > 0 && ddTotalLimit > 0
          ? (maxDd / balance) / (ddTotalLimit / 100) * 100
          : 0

        // Daily loss
        const todayTrades = acctTrades.filter(t => t.date === today)
        const todayLoss = Math.abs(Math.min(0, todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)))
        const ddDailyLimit = Number(a.ddDailyPct ?? 1)
        const dailyLossPct = balance > 0 && ddDailyLimit > 0
          ? (todayLoss / balance) / (ddDailyLimit / 100) * 100
          : 0

        const tradesUsed = todayTrades.length
        const tradesMax = a.maxTradesPerDay ?? 0
        const status: "OK" | "ALERTA" = ddPctUsed >= 70 || dailyLossPct >= 80 ? "ALERTA" : "OK"

        return {
          id: a.id,
          name: a.name,
          status,
          drawdownPct: parseFloat(ddPctUsed.toFixed(1)),
          dailyLossPct: parseFloat(dailyLossPct.toFixed(1)),
          tradesUsed,
          tradesMax,
          symbols: (a.allowedSymbols as string[]).join(", "),
        }
      })
  }, [accounts, closedTrades, today])

  // Accounts table
  const accountsWithStats = useMemo(() => {
    return accounts.map(a => {
      const acctTrades = closedTrades.filter(t => t.accountId === a.id)
      const monthTrades = acctTrades.filter(t => t.date >= monthStart)
      const pnlMonth = monthTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const acctWins = acctTrades.filter(t => (t.pnl ?? 0) > 0).length
      const wr = acctTrades.length > 0 ? ((acctWins / acctTrades.length) * 100).toFixed(2) : "0.00"
      const netPnlAcct = acctTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const balance = Number(a.initialBalance) + netPnlAcct

      // Drawdown
      let cum = 0, peak = 0, maxDd = 0
      for (const t of [...acctTrades].sort((x, y) => x.date.localeCompare(y.date))) {
        cum += (t.pnl ?? 0)
        if (cum > peak) peak = cum
        const dd = peak - cum
        if (dd > maxDd) maxDd = dd
      }
      const ddPct = Number(a.initialBalance) > 0 ? (maxDd / Number(a.initialBalance)) * 100 : 0
      return { ...a, balance, pnlMonth, wr, ddPct }
    })
  }, [accounts, closedTrades, monthStart])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Net P&L total"
          value={`${netPnl >= 0 ? "+" : "-"}$${Math.abs(netPnl).toFixed(2)}`}
          sub={`${closedTrades.length} operaciones cerradas`}
          color={netPnl >= 0 ? "var(--win)" : "var(--loss)"}
          icon={netPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} />
        <KpiCard label="Profit Factor"
          value={pf === 999 ? "∞" : pf.toFixed(4)}
          sub="todas las cuentas"
          icon={<Activity size={15} />} />
        <KpiCard label="Win Rate"
          value={`${(closedTrades.length > 0 ? (wins / closedTrades.length * 100) : 0).toFixed(2)}%`}
          sub={`${wins} / ${closedTrades.length} operaciones`}
          icon={<Percent size={15} />} />
        <KpiCard label="Avg R"
          value={`${avgR >= 0 ? "+" : ""}${avgR.toFixed(4)}R`}
          sub="promedio rMultiple"
          color={avgR >= 0 ? "var(--win)" : "var(--loss)"}
          icon={<Target size={15} />} />
        <KpiCard label="Sharpe Ratio"
          value={sharpe != null ? sharpe.toFixed(4) : "—"}
          sub="avgR / desv. estándar R"
          color={sharpe != null && sharpe >= 1 ? "var(--win)" : sharpe != null && sharpe < 0 ? "var(--loss)" : undefined}
          icon={<BarChart2 size={15} />} />
        <KpiCard label="Expectancy $"
          value={expectancyDollar != null ? `${expectancyDollar >= 0 ? "+" : "-"}$${Math.abs(expectancyDollar).toFixed(2)}` : "—"}
          sub="por trade promedio"
          color={expectancyDollar != null ? (expectancyDollar >= 0 ? "var(--win)" : "var(--loss)") : undefined}
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
        {streak && (
          <KpiCard label="Racha actual"
            value={`${streak.count}${streak.isWin ? "W" : "L"}`}
            sub={streak.isWin ? "victorias consecutivas" : "pérdidas consecutivas"}
            color={streak.isWin ? "var(--win)" : "var(--loss)"}
            icon={<Award size={15} />} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Donut */}
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

        {/* Bar chart */}
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

      {/* Prop Firm rules progress */}
      <PropFirmRules propAccounts={propAccounts} />

      {/* Accounts table */}
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
              {accountsWithStats.map(a => (
                <tr key={a.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-3 font-medium text-[var(--ink)] text-sm">{a.name}</td>
                  <td className="py-3 font-mono text-sm text-[var(--ink)]">${a.balance.toFixed(2)}</td>
                  <td className={cn("py-3 font-mono text-sm font-semibold", a.pnlMonth >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {a.pnlMonth >= 0 ? "+" : "-"}${Math.abs(a.pnlMonth).toFixed(2)}
                  </td>
                  <td className="py-3 font-mono text-sm text-[var(--ink)]">{a.wr}%</td>
                  <td className={cn("py-3 font-mono text-sm", a.ddPct > 0 ? "text-[var(--loss)]" : "text-[var(--ink-3)]")}>
                    {a.ddPct > 0 ? `-${a.ddPct.toFixed(1)}%` : "0.0%"}
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
              {accountsWithStats.length === 0 && (
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

function TabOperador({ allTrades, closedTrades, accounts }: {
  allTrades: Trade[]; closedTrades: Trade[]; accounts: AccountRow[]
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [tradeFilter, setTradeFilter] = useState("Todos")
  const today = new Date().toISOString().slice(0, 10)

  // Account cards
  const accountCards = useMemo(() => {
    return accounts.map(a => {
      const meta = TYPE_META[a.type] ?? { color: "#6b7280", label: a.type, icon: "📊" }
      const acctTrades = closedTrades.filter(t => t.accountId === a.id)
      const netPnl = acctTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const balance = Number(a.initialBalance) + netPnl
      const todayPnl = closedTrades
        .filter(t => t.accountId === a.id && t.date === today)
        .reduce((s, t) => s + (t.pnl ?? 0), 0)
      return { ...a, balance, deltaToday: todayPnl, color: meta.color, typeLabel: meta.label, typeIcon: meta.icon }
    })
  }, [accounts, closedTrades, today])

  const totalPortfolio = useMemo(() => accountCards.reduce((s, a) => s + a.balance, 0), [accountCards])

  const activeAccountId = selectedAccountId ?? accountCards[0]?.id ?? null
  const activeAccount = accountCards.find(a => a.id === activeAccountId) ?? accountCards[0]

  // Equity curve for selected account
  const equityData = useMemo(() => {
    if (!activeAccountId) return []
    const acctTrades = closedTrades
      .filter(t => t.accountId === activeAccountId)
      .sort((a, b) => a.date.localeCompare(b.date))
    const initialBalance = Number(activeAccount?.initialBalance ?? 0)
    let cum = 0
    const result: { date: string; balance: number }[] = []
    for (const t of acctTrades) {
      cum += (t.pnl ?? 0)
      result.push({ date: fmtDate(t.date), balance: parseFloat((initialBalance + cum).toFixed(2)) })
    }
    return result
  }, [activeAccountId, closedTrades, activeAccount])

  // Recent trades (filtered)
  const recentTrades = useMemo(() => {
    let trades = [...closedTrades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
    if (tradeFilter === "A+") trades = trades.filter(t => t.tags.includes("A+"))
    else if (tradeFilter === "Plan seguido") trades = trades.filter(t => t.setupId != null)
    else if (tradeFilter === "Off-plan") trades = trades.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan"))
    else if (tradeFilter === "Con violación") trades = trades.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan") || t.tags.includes("Revanche"))
    return trades.slice(0, 10)
  }, [closedTrades, tradeFilter])

  // Session performance
  const sessionData = useMemo(() => {
    const bySession: Record<string, { trades: number; wins: number; rSum: number }> = {}
    for (const t of closedTrades) {
      const s = t.session ?? "Sin sesión"
      if (!bySession[s]) bySession[s] = { trades: 0, wins: 0, rSum: 0 }
      bySession[s].trades++
      if ((t.pnl ?? 0) > 0) bySession[s].wins++
      bySession[s].rSum += (t.rMultiple ?? 0)
    }
    return Object.entries(bySession).map(([session, v]) => ({
      session,
      trades: v.trades,
      winRate: v.trades > 0 ? parseFloat(((v.wins / v.trades) * 100).toFixed(1)) : 0,
      avgR: v.trades > 0 ? parseFloat((v.rSum / v.trades).toFixed(2)) : 0,
    })).sort((a, b) => b.trades - a.trades)
  }, [closedTrades])

  const equityStart = equityData[0]?.balance ?? Number(activeAccount?.initialBalance ?? 0)
  const equityEnd = equityData[equityData.length - 1]?.balance ?? Number(activeAccount?.initialBalance ?? 0)
  const equityChangePct = equityStart > 0 ? ((equityEnd - equityStart) / equityStart) * 100 : 0

  // P&L por símbolo
  const pnlBySymbol = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number }> = {}
    for (const t of closedTrades) {
      if (!map[t.symbol]) map[t.symbol] = { pnl: 0, trades: 0, wins: 0 }
      map[t.symbol].pnl    += t.pnl ?? 0
      map[t.symbol].trades++
      if ((t.pnl ?? 0) > 0) map[t.symbol].wins++
    }
    return Object.entries(map)
      .map(([symbol, v]) => ({ symbol, pnl: v.pnl, trades: v.trades, winRate: v.trades > 0 ? v.wins / v.trades * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8)
  }, [closedTrades])

  // Horario óptimo (by openTime hour)
  const horarioOptimo = useMemo(() => {
    const map: Record<number, { trades: number; wins: number; rSum: number }> = {}
    for (const t of closedTrades) {
      if (!t.openTime) continue
      const hour = parseInt(t.openTime.split(":")[0])
      if (isNaN(hour)) continue
      if (!map[hour]) map[hour] = { trades: 0, wins: 0, rSum: 0 }
      map[hour].trades++
      if ((t.pnl ?? 0) > 0) map[hour].wins++
      map[hour].rSum += t.rMultiple ?? 0
    }
    return Object.entries(map)
      .map(([h, v]) => ({
        hora: `${h.padStart(2, "0")}:00`,
        trades: v.trades,
        winRate: v.trades > 0 ? v.wins / v.trades * 100 : 0,
        avgR: v.trades > 0 ? v.rSum / v.trades : 0,
      }))
      .sort((a, b) => b.avgR - a.avgR)
      .slice(0, 8)
  }, [closedTrades])

  // Tiempo promedio en trade (minutos)
  const tiempoPromedio = useMemo(() => {
    const durations: number[] = []
    for (const t of closedTrades) {
      if (!t.openTime || !t.closeTime) continue
      const [oh, om] = t.openTime.split(":").map(Number)
      const [ch, cm] = t.closeTime.split(":").map(Number)
      const mins = (ch * 60 + cm) - (oh * 60 + om)
      if (mins > 0) durations.push(mins)
    }
    if (durations.length === 0) return null
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    return avg
  }, [closedTrades])

  // MAE / MFE estimado
  const maeMfe = useMemo(() => {
    const maes: number[] = [], mfes: number[] = []
    for (const t of closedTrades) {
      if (t.entry == null || t.stop == null || t.target == null || t.size == null) continue
      const risk   = Math.abs(t.entry - t.stop)   * t.size
      const reward = Math.abs(t.target - t.entry) * t.size
      if (risk   > 0) maes.push(risk)
      if (reward > 0) mfes.push(reward)
    }
    const mae = maes.length > 0 ? maes.reduce((a, b) => a + b, 0) / maes.length : null
    const mfe = mfes.length > 0 ? mfes.reduce((a, b) => a + b, 0) / mfes.length : null
    return { mae, mfe }
  }, [closedTrades])

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero: equity number + inline metrics ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-6 py-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-eyebrow mb-2">Equity · {activeAccount?.name ?? "—"}</p>
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

        {/* Equity Curve */}
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
            const active = (selectedAccountId ?? accountCards[0]?.id) === a.id
            return (
              <button key={a.id} onClick={() => setSelectedAccountId(a.id)}
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
                  a.deltaToday > 0 ? "text-[var(--win)]" : a.deltaToday < 0 ? "text-[var(--loss)]" : "text-[var(--ink-3)]")}>
                  {a.deltaToday > 0 ? "+" : ""}{a.deltaToday === 0 ? "0.00" : a.deltaToday.toFixed(2)} USD hoy
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
              {recentTrades.map(t => (
                <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-base leading-none", t.direction === "LONG" ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                        {t.direction === "LONG" ? "↑" : "↓"}
                      </span>
                      <div>
                        <p className="font-mono font-bold text-[var(--ink)] text-sm">
                          {t.symbol}
                          <span className="font-sans font-normal text-[var(--ink-3)] text-xs ml-1">· {t.direction}</span>
                        </p>
                        <p className="text-[10px] text-[var(--ink-3)]">{t.setup?.name ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn("py-3 font-mono font-bold text-sm", (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.rMultiple ?? 0) >= 0 ? "+" : ""}{(t.rMultiple ?? 0).toFixed(2)}R
                  </td>
                  <td className={cn("py-3 font-mono font-bold text-sm", (t.pnl ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${Math.abs(t.pnl ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3">
                    <p className="text-xs text-[var(--ink-2)] mb-1">{t.session ?? "—"}</p>
                    <div className="flex gap-1 flex-wrap">
                      {(t.tags as string[]).map(tag => (
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
              {recentTrades.length === 0 && (
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
              {sessionData.map(s => (
                <tr key={s.session} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-2.5 text-sm text-[var(--ink)]">{s.session}</td>
                  <td className="py-2.5 font-mono text-sm text-[var(--ink-2)]">{s.trades}</td>
                  <td className={cn("py-2.5 font-mono text-sm font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {s.winRate}%
                  </td>
                  <td className={cn("py-2.5 font-mono text-sm font-semibold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {s.avgR > 0 ? "+" : ""}{s.avgR}R
                  </td>
                </tr>
              ))}
              {sessionData.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[var(--ink-3)] text-sm">Sin datos de sesiones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── P&L por símbolo + Horario óptimo ── */}
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
          {horarioOptimo.length === 0 ? (
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
                {horarioOptimo.map(h => (
                  <tr key={h.hora} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                    <td className="py-2 font-mono font-bold text-sm text-[var(--ink)]">{h.hora}</td>
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

      {/* ── Métricas de ejecución ── */}
      <Card title="Métricas de ejecución" sub="Tiempo en posición y riesgo/objetivo planificado">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Tiempo prom. en trade",
              value: tiempoPromedio != null
                ? tiempoPromedio >= 60
                  ? `${Math.floor(tiempoPromedio / 60)}h ${Math.round(tiempoPromedio % 60)}m`
                  : `${tiempoPromedio.toFixed(1)} min`
                : "—",
              sub: "entre openTime y closeTime",
            },
            {
              label: "Riesgo Planificado prom.",
              value: maeMfe.mae != null ? `$${maeMfe.mae.toFixed(2)}` : "—",
              sub: "riesgo en $ al abrir el trade",
            },
            {
              label: "Reward Planificado prom.",
              value: maeMfe.mfe != null ? `$${maeMfe.mfe.toFixed(2)}` : "—",
              sub: "objetivo en $ al abrir el trade",
            },
            {
              label: "Ratio Reward/Riesgo",
              value: maeMfe.mae && maeMfe.mfe ? (maeMfe.mfe / maeMfe.mae).toFixed(4) : "—",
              sub: "objetivo / riesgo planificado",
            },
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
type HeatVal = null | 0 | 1 | 2
const DAYS = ["L","M","X","J","V","S","D"]
const WEEKS = 12

function TabDisciplina({ closedTrades }: { closedTrades: Trade[] }) {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  // Heatmap: last 12 calendar weeks
  const heatmap = useMemo((): HeatVal[][] => {
    // Build a map of date -> severity
    const dateMap: Record<string, HeatVal> = {}
    for (const t of closedTrades) {
      const tags = t.tags as string[]
      const isOffPlan = tags.includes("Impulsivo") || tags.includes("Off-plan")
      const isLoss = (t.pnl ?? 0) < 0
      const current = dateMap[t.date] ?? null
      let severity: HeatVal = 0
      if (isOffPlan) severity = 2
      else if (isLoss) severity = 1
      // Take max severity
      if (current === null) dateMap[t.date] = severity
      else if (severity > current) dateMap[t.date] = severity as HeatVal
    }

    // Build 12-week grid: rows = days of week (Mon=0..Sun=6), cols = weeks (oldest first)
    const grid: HeatVal[][] = DAYS.map(() => Array(WEEKS).fill(null))
    // Find start: 12 weeks ago, Monday
    const endDate = new Date(today)
    // Go to most recent Monday
    const dayOfWeek = (endDate.getDay() + 6) % 7 // Mon=0
    endDate.setDate(endDate.getDate() - dayOfWeek + 6) // Sunday of current week
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
  }, [closedTrades, todayISO])

  // R distribution
  const rDist = useMemo(() => {
    const buckets: Record<string, number> = {
      "-3R": 0, "-2R": 0, "-1R": 0, "0R": 0, "+1R": 0, "+2R": 0, "+3R": 0, "+4R+": 0
    }
    for (const t of closedTrades) {
      const r = t.rMultiple ?? 0
      if (r <= -2.5) buckets["-3R"]++
      else if (r <= -1.5) buckets["-2R"]++
      else if (r <= -0.5) buckets["-1R"]++
      else if (r <= 0.5) buckets["0R"]++
      else if (r <= 1.5) buckets["+1R"]++
      else if (r <= 2.5) buckets["+2R"]++
      else if (r <= 3.5) buckets["+3R"]++
      else buckets["+4R+"]++
    }
    return [
      { r: "-3R",  count: buckets["-3R"],  color: "var(--loss)" },
      { r: "-2R",  count: buckets["-2R"],  color: "var(--loss)" },
      { r: "-1R",  count: buckets["-1R"],  color: "var(--loss)" },
      { r: "0R",   count: buckets["0R"],   color: "var(--be)"   },
      { r: "+1R",  count: buckets["+1R"],  color: "var(--win)"  },
      { r: "+2R",  count: buckets["+2R"],  color: "var(--win)"  },
      { r: "+3R",  count: buckets["+3R"],  color: "var(--win)"  },
      { r: "+4R+", count: buckets["+4R+"], color: "var(--win)"  },
    ]
  }, [closedTrades])

  // Violations
  const violations = useMemo(() => {
    const impulsivoCount = closedTrades.filter(t => (t.tags as string[]).includes("Impulsivo")).length
    const offPlanCount = closedTrades.filter(t => (t.tags as string[]).includes("Off-plan")).length
    const revanCheCount = closedTrades.filter(t => (t.tags as string[]).includes("Revanche")).length
    const noSetupCount = closedTrades.filter(t => !t.setupId).length
    return [
      { rule: "Flag impulsivo manual",    count: impulsivoCount, severity: "mayor" },
      { rule: "Off-plan",                 count: offPlanCount,   severity: "mayor" },
      { rule: "Revanche / revenge trade", count: revanCheCount,  severity: "mayor" },
      { rule: "Sin setup asignado",       count: noSetupCount,   severity: "menor" },
    ].filter(v => v.count > 0)
  }, [closedTrades])

  // Comp data
  const compData = useMemo(() => {
    const planSeguido = closedTrades.filter(t => t.setupId != null && !(t.tags as string[]).includes("Impulsivo") && !(t.tags as string[]).includes("Off-plan")).length
    const offPlan = closedTrades.filter(t => (t.tags as string[]).includes("Impulsivo") || (t.tags as string[]).includes("Off-plan")).length
    const partial = closedTrades.length - planSeguido - offPlan
    return [
      { name: "Plan seguido", value: planSeguido, color: "var(--win)"  },
      { name: "Plan parcial",  value: Math.max(0, partial), color: "var(--be)"  },
      { name: "Off-plan",      value: offPlan,    color: "var(--loss)" },
    ]
  }, [closedTrades])

  const total = closedTrades.length
  const planSeguidoPct = total > 0 ? ((compData[0].value / total) * 100).toFixed(2) : "0.00"
  const sinViolacionPct = total > 0 ? (((total - violations.reduce((s, v) => s + v.count, 0)) / total) * 100).toFixed(2) : "0.00"
  const disciplineScore = total > 0 ? ((compData[0].value / total) * 100).toFixed(2) : "0.00"

  // Today's trades count
  const todayTradesCount = closedTrades.filter(t => t.date === todayISO).length

  // Costo de indisciplina
  const costoIndisciplina = useMemo(() =>
    closedTrades
      .filter(t => (t.tags as string[]).includes("Impulsivo") || (t.tags as string[]).includes("Off-plan"))
      .reduce((s, t) => s + (t.pnl ?? 0), 0),
    [closedTrades])

  // Racha de días limpios
  const rachaDiasLimpios = useMemo(() => {
    const tradingDays = [...new Set(closedTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
    let streak = 0
    for (const day of tradingDays) {
      const dayTrades = closedTrades.filter(t => t.date === day)
      const hasViolation = dayTrades.some(t => (t.tags as string[]).includes("Impulsivo") || (t.tags as string[]).includes("Off-plan"))
      if (hasViolation) break
      streak++
    }
    return streak
  }, [closedTrades])

  // A+ vs estándar
  const aplusStats = useMemo(() => {
    const aplus = closedTrades.filter(t => (t.tags as string[]).includes("A+"))
    const std   = closedTrades.filter(t => !(t.tags as string[]).includes("A+"))
    const aplusWr  = aplus.length > 0 ? aplus.filter(t => (t.pnl ?? 0) > 0).length / aplus.length * 100 : null
    const stdWr    = std.length   > 0 ? std.filter(t => (t.pnl ?? 0) > 0).length   / std.length   * 100 : null
    const aplusAvgR = aplus.length > 0 ? aplus.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / aplus.length : null
    const stdAvgR   = std.length   > 0 ? std.reduce((s, t) => s + (t.rMultiple ?? 0), 0)   / std.length   : null
    return { aplusWr, stdWr, aplusAvgR, stdAvgR, aplusCount: aplus.length, stdCount: std.length }
  }, [closedTrades])

  // Score semanal (last 12 ISO weeks)
  const weeklyScore = useMemo(() => {
    const byWeek: Record<string, { plan: number; total: number }> = {}
    for (const t of closedTrades) {
      const d   = new Date(t.date)
      const key = getISOWeekKey(d)
      if (!byWeek[key]) byWeek[key] = { plan: 0, total: 0 }
      byWeek[key].total++
      const isOk = t.setupId != null && !(t.tags as string[]).includes("Impulsivo") && !(t.tags as string[]).includes("Off-plan")
      if (isOk) byWeek[key].plan++
    }
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, v]) => ({ week: week.replace(/^\d{4}-/, ""), score: parseFloat((v.plan / v.total * 100).toFixed(2)) }))
  }, [closedTrades])

  return (
    <div className="flex flex-col gap-4">

      {/* ── New KPI row ── */}
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

      {/* ── Score semanal ── */}
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

      {/* ── DO-NOT-TAKE banner ── */}
      {todayTradesCount >= 3 && (
        <div className="rounded-[var(--radius)] border border-[var(--loss)] px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(180,40,40,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--loss)] flex items-center justify-center text-white text-sm font-bold shrink-0">!</div>
            <div>
              <p className="text-sm font-bold text-[var(--loss)]">DO-NOT-TAKE · {todayTradesCount} trades hoy</p>
              <p className="text-xs text-[var(--ink-3)] mt-0.5">Verifica los límites de tu plan operativo antes de continuar.</p>
            </div>
          </div>
          <button className="text-xs font-semibold text-[var(--ink-3)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-1.5 whitespace-nowrap hover:text-[var(--ink)] transition-colors shrink-0">
            Ver registro →
          </button>
        </div>
      )}

      {/* ── Score + Composición ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score panel */}
        <div className="col-span-2 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-eyebrow mb-3">Discipline Score · acumulado</p>
          <div className="flex items-baseline gap-3 mb-1">
            <p style={{ fontSize: 52, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)", lineHeight: 1 }}>{disciplineScore}</p>
            <p className="text-[var(--ink-3)] text-lg font-mono">/ 100.00</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            {[
              { label: "Sin violación",   value: `${sinViolacionPct}%`, sub: `${total} trades total`,   color: "var(--win)"  },
              { label: "Plan seguido",    value: `${planSeguidoPct}%`,  sub: `${compData[0].value} / ${total}`, color: "#4f6ef7" },
              { label: "Off-plan count",  value: `${compData[2].value}`, sub: "trades off-plan",         color: "var(--loss)" },
            ].map(m => (
              <div key={m.label} className="border-l-2 pl-3" style={{ borderColor: m.color }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-1">{m.label}</p>
                <p className="font-mono font-bold text-[var(--ink)]" style={{ fontSize: 22 }}>{m.value}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Composición donut */}
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

      {/* ── Heatmap ── */}
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

      {/* ── R Distribution + Violations ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Distribución de R · acumulado" sub="Frecuencia de outcomes vs. expectativa.">
          <div className="flex items-end gap-1.5 h-32 mt-2">
            {rDist.map(d => {
              const maxCount = Math.max(...rDist.map(x => x.count), 1)
              const h = (d.count / maxCount) * 100
              return (
                <div key={d.r} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono font-bold text-[var(--ink-3)]">{d.count}</span>
                  <div className="w-full rounded-t-sm transition-all"
                    style={{ height: `${h}%`, background: d.color, minHeight: 4 }} />
                  <span className="text-[9px] text-[var(--ink-3)]">{d.r}</span>
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

type SetupData = {
  id: string
  abbr: string
  name: string
  market: string
  color: string
  trades: number
  wr: number
  avgR: number
  cumR: number
  netPnl: number
  equityCurve: number[]
}

function TabPlaybook({ closedTrades, setups }: {
  closedTrades: Trade[]
  setups: { id: string; name: string; abbreviation: string; market: string; color: string; status: string }[]
}) {
  const setupData = useMemo((): SetupData[] => {
    return setups
      .filter(s => s.status !== "DESCARTADO")
      .map(s => {
        const sTrades = closedTrades.filter(t => t.setupId === s.id)
        const wins = sTrades.filter(t => (t.pnl ?? 0) > 0).length
        const wr = sTrades.length > 0 ? (wins / sTrades.length) * 100 : 0
        const avgR = sTrades.length > 0
          ? sTrades.reduce((sum, t) => sum + (t.rMultiple ?? 0), 0) / sTrades.length
          : 0
        const netPnl = sTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
        const cumR = sTrades.reduce((sum, t) => sum + (t.rMultiple ?? 0), 0)

        // Build equity curve (sorted by date)
        const sorted = [...sTrades].sort((a, b) => a.date.localeCompare(b.date))
        let cum = 0
        const equityCurve = sorted.map(t => { cum += (t.pnl ?? 0); return cum })
        // Pad with at least 2 points for sparkline
        if (equityCurve.length === 0) equityCurve.push(0, 0)
        else if (equityCurve.length === 1) equityCurve.unshift(0)

        return {
          id: s.id,
          abbr: s.abbreviation,
          name: s.name,
          market: s.market,
          color: s.color || "#4f6ef7",
          trades: sTrades.length,
          wr: parseFloat(wr.toFixed(1)),
          avgR: parseFloat(avgR.toFixed(2)),
          cumR: parseFloat(cumR.toFixed(1)),
          netPnl,
          equityCurve,
        }
      })
      .sort((a, b) => b.trades - a.trades)
  }, [closedTrades, setups])

  // Summary chips
  const playbookSummary = useMemo(() => {
    if (setupData.length === 0) return null
    const mostUsed      = setupData.reduce((a, b) => b.trades > a.trades ? b : a)
    const mostProfitable = setupData.reduce((a, b) => b.netPnl > a.netPnl ? b : a)
    // Best A+ rate
    const withAplus = setupData.map(s => {
      const sTrades = closedTrades.filter(t => t.setupId === s.id)
      const aplusCount = sTrades.filter(t => (t.tags as string[]).includes("A+")).length
      const rate = sTrades.length > 0 ? aplusCount / sTrades.length * 100 : 0
      return { ...s, aplusRate: rate }
    })
    const bestAplus = withAplus.reduce((a, b) => b.aplusRate > a.aplusRate ? b : a)
    // Setup en racha (most consecutive recent wins)
    const setupInStreak = setupData.map(s => {
      const sorted = closedTrades.filter(t => t.setupId === s.id).sort((a, b) => b.date.localeCompare(a.date))
      let streak = 0
      for (const t of sorted) {
        if ((t.pnl ?? 0) > 0) streak++
        else break
      }
      return { ...s, streak }
    }).reduce((a, b) => b.streak > a.streak ? b : a)
    return { mostUsed, mostProfitable, bestAplus, setupInStreak }
  }, [setupData, closedTrades])

  // Direction breakdown per setup
  const directionData = useMemo(() => {
    return setupData.filter(s => {
      const sTrades = closedTrades.filter(t => t.setupId === s.id)
      const hasLong  = sTrades.some(t => t.direction === "LONG")
      const hasShort = sTrades.some(t => t.direction === "SHORT")
      return hasLong && hasShort
    }).map(s => {
      const longs  = closedTrades.filter(t => t.setupId === s.id && t.direction === "LONG")
      const shorts = closedTrades.filter(t => t.setupId === s.id && t.direction === "SHORT")
      const wr = (arr: Trade[]) => arr.length > 0 ? arr.filter(t => (t.pnl ?? 0) > 0).length / arr.length * 100 : 0
      const ar = (arr: Trade[]) => arr.length > 0 ? arr.reduce((a, t) => a + (t.rMultiple ?? 0), 0) / arr.length : 0
      return {
        id: s.id, abbr: s.abbr, name: s.name, color: s.color,
        longWr: wr(longs), longAvgR: ar(longs), longCount: longs.length,
        shortWr: wr(shorts), shortAvgR: ar(shorts), shortCount: shorts.length,
      }
    })
  }, [setupData, closedTrades])

  // Session × Setup matrix
  const sessionMatrix = useMemo(() => {
    const sessions = ["New York", "London", "Asia", "London Close"]
    return setupData.slice(0, 6).map(s => {
      const sTrades = closedTrades.filter(t => t.setupId === s.id)
      const bySession: Record<string, { total: number; wins: number }> = {}
      for (const t of sTrades) {
        const sess = t.session ?? "Sin sesión"
        if (!bySession[sess]) bySession[sess] = { total: 0, wins: 0 }
        bySession[sess].total++
        if ((t.pnl ?? 0) > 0) bySession[sess].wins++
      }
      const wr = (sess: string) => {
        const d = bySession[sess]
        return d && d.total > 0 ? parseFloat((d.wins / d.total * 100).toFixed(2)) : null
      }
      return {
        setup: s.id,
        abbr: s.abbr,
        color: s.color,
        name: s.name,
        nyam: wr("New York"),
        nypm: wr("London Close"),
        london: wr("London"),
        asia: wr("Asia"),
      }
    })
  }, [setupData, closedTrades])

  return (
    <div className="flex flex-col gap-4">

      {/* ── Summary chips ── */}
      {playbookSummary && (
        <div className="flex flex-wrap gap-2">
          {[
            { icon: "📊", label: "Más usado",     text: `${playbookSummary.mostUsed.abbr} · ${playbookSummary.mostUsed.trades} trades`, color: "#4f6ef7" },
            { icon: "💰", label: "Más rentable",   text: `${playbookSummary.mostProfitable.abbr} · ${playbookSummary.mostProfitable.netPnl >= 0 ? "+" : "-"}$${Math.abs(playbookSummary.mostProfitable.netPnl).toFixed(2)}`, color: "var(--win)" },
            { icon: "🔥", label: "En racha",        text: playbookSummary.setupInStreak.streak > 0 ? `${playbookSummary.setupInStreak.abbr} · ${playbookSummary.setupInStreak.streak}W` : "—", color: "var(--be)" },
            { icon: "⭐", label: "Mejor A+",        text: `${playbookSummary.bestAplus.abbr} · ${(playbookSummary.bestAplus as typeof playbookSummary.bestAplus & { aplusRate: number }).aplusRate.toFixed(2)}%`, color: "var(--accent)" },
          ].map(({ icon, label, text, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)]">
              <span className="text-sm">{icon}</span>
              <span className="text-[10px] text-[var(--ink-3)] uppercase tracking-wider font-semibold">{label}:</span>
              <span className="text-[12px] font-mono font-bold" style={{ color }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Setup cards ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Playbook · rendimiento por setup</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">Métricas agregadas desde tu registro de trades.</p>
          </div>
        </div>

        {setupData.length === 0 ? (
          <p className="text-center text-[var(--ink-3)] text-sm py-8">Sin setups registrados. Crea setups en la sección Playbook.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {setupData.map(s => {
              const win = s.wr >= 50
              const lineColor = win ? "#22c55e" : "#e05555"
              const W = 240, H = 64
              const max = Math.max(...s.equityCurve)
              const min = Math.min(...s.equityCurve)
              const range = max - min || 1
              const pts = s.equityCurve.map((v, i) => ({
                x: (i / (s.equityCurve.length - 1)) * W,
                y: H - 6 - ((v - min) / range) * (H - 16),
              }))
              const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
              const areaPath = linePath + ` L${W},${H} L0,${H} Z`
              const fillId = `pf-${s.abbr}`
              return (
                <div key={s.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden cursor-pointer hover:border-[var(--line-2)] transition-colors"
                  style={{ background: "var(--panel-2)" }}>
                  <div className="flex items-center gap-2.5 p-3 pb-2">
                    <span className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: s.color }}>{s.abbr}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{s.market || "—"} · {s.trades} trades</p>
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

                  <div className="px-3 pt-2 pb-1 grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {[
                      ["Win", `${s.wr}%`, win ? "var(--win)" : "var(--loss)"],
                      ["Avg R", `${s.avgR > 0 ? "+" : ""}${s.avgR.toFixed(2)}`, s.avgR > 0 ? "var(--win)" : "var(--loss)"],
                      ["Cum", `${s.cumR > 0 ? "+" : ""}${s.cumR.toFixed(1)}R`, s.cumR > 0 ? "var(--win)" : "var(--loss)"],
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

      {/* ── Session matrix + No-data placeholder ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Setup × Sesión · win rate</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">Identifica el contexto donde cada setup performa mejor.</p>

          {sessionMatrix.length === 0 ? (
            <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin datos suficientes</p>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "180px repeat(4, 1fr)" }}>
              <div />
              {["NY","LDN CL","LONDON","ASIA"].map(s => (
                <div key={s} className="text-center text-[9px] font-bold text-[var(--ink-3)] uppercase tracking-wider pb-1">{s}</div>
              ))}
              {sessionMatrix.flatMap(row => [
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

        {/* Rendimiento por dirección */}
        {directionData.length > 0 && (
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
            <p className="text-[13px] font-semibold text-[var(--ink)] mb-0.5">Rendimiento por dirección</p>
            <p className="text-[11px] text-[var(--ink-3)] mb-4">Long vs Short por setup · solo setups con ambas direcciones.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[var(--ink-3)] text-[11px] uppercase tracking-wider">
                    <th className="text-left pb-2 font-semibold">Setup</th>
                    <th className="text-right pb-2 font-semibold">Long trades</th>
                    <th className="text-right pb-2 font-semibold">Long WR%</th>
                    <th className="text-right pb-2 font-semibold">Long avgR</th>
                    <th className="text-right pb-2 font-semibold">Short trades</th>
                    <th className="text-right pb-2 font-semibold">Short WR%</th>
                    <th className="text-right pb-2 font-semibold">Short avgR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {directionData.map(d => (
                    <tr key={d.id}>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: d.color }}>{d.abbr}</span>
                          <span className="text-[var(--ink)]">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono text-[var(--ink-3)]">{d.longCount}</td>
                      <td className="py-2 text-right font-mono font-bold" style={{ color: d.longWr >= 50 ? "var(--win)" : "var(--loss)" }}>{d.longWr.toFixed(2)}%</td>
                      <td className="py-2 text-right font-mono font-bold" style={{ color: d.longAvgR >= 0 ? "var(--win)" : "var(--loss)" }}>{d.longAvgR.toFixed(4)}R</td>
                      <td className="py-2 text-right font-mono text-[var(--ink-3)]">{d.shortCount}</td>
                      <td className="py-2 text-right font-mono font-bold" style={{ color: d.shortWr >= 50 ? "var(--win)" : "var(--loss)" }}>{d.shortWr.toFixed(2)}%</td>
                      <td className="py-2 text-right font-mono font-bold" style={{ color: d.shortAvgR >= 0 ? "var(--win)" : "var(--loss)" }}>{d.shortAvgR.toFixed(4)}R</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* A+ Checklist — static until checklist data is in DB */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">A+ Checklist · cumplimiento</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-5">% de trades con tag A+ por setup.</p>
          <div className="flex flex-col gap-4">
            {setupData.slice(0, 6).map(s => {
              const sTrades = closedTrades.filter(t => t.setupId === s.id)
              const aPlusTrades = sTrades.filter(t => (t.tags as string[]).includes("A+")).length
              const pct = sTrades.length > 0 ? (aPlusTrades / sTrades.length * 100) : 0
              const color = checklistColor(pct)
              return (
                <div key={s.id}>
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
            {setupData.length === 0 && <p className="text-center text-[var(--ink-3)] text-sm py-4">Sin setups</p>}
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

  const { data: allTrades = [] } = trpc.trades.list.useQuery()
  const { data: rawAccounts = [] } = trpc.accounts.list.useQuery()
  const { data: rawSetups = [] } = trpc.setups.list.useQuery()

  // Normalize accounts (Prisma Decimal → number)
  const accounts = useMemo(() => rawAccounts.map(a => ({
    ...a,
    initialBalance: Number(a.initialBalance),
    ddDailyPct: a.ddDailyPct != null ? Number(a.ddDailyPct) : null,
    ddTotalPct: a.ddTotalPct != null ? Number(a.ddTotalPct) : null,
    allowedSymbols: (a.allowedSymbols as string[]) ?? [],
  })), [rawAccounts])

  // Normalize setups
  const setups = useMemo(() => rawSetups.map(s => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    market: s.market ?? "",
    color: s.color ?? "#4f6ef7",
    status: s.status,
  })), [rawSetups])

  // Cast trades to our Trade type
  const trades = allTrades as unknown as Trade[]

  const closedTrades = useMemo(() => trades.filter(t => t.status === "CLOSED"), [trades])

  return (
    <div>
      <TopBar title="Dashboard" subtitle="Vista general de tu portfolio" />
      <FilterBar options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} className="mb-6" />
      {tab === "portfolio"  && <TabPortfolio closedTrades={closedTrades} accounts={accounts} />}
      {tab === "operador"   && <TabOperador allTrades={trades} closedTrades={closedTrades} accounts={accounts} />}
      {tab === "disciplina" && <TabDisciplina closedTrades={closedTrades} />}
      {tab === "playbook"   && <TabPlaybook closedTrades={closedTrades} setups={setups} />}
    </div>
  )
}

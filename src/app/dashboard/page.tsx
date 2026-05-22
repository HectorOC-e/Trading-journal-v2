"use client"

import { useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { FilterBar } from "@/components/ui/filter-bar"
import { TopBar } from "@/components/layout/top-bar"
import { cn } from "@/lib/utils"
import { mockAccounts } from "@/mock-data"

type Tab = "portfolio" | "operador" | "disciplina" | "playbook"

const TABS = [
  { value: "portfolio",  label: "Portfolio" },
  { value: "operador",   label: "Operador" },
  { value: "disciplina", label: "Disciplina" },
  { value: "playbook",   label: "Playbook" },
]

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
function KpiCard({ label, value, sub, color, delta }: {
  label: string; value: string; sub: string; color?: string; delta?: string
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-5 py-4 flex flex-col gap-1.5">
      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: color ?? "var(--accent)", lineHeight: 1 }}>
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
const PROP_ACCOUNTS = [
  {
    name: "FXify 100K · Phase 2",
    status: "OK" as const,
    drawdownPct: 32,
    dailyLossPct: 41,
    tradesUsed: 18,
    tradesMax: 30,
    symbols: "ES, NQ, GC",
  },
  {
    name: "FTMO Swing 50K",
    status: "ALERTA" as const,
    drawdownPct: 71,
    dailyLossPct: 88,
    tradesUsed: 7,
    tradesMax: 15,
    symbols: "FX only",
  },
]

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

function PropFirmRules() {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
      <p className="text-[13px] font-semibold text-[var(--ink)]">Reglas Prop Firm · progreso</p>
      <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">
        Risk engine evalúa estos límites antes de aceptar cada nuevo trade.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {PROP_ACCOUNTS.map(a => (
          <div key={a.name}
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
            <RuleBar label="Max drawdown total" value={`${a.drawdownPct}%`} pct={a.drawdownPct} />
            <RuleBar label="Pérdida diaria"      value={`${a.dailyLossPct}%`} pct={a.dailyLossPct} />
            {/* Trades counter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--ink-2)]">Trades / día</span>
                <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">
                  <span style={{ color: a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--ink)" }}>{a.tradesUsed}</span>
                  <span className="text-[var(--ink-3)]"> / {a.tradesMax}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(a.tradesUsed / a.tradesMax) * 100}%`,
                    background: a.tradesUsed / a.tradesMax >= 0.8 ? "var(--be)" : "var(--win)",
                  }} />
              </div>
            </div>
            {/* Symbols */}
            <p className="text-[10px] text-[var(--ink-3)]">
              Símbolos permitidos: <span className="text-[var(--ink-2)] font-medium">{a.symbols}</span>
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
const DONUT_DATA = [
  { name: "FXify 100K",   value: 31.9, color: "#4f6ef7" },
  { name: "FTMO 50K",     value: 16.1, color: "#22c55e" },
  { name: "IBKR Personal",value: 5.7,  color: "#f59e0b" },
  { name: "Apex Demo",    value: 46.3, color: "#e05555" },
]

const BAR_DATA = [
  { date: "7M",  FXify: 280, FTMO: 150, IBKR: 80 },
  { date: "8M",  FXify: -120, FTMO: 50, IBKR: 0 },
  { date: "11M", FXify: 480, FTMO: 200, IBKR: 100 },
  { date: "12M", FXify: 360, FTMO: 150, IBKR: 50 },
  { date: "13M", FXify: 310, FTMO: 100, IBKR: 0 },
  { date: "14M", FXify: 420, FTMO: 250, IBKR: 120 },
  { date: "15M", FXify: 510, FTMO: 200, IBKR: 80 },
  { date: "18M", FXify: -80, FTMO: 100, IBKR: 0 },
  { date: "19M", FXify: 380, FTMO: 180, IBKR: 60 },
  { date: "20M", FXify: 260, FTMO: 120, IBKR: 40 },
]

function TabPortfolio() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Net P&L total"  value="+$18.4k" sub="30d · todas las cuentas" color="var(--win)" delta="+12.4%" />
        <KpiCard label="Profit Factor"  value="1.84"    sub="30d · todas las cuentas" delta="+0.3 vs sem. ant." />
        <KpiCard label="Win Rate"       value="58%"     sub="134 / 230 operaciones" />
        <KpiCard label="Max Drawdown"   value="-3.4%"   sub="abr 12 · FXify" color="var(--loss)" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Donut */}
        <Card title="Asignación por cuenta" sub="Prop Firm + Personal · Demo excluido">
          <div className="flex items-center gap-6">
            <div style={{ width: 160, flexShrink: 0 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={DONUT_DATA} cx={75} cy={75} innerRadius={50} outerRadius={72}
                    dataKey="value" strokeWidth={2} stroke="var(--panel)">
                    {DONUT_DATA.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              {DONUT_DATA.map((d) => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-[var(--ink)] flex-1">{d.name}</span>
                  <span className="text-[11px] font-mono font-bold text-[var(--ink-2)]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bar chart */}
        <Card title="P&L diario por cuenta" sub="Últimas 10 sesiones · USD">
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={BAR_DATA} barSize={10} barCategoryGap="28%">
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 0 ? `+$${v}` : `-$${Math.abs(v)}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chip)", opacity: 0.5 }} />
              <Bar dataKey="FXify" stackId="a" fill="#4f6ef7" radius={[0,0,0,0]} />
              <Bar dataKey="FTMO"  stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
              <Bar dataKey="IBKR"  stackId="a" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1">
            {[["#4f6ef7","FXify"],["#22c55e","FTMO"],["#f59e0b","IBKR"]].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1.5 text-[10px] text-[var(--ink-3)]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Prop Firm rules progress */}
      <PropFirmRules />

      {/* Accounts table */}
      <Card title="Comparación de cuentas">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["Cuenta","Balance","P&L mes","Win %","Drawdown","Estado"].map(h => (
                <th key={h} className="pb-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockAccounts.map(a => (
              <tr key={a.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                <td className="py-3 font-medium text-[var(--ink)] text-sm">{a.name}</td>
                <td className="py-3 font-mono text-sm text-[var(--ink)]">${a.initialBalance.toLocaleString()}</td>
                <td className="py-3 font-mono text-sm font-semibold text-[var(--win)]">+$3,640</td>
                <td className="py-3 font-mono text-sm text-[var(--ink)]">65%</td>
                <td className="py-3 font-mono text-sm text-[var(--loss)]">-0.4%</td>
                <td className="py-3">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[var(--win-soft)] text-[var(--win)]">Activa</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB OPERADOR
═══════════════════════════════════════════ */
const EQUITY_DATA = [
  { date: "abr 14", balance: 100000, equity: 99800  },
  { date: "abr 17", balance: 100400, equity: 100100 },
  { date: "abr 22", balance: 100200, equity: 99900  },
  { date: "abr 27", balance: 100900, equity: 100600 },
  { date: "may 1",  balance: 101400, equity: 101100 },
  { date: "may 5",  balance: 101900, equity: 101600 },
  { date: "may 9",  balance: 101600, equity: 101300 },
  { date: "may 12", balance: 102400, equity: 102100 },
  { date: "may 15", balance: 102900, equity: 102600 },
  { date: "may 18", balance: 102600, equity: 102300 },
  { date: "may 20", balance: 102840, equity: 102560 },
]

const ACCOUNT_CARDS = [
  { id: "a1", type: "PROP FIRM",  name: "FXify 100K · Phase 2", balance: 102840.55, deltaToday: +1240.20, color: "#4f6ef7" },
  { id: "a2", type: "PROP FIRM",  name: "FTMO Swing 50K",        balance: 51780.10,  deltaToday: -310.00,  color: "#22c55e" },
  { id: "a3", type: "PERSONAL",   name: "Personal · IBKR",       balance: 18205.42,  deltaToday: +88.00,   color: "#f59e0b" },
  { id: "a4", type: "DEMO",       name: "Demo · Apex 150K",      balance: 149120.00, deltaToday: 0,        color: "#e05555" },
]

const RECENT_TRADES = [
  { id: "t1", dir: "LONG",  symbol: "ES",     setup: "Opening Range Break", r: 2.4,  pnl: 1240, session: "NY AM", time: "08:32", tags: ["A+","Plan"] },
  { id: "t2", dir: "SHORT", symbol: "NQ",     setup: "Failed Auction",      r: -1.0, pnl: -480, session: "NY AM", time: "09:14", tags: ["Plan"] },
  { id: "t3", dir: "LONG",  symbol: "EURUSD", setup: "London Reversal",     r: 1.2,  pnl: 312,  session: "London", time: "03:45", tags: ["A"] },
]

const SESSION_DATA = [
  { session: "London",   trades: 6,  winRate: 67, avgR: 1.4  },
  { session: "New York", trades: 14, winRate: 71, avgR: 1.9  },
  { session: "Asia",     trades: 2,  winRate: 50, avgR: 0.8  },
  { session: "NY Close", trades: 1,  winRate: 0,  avgR: -1.0 },
]

const TRADE_FILTERS = ["Todos", "A+", "Plan seguido", "Off-plan", "Con violación"]

function TabOperador() {
  const [selectedAccount, setSelectedAccount] = useState("a1")
  const [tradeFilter, setTradeFilter] = useState("Todos")

  const totalPortfolio = ACCOUNT_CARDS.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero: equity number + inline metrics ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] px-6 py-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-eyebrow mb-2">Equity · FXify 100K Phase 2</p>
            <div className="flex items-baseline gap-3">
              <p style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)", lineHeight: 1 }}>
                $102,840.00
              </p>
              <span className="flex items-center gap-1 text-sm font-semibold text-[var(--win)]">
                ↑ +0.55% · 7d
              </span>
            </div>
            <p className="text-xs text-[var(--ink-3)] mt-2">
              Drawdown máx. 2.1% · Profit factor 1.84 · Win rate 58%
            </p>
          </div>
        </div>

        {/* Equity Curve */}
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#4f6ef7" strokeWidth={2.5}
                fill="url(#gradBal)" dot={false} activeDot={{ r: 5, fill: "#4f6ef7", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="equity" name="Equity" stroke="#f59e0b" strokeWidth={1.5}
                strokeDasharray="5 3" fill="url(#gradEq)" dot={false} activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-1 pt-3 border-t border-[var(--line)]">
            {[["#4f6ef7","Balance","$102,840"],["#f59e0b","Equity","$102,560"]].map(([c,l,v]) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-5 h-px inline-block" style={{ background: c }} />
                <span className="text-xs text-[var(--ink-3)]">{l}</span>
                <span className="text-xs font-mono font-semibold text-[var(--ink)]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Account cards ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Tus cuentas</p>
          <p className="text-[11px] text-[var(--ink-3)]">
            4 cuentas · portfolio consolidado{" "}
            <span className="font-mono font-semibold text-[var(--ink)]">
              ${totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ACCOUNT_CARDS.map(a => {
            const active = selectedAccount === a.id
            return (
              <button key={a.id} onClick={() => setSelectedAccount(a.id)}
                className="text-left rounded-[var(--radius-sm)] p-3 border transition-all"
                style={{
                  border: active ? `1.5px solid ${a.color}` : "1.5px solid var(--line)",
                  background: active ? "var(--panel-2)" : "transparent",
                }}>
                {/* Icon + type */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: `${a.color}22`, color: a.color }}>
                    {a.type === "PROP FIRM" ? "🏢" : a.type === "PERSONAL" ? "👤" : "🖥️"}
                  </div>
                  <span className="text-[9px] font-bold text-[var(--ink-3)] uppercase tracking-wider">{a.type}</span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--ink)] leading-tight mb-1.5">{a.name}</p>
                <p className="font-mono font-bold text-[var(--ink)] text-[14px] leading-none">
                  ${a.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className={cn("text-[10px] font-semibold mt-1 font-mono",
                  a.deltaToday > 0 ? "text-[var(--win)]" : a.deltaToday < 0 ? "text-[var(--loss)]" : "text-[var(--ink-3)]")}>
                  {a.deltaToday > 0 ? "+" : ""}{a.deltaToday === 0 ? "0.00" : a.deltaToday.toFixed(2)} USD hoy
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Trades recientes ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Trades recientes</p>
          <div className="flex items-center gap-1.5">
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
            <button className="text-[11px] font-semibold text-[var(--accent)] ml-1 hover:underline">
              Ver todos →
            </button>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["Símbolo · Setup","R","P&L Neto","Sesión · Tags","Fecha"].map(h => (
                <th key={h} className="pb-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_TRADES.map(t => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                {/* Symbol + setup */}
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-base leading-none", t.dir === "LONG" ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                      {t.dir === "LONG" ? "↑" : "↓"}
                    </span>
                    <div>
                      <p className="font-mono font-bold text-[var(--ink)] text-sm">
                        {t.symbol}
                        <span className="font-sans font-normal text-[var(--ink-3)] text-xs ml-1">· {t.dir}</span>
                      </p>
                      <p className="text-[10px] text-[var(--ink-3)]">{t.setup}</p>
                    </div>
                  </div>
                </td>
                {/* R */}
                <td className={cn("py-3 font-mono font-bold text-sm", t.r >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                  {t.r >= 0 ? "+" : ""}{t.r}R
                </td>
                {/* P&L */}
                <td className={cn("py-3 font-mono font-bold text-sm", t.pnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                  {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toLocaleString()}.00
                </td>
                {/* Session + tags */}
                <td className="py-3">
                  <p className="text-xs text-[var(--ink-2)] mb-1">{t.session} · {t.time}</p>
                  <div className="flex gap-1">
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
                {/* Fecha */}
                <td className="py-3 text-xs text-[var(--ink-3)]">20 may 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Rendimiento por sesión ── */}
      <Card title="Rendimiento por sesión">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["Sesión","Trades","Win %","Avg R"].map(h => (
                <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SESSION_DATA.map(s => (
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
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB DISCIPLINA
═══════════════════════════════════════════ */

// Heatmap data: 7 days × 12 weeks. null = no trading, 0 = limpio, 1 = menor, 2 = mayor
type HeatVal = null | 0 | 1 | 2
const DAYS = ["L","M","X","J","V","S","D"]
const WEEKS = 12
const HEATMAP: HeatVal[][] = [
  // L
  [2,1,null,2,0,null,null,0,2,1,1,0],
  // M
  [1,0,0,0,0,0,2,0,0,0,0,0],
  // X
  [2,null,1,0,1,0,0,0,1,1,0,0],
  // J
  [1,1,2,1,0,null,0,0,2,0,null,0],
  // V
  [0,1,2,1,1,1,1,null,1,2,1,1],
  // S
  [null,null,null,null,null,null,null,null,null,null,null,null],
  // D
  [null,null,null,null,null,null,null,null,null,null,null,null],
]

const HEAT_COLORS: Record<string, string> = {
  "null": "var(--panel-2)",
  "0": "var(--win)",
  "1": "var(--be)",
  "2": "var(--loss)",
}

const R_DIST = [
  { r: "-3R", count: 2, color: "var(--loss)" },
  { r: "-2R", count: 3, color: "var(--loss)" },
  { r: "-1R", count: 6, color: "var(--loss)" },
  { r: "0R",  count: 4, color: "var(--be)"   },
  { r: "+1R", count: 8, color: "var(--win)"  },
  { r: "+2R", count: 11, color: "var(--win)" },
  { r: "+3R", count: 5, color: "var(--win)"  },
  { r: "+4R", count: 2, color: "var(--win)"  },
]

const VIOLATIONS_DATA = [
  { rule: "Trade #4+ del día (max-trades-day)", count: 5, delta: -2, severity: "mayor" },
  { rule: "Operar fuera de sesión NY AM",       count: 3, delta: +1, severity: "mayor" },
  { rule: "Recovery RR forzado",                count: 2, delta:  0, severity: "mayor" },
  { rule: "Sin checklist completo",             count: 2, delta: -1, severity: "menor" },
  { rule: "Flag impulsivo manual",              count: 1, delta: -3, severity: "menor" },
]

const COMP_DATA = [
  { name: "Plan seguido", value: 14, color: "var(--win)"  },
  { name: "Plan parcial",  value: 5,  color: "var(--be)"  },
  { name: "Off-plan",      value: 4,  color: "var(--loss)" },
]

function TabDisciplina() {
  return (
    <div className="flex flex-col gap-4">

      {/* ── DO-NOT-TAKE banner ── */}
      <div className="rounded-[var(--radius)] border border-[var(--loss)] px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "rgba(180,40,40,0.12)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--loss)] flex items-center justify-center text-white text-sm font-bold shrink-0">!</div>
          <div>
            <p className="text-sm font-bold text-[var(--loss)]">DO-NOT-TAKE activo · 3 condiciones cumplidas</p>
            <p className="text-xs text-[var(--ink-3)] mt-0.5">Ya son 3 trades hoy · plan no seguido en último trade · RR objetivo forzado a 2.5R sin confluencia</p>
          </div>
        </div>
        <button className="text-xs font-semibold text-[var(--ink-3)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-1.5 whitespace-nowrap hover:text-[var(--ink)] transition-colors shrink-0">
          Ver registro →
        </button>
      </div>

      {/* ── Score + Composición ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Score panel */}
        <div className="col-span-2 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-eyebrow mb-3">Discipline Score · Semana actual</p>
          <div className="flex items-baseline gap-3 mb-1">
            <p style={{ fontSize: 52, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)", lineHeight: 1 }}>78</p>
            <p className="text-[var(--ink-3)] text-lg font-mono">/ 100</p>
            <span className="text-sm font-semibold text-[var(--win)] flex items-center gap-1">↑ +6 vs sem. pasada</span>
          </div>
          {/* Three metric rows */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Sin violación",   value: "78%",  sub: "18 / 23 trades", color: "var(--win)"  },
              { label: "Plan seguido",    value: "82%",  sub: "19 / 23 trades", color: "#4f6ef7"    },
              { label: "Indiscipline $",  value: "$214", sub: "costo acumulado", color: "var(--loss)" },
            ].map(m => (
              <div key={m.label} className="border-l-2 pl-3" style={{ borderColor: m.color }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-1">{m.label}</p>
                <p className="font-mono font-bold text-[var(--ink)]" style={{ fontSize: 22 }}>{m.value}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Composición semanal donut */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5 flex flex-col">
          <p className="text-eyebrow mb-4">Composición semanal</p>
          <div className="flex-1 flex items-center gap-4">
            <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={COMP_DATA} cx={55} cy={55} innerRadius={36} outerRadius={54}
                    dataKey="value" strokeWidth={2} stroke="var(--panel)">
                    {COMP_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p className="font-mono font-bold text-[var(--ink)] text-sm">23</p>
                <p className="text-[9px] text-[var(--ink-3)]">trades</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {COMP_DATA.map(d => (
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
          {/* Week headers */}
          <div className="flex mb-1 pl-5">
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div key={w} className="flex-1 text-center" style={{ minWidth: 32 }}>
                {w % 2 === 0 && <span className="text-[9px] text-[var(--ink-3)]">S{w + 1}</span>}
              </div>
            ))}
          </div>
          {/* Grid */}
          {HEATMAP.map((row, di) => (
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
      <div className="grid grid-cols-2 gap-4">
        {/* R distribution bar chart */}
        <Card title="Distribución de R · este mes" sub="Frecuencia de outcomes vs. expectativa.">
          <div className="flex items-end gap-1.5 h-32 mt-2">
            {R_DIST.map(d => {
              const maxCount = Math.max(...R_DIST.map(x => x.count))
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

        {/* Violations per rule */}
        <Card title="Violaciones por regla">
          <div className="flex justify-end mb-3">
            <button className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Ver registro →</button>
          </div>
          <div className="flex flex-col gap-0">
            {VIOLATIONS_DATA.map(v => (
              <div key={v.rule} className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: v.severity === "mayor" ? "var(--loss)" : "var(--be)" }} />
                <p className="flex-1 text-sm text-[var(--ink)]">{v.rule}</p>
                <span className="font-mono font-bold text-[var(--ink)] text-sm shrink-0">{v.count}</span>
                {v.delta !== 0 && (
                  <span className="text-[10px] font-semibold shrink-0 flex items-center gap-0.5"
                    style={{ color: v.delta < 0 ? "var(--win)" : "var(--loss)" }}>
                    {v.delta < 0 ? "↓" : "↑"} {Math.abs(v.delta)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB PLAYBOOK
═══════════════════════════════════════════ */
const SETUPS = [
  { abbr: "OR", name: "Opening Range Break", market: "Futures", trades: 47, wr: 64, avgR: 1.80, cumR: 11.8,  best: "NY AM",  worst: "Asia",   color: "#f59e0b", data: [10,13,12,16,15,20,19,24,22,28,26,32] },
  { abbr: "LG", name: "Liquidity Grab",       market: "Futures", trades: 31, wr: 71, avgR: 2.20, cumR: 19.1,  best: "NY AM",  worst: "London", color: "#22c55e", data: [8,12,11,17,16,22,21,28,27,34,32,40] },
  { abbr: "LR", name: "London Reversal",      market: "FX",      trades: 28, wr: 58, avgR: 1.40, cumR: 14.2,  best: "London", worst: "NY PM",  color: "#4f6ef7", data: [6,10,9,14,13,18,17,22,21,26,24,28] },
  { abbr: "VW", name: "VWAP Reclaim",         market: "Equities", trades: 19, wr: 60, avgR: 1.50, cumR: 11.2, best: "NY PM",  worst: "Asia",   color: "#14b8a6", data: [8,11,10,15,14,19,18,23,22,27,25,30] },
  { abbr: "FA", name: "Failed Auction",       market: "Futures", trades: 24, wr: 52, avgR: 0.90, cumR: 6.8,   best: "NY AM",  worst: "Asia",   color: "#ef4444", data: [12,10,14,11,16,13,18,15,20,16,18,14] },
  { abbr: "AS", name: "Asia Sweep",           market: "FX",      trades: 16, wr: 55, avgR: 1.10, cumR: 11.8,  best: "Asia",   worst: "NY PM",  color: "#9b59b6", data: [7,10,9,13,12,16,15,19,18,22,21,25] },
  { abbr: "TC", name: "Trend Continuation",   market: "Equities", trades: 22, wr: 49, avgR: 0.60, cumR: -0.7, best: "NY PM",  worst: "London", color: "#e8962a", data: [14,12,15,12,14,11,13,10,12,9,11,8]  },
  { abbr: "NF", name: "News Fade — NFP",      market: "FX",       trades: 8,  wr: 41, avgR:-0.20, cumR: -7.2, best: "FX news",worst: "NY AM",  color: "#6b7280", data: [16,13,15,11,13,9,12,8,10,6,8,4]    },
]

// Session × Setup win rate matrix
const SESSION_MATRIX = [
  { setup: "OR", abbr: "OR", color: "#f59e0b", name: "Opening Range Break", nyam: 72, nypm: 58, london: 51, asia: 33 },
  { setup: "FA", abbr: "FA", color: "#ef4444", name: "Failed Auction",      nyam: 78, nypm: 60, london: 55, asia: 48 },
  { setup: "LR", abbr: "LR", color: "#4f6ef7", name: "London Reversal",     nyam: 44, nypm: 55, london: 68, asia: 50 },
  { setup: "LG", abbr: "LG", color: "#22c55e", name: "Liquidity Grab",      nyam: 55, nypm: 67, london: 50, asia: 42 },
  { setup: "TC", abbr: "TC", color: "#e8962a", name: "Trend Continuation",  nyam: 49, nypm: 53, london: 47, asia: 38 },
  { setup: "AS", abbr: "AS", color: "#9b59b6", name: "Asia Sweep",          nyam: 38, nypm: 50, london: 45, asia: 62 },
]

// A+ checklist compliance
const CHECKLIST = [
  { item: "Confluencia HTF",          pct: 95 },
  { item: "Killzone activa",          pct: 88 },
  { item: "Trade #1–2 del día",       pct: 72 },
  { item: "Stop visualmente protegido",pct: 81 },
  { item: "Target a structure",       pct: 67 },
  { item: "Risk ≤ 1R por trade",      pct: 96 },
]

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

function TabPlaybook() {
  return (
    <div className="flex flex-col gap-4">

      {/* ── Setup cards ── */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Playbook · rendimiento por setup</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">Métricas agregadas desde tu registro de trades · últimos 90 días.</p>
          </div>
          <div className="flex gap-1.5">
            {["Pausados","Descartados"].map(f => (
              <button key={f} className="text-[11px] font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {SETUPS.map(s => {
            const win = s.wr >= 50
            const lineColor = win ? "#22c55e" : "#e05555"
            const W = 240, H = 64
            const max = Math.max(...s.data), min = Math.min(...s.data)
            const range = max - min || 1
            const pts = s.data.map((v, i) => ({
              x: (i / (s.data.length - 1)) * W,
              y: H - 6 - ((v - min) / range) * (H - 16),
            }))
            const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
            const areaPath = linePath + ` L${W},${H} L0,${H} Z`
            const fillId = `pf-${s.abbr}`
            return (
              <div key={s.abbr}
                className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden cursor-pointer hover:border-[var(--line-2)] transition-colors"
                style={{ background: "var(--panel-2)" }}>
                {/* Card header */}
                <div className="flex items-center gap-2.5 p-3 pb-2">
                  <span className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: s.color }}>{s.abbr}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
                    <p className="text-[10px] text-[var(--ink-3)]">{s.market} · {s.trades} trades</p>
                  </div>
                </div>

                {/* Sparkline full-width */}
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

                {/* Stats */}
                <div className="px-3 pt-2 pb-1 grid grid-cols-3 gap-1">
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

                {/* Best / worst session */}
                <div className="px-3 pb-2.5 flex justify-between text-[10px] text-[var(--ink-3)]">
                  <span>Mejor: <span className="text-[var(--win)]">{s.best}</span></span>
                  <span>Peor: <span className="text-[var(--loss)]">{s.worst}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session matrix + Checklist ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Setup × Sesión matrix */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Setup × Sesión · win rate</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-4">Identifica el contexto donde cada setup performa mejor.</p>

          {/* Header row */}
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "180px repeat(4, 1fr)" }}>
            <div />
            {["NY AM","NY PM","LONDON","ASIA"].map(s => (
              <div key={s} className="text-center text-[9px] font-bold text-[var(--ink-3)] uppercase tracking-wider pb-1">{s}</div>
            ))}

            {/* Data rows */}
            {SESSION_MATRIX.flatMap(row => [
              <div key={`${row.setup}-label`} className="flex items-center gap-2 py-1">
                <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: row.color }}>{row.abbr}</span>
                <span className="text-[11px] text-[var(--ink-2)] truncate">{row.name}</span>
              </div>,
              ...[row.nyam, row.nypm, row.london, row.asia].map((pct, ci) => {
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
        </div>

        {/* A+ Checklist compliance */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
          <p className="text-[13px] font-semibold text-[var(--ink)]">A+ Checklist · cumplimiento</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-0.5 mb-5">Tasa de cumplimiento por ítem esta semana.</p>

          <div className="flex flex-col gap-4">
            {CHECKLIST.map(c => {
              const color = checklistColor(c.pct)
              return (
                <div key={c.item}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[12px] text-[var(--ink)]">{c.item}</span>
                    <span className="text-[12px] font-mono font-bold" style={{ color }}>{c.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
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

  return (
    <div>
      <TopBar title="Dashboard" subtitle="FXify 100K · Phase 2 · Sem. 20" />
      <FilterBar options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} className="mb-6" />
      {tab === "portfolio"  && <TabPortfolio />}
      {tab === "operador"   && <TabOperador />}
      {tab === "disciplina" && <TabDisciplina />}
      {tab === "playbook"   && <TabPlaybook />}
    </div>
  )
}

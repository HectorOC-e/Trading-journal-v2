"use client"

import { useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { FilterBar } from "@/components/ui/filter-bar"
import { TopBar } from "@/components/layout/top-bar"
import { cn } from "@/lib/utils"
import { mockTrades, mockAccounts } from "@/mock-data"

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
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--ink-3)] mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

/* ── Sparkline con área de relleno ── */
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
  { date: "1M",  balance: 100000, equity: 100000 },
  { date: "5M",  balance: 100800, equity: 100350 },
  { date: "7M",  balance: 101200, equity: 100900 },
  { date: "8M",  balance: 100700, equity: 100400 },
  { date: "11M", balance: 101900, equity: 101500 },
  { date: "12M", balance: 102400, equity: 102000 },
  { date: "13M", balance: 102100, equity: 101700 },
  { date: "14M", balance: 102900, equity: 102600 },
  { date: "15M", balance: 103300, equity: 102900 },
  { date: "18M", balance: 103000, equity: 102600 },
  { date: "19M", balance: 103500, equity: 103200 },
  { date: "20M", balance: 103640, equity: 103220 },
]

const SESSION_DATA = [
  { session: "London",   trades: 6,  winRate: 67, avgR: 1.4  },
  { session: "New York", trades: 14, winRate: 71, avgR: 1.9  },
  { session: "Asia",     trades: 2,  winRate: 50, avgR: 0.8  },
  { session: "NY Close", trades: 1,  winRate: 0,  avgR: -1.0 },
]

function TabOperador() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Equity"   value="$103,640" sub="FXify 100K · Ph2" delta="+$3,640" />
        <KpiCard label="Net P&L"  value="+$2,640"  sub="esta semana" color="var(--win)" />
        <KpiCard label="Trades"   value="23"        sub="este mes" color="var(--ink)" />
        <KpiCard label="Avg R"    value="+1.8R"     sub="ganadores" color="var(--win)" />
      </div>

      {/* Equity Curve */}
      <Card title="Equity Curve" sub="FXify 100K · Phase 2 · Balance vs Equity en tiempo real">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} width={44} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="balance" name="Balance" stroke="#4f6ef7" strokeWidth={2}
              fill="url(#gradBal)" dot={false} activeDot={{ r: 4, fill: "#4f6ef7" }} />
            <Area type="monotone" dataKey="equity"  name="Equity"  stroke="#f59e0b" strokeWidth={1.5}
              strokeDasharray="5 3" fill="url(#gradEq)" dot={false} activeDot={{ r: 4, fill: "#f59e0b" }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-2 pt-3 border-t border-[var(--line)]">
          {[["#4f6ef7","Balance","$103,640"],["#f59e0b","Equity","$103,220"]].map(([c,l,v]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-5 h-0.5 inline-block" style={{ background: c }} />
              <span className="text-xs text-[var(--ink-3)]">{l}</span>
              <span className="text-xs font-mono font-semibold text-[var(--ink)]">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Sesiones */}
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

        {/* Trades recientes */}
        <Card title="Trades recientes">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["","Símbolo","R","P&L"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockTrades.map(t => (
                <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-2.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                      t.direction === "LONG" ? "bg-[var(--win-soft)] text-[var(--win)]" : "bg-[var(--loss-soft)] text-[var(--loss)]"
                    )}>{t.direction}</span>
                  </td>
                  <td className="py-2.5 font-mono text-sm font-semibold text-[var(--ink)]">{t.symbol}</td>
                  <td className={cn("py-2.5 font-mono text-sm font-semibold", (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.rMultiple ?? 0) >= 0 ? "+" : ""}{t.rMultiple}R
                  </td>
                  <td className={cn("py-2.5 font-mono text-sm", (t.pnl ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${t.pnl?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB DISCIPLINA
═══════════════════════════════════════════ */
const VIOLATIONS = [
  { rule: "Operar fuera de sesión",      count: 2, severity: "CRÍTICA" },
  { rule: "Exceder máximo de trades",    count: 3, severity: "CRÍTICA" },
  { rule: "Pérdida diaria sobre límite", count: 1, severity: "CRÍTICA" },
  { rule: "Símbolo no permitido",        count: 1, severity: "MENOR"   },
]

const DISC_WEEK = [
  { day: "L", score: 92 }, { day: "M", score: 78 }, { day: "X", score: 85 },
  { day: "J", score: 60 }, { day: "V", score: 88 },
]

function TabDisciplina() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Score semana"  value="78/100" sub="Sem. 20" />
        <KpiCard label="Violaciones"   value="7"      sub="este mes" color="var(--loss)" />
        <KpiCard label="Plan rate"     value="82%"    sub="trades en plan" color="var(--win)" />
        <KpiCard label="DO-NOT-TAKE"   value="3"      sub="evitados hoy" color="var(--be)" />
      </div>

      {/* Banner */}
      <div className="rounded-[var(--radius)] border border-[var(--loss)] bg-[var(--loss-soft)] px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🚫</span>
        <div>
          <p className="text-sm font-semibold text-[var(--loss)]">DO-NOT-TAKE activo</p>
          <p className="text-xs text-[var(--loss)] opacity-80">Has alcanzado el límite de 3 trades por hoy</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Score card */}
        <Card title="Score semanal" className="col-span-1">
          <div className="text-center py-2">
            <p className="font-mono font-bold text-[var(--ink)]" style={{ fontSize: 52, lineHeight: 1 }}>78</p>
            <p className="text-xs text-[var(--ink-3)] mt-1">de 100 · Sem. 20</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: "78%", background: "var(--be)" }} />
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            {[
              ["Plan rate",    "82%", "var(--win)"],
              ["Violaciones",  "7",   "var(--loss)"],
              ["DO-NOT-TAKE",  "3",   "var(--be)"],
            ].map(([l,v,c]) => (
              <div key={l} className="flex justify-between text-xs border-b border-[var(--line)] pb-1.5 last:border-0 last:pb-0">
                <span className="text-[var(--ink-2)]">{l}</span>
                <span className="font-mono font-semibold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Mini score bars por día */}
          <div className="mt-4 pt-3 border-t border-[var(--line)]">
            <p className="text-eyebrow mb-2">Score por día</p>
            <div className="flex gap-1 items-end h-10">
              {DISC_WEEK.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm transition-all"
                    style={{ height: `${(d.score / 100) * 32}px`, background: d.score >= 80 ? "var(--win)" : d.score >= 60 ? "var(--be)" : "var(--loss)" }} />
                  <span className="text-[9px] text-[var(--ink-3)]">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Violations table */}
        <Card title="Violaciones este mes" className="col-span-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Regla","Severidad","Veces"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIOLATIONS.map(v => (
                <tr key={v.rule} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)] transition-colors">
                  <td className="py-3 text-sm text-[var(--ink)]">{v.rule}</td>
                  <td className="py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: v.severity === "CRÍTICA" ? "var(--loss-soft)" : "var(--be-soft)",
                        color: v.severity === "CRÍTICA" ? "var(--loss)" : "var(--be)",
                      }}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-bold text-[var(--loss)] text-sm">{v.count}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   TAB PLAYBOOK
═══════════════════════════════════════════ */
const SETUPS = [
  { abbr: "OR", name: "Opening Range Break", market: "NQ",  wr: 64, avgR: 1.80, trades: 18, color: "#f59e0b",
    data: [10,14,12,20,17,24,22,28,25,32] },
  { abbr: "FA", name: "Failed Auction",       market: "NQ",  wr: 52, avgR: 8.90, trades: 11, color: "#ef4444",
    data: [22,17,20,14,18,12,16,10,13,9] },
  { abbr: "LR", name: "London Reversal",      market: "FX",  wr: 58, avgR: 1.40, trades: 8,  color: "#4f6ef7",
    data: [8,12,10,18,15,22,19,26,22,28] },
  { abbr: "LG", name: "Liquidity Grab",       market: "NQ",  wr: 71, avgR: 2.20, trades: 14, color: "#22c55e",
    data: [12,18,16,24,22,30,28,36,33,40] },
  { abbr: "TC", name: "Trend Continuation",   market: "EQ",  wr: 49, avgR: 0.60, trades: 6,  color: "#9b59b6",
    data: [20,16,18,13,16,11,14,9,12,7] },
  { abbr: "AS", name: "Asia Sweep",           market: "NQ",  wr: 55, avgR: 1.10, trades: 9,  color: "#14b8a6",
    data: [10,14,13,18,16,22,20,26,23,28] },
  { abbr: "VW", name: "VWAP Reclaim",         market: "NQ",  wr: 60, avgR: 1.50, trades: 12, color: "#4f6ef7",
    data: [9,14,12,20,17,24,22,28,25,30] },
  { abbr: "NF", name: "News Fade – NFP",      market: "NQ",  wr: 41, avgR: -0.20, trades: 5, color: "#6b7280",
    data: [18,12,16,10,14,8,12,6,10,4] },
]

function TabPlaybook() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Setups activos" value="8"   sub="configurados" color="var(--ink)" />
        <KpiCard label="Mejor setup"    value="LG"  sub="71% WR · +2.2R avg" />
        <KpiCard label="Trades A+"      value="34%" sub="del total de operaciones" color="var(--win)" />
        <KpiCard label="Avg RR global"  value="1.8" sub="todos los setups" color="var(--win)" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SETUPS.map(s => {
          const winning = s.wr >= 50
          const lineColor = winning ? "var(--win)" : "var(--loss)"
          return (
            <div key={s.abbr}
              className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4 flex flex-col gap-3 hover:border-[var(--line-2)] transition-all cursor-pointer group">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: s.color }}>
                    {s.abbr}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight">{s.name}</p>
                    <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{s.market}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 shrink-0"
                  style={{
                    background: winning ? "var(--win-soft)" : "var(--loss-soft)",
                    color: winning ? "var(--win)" : "var(--loss)",
                  }}>
                  {s.wr}%
                </span>
              </div>

              {/* Sparkline con área */}
              <div className="rounded-[var(--radius-sm)] overflow-hidden" style={{ background: winning ? "var(--win-soft)" : "var(--loss-soft)", padding: "6px 4px 2px" }}>
                <Sparkline data={s.data} color={lineColor} win={winning} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[var(--line)]">
                <div>
                  <p className="text-[9px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-0.5">Avg R</p>
                  <p className={cn("text-[13px] font-mono font-bold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {s.avgR > 0 ? "+" : ""}{s.avgR.toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-0.5">Trades</p>
                  <p className="text-[13px] font-mono font-bold text-[var(--ink-2)]">{s.trades}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-0.5">Win %</p>
                  <p className={cn("text-[13px] font-mono font-bold", winning ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.wr}%</p>
                </div>
              </div>
            </div>
          )
        })}
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

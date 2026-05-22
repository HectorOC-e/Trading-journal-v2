"use client"

import { useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
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

/* ── Shared card wrapper ── */
function Card({ title, sub, children, className }: {
  title?: string; sub?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5", className)}>
      {title && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
          {sub && <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

/* ── KPI card — matches spec exactly ── */
function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color?: string
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] px-5 py-4">
      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: color ?? "var(--accent)", marginBottom: 4, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{sub}</p>
    </div>
  )
}

/* ── Custom tooltip for Recharts ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--ink-3)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   TAB: PORTFOLIO
═══════════════════════════════════════ */
const DONUT_DATA = [
  { name: "FXify 100K · Phase 2", value: 31.9, color: "#4f6ef7" },
  { name: "FTMO Swing 50K",       value: 16.1, color: "#4caf7a" },
  { name: "Personal · IBKR",      value: 5.7,  color: "#e8962a" },
  { name: "Demo · Apex 150K",     value: 46.3, color: "#e05555" },
]

const BAR_DATA = [
  { date: "may 7",  FXify: 30, FTMO: 15, IBKR: 8,  Apex: 20 },
  { date: "may 8",  FXify: 20, FTMO: 5,  IBKR: 0,  Apex: 35 },
  { date: "may 11", FXify: 50, FTMO: 20, IBKR: 10, Apex: 40 },
  { date: "may 12", FXify: 40, FTMO: 15, IBKR: 5,  Apex: 30 },
  { date: "may 13", FXify: 35, FTMO: 10, IBKR: 0,  Apex: 25 },
  { date: "may 14", FXify: 45, FTMO: 25, IBKR: 12, Apex: 35 },
  { date: "may 15", FXify: 55, FTMO: 20, IBKR: 8,  Apex: 45 },
  { date: "may 18", FXify: 25, FTMO: 10, IBKR: 0,  Apex: 20 },
  { date: "may 19", FXify: 40, FTMO: 18, IBKR: 6,  Apex: 32 },
  { date: "may 20", FXify: 30, FTMO: 12, IBKR: 4,  Apex: 22 },
]

function TabPortfolio() {
  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Net P&L"      value="+$18.4k" sub="30d · todas las cuentas" color="var(--win)" />
        <KpiCard label="Profit Factor" value="1.84"   sub="30d · todas las cuentas" />
        <KpiCard label="Win Rate"      value="58%"    sub="134 / 230 CLOSED" />
        <KpiCard label="Max Drawdown"  value="-3.4%"  sub="abr 12 · FXify" color="var(--loss)" />
      </div>

      {/* Donut + Bar */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Asignación por cuenta" sub="Solo PROP_FIRM + PERSONAL · DEMO excluido.">
          <div className="flex items-center gap-5">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={DONUT_DATA} cx={75} cy={75} innerRadius={48} outerRadius={72}
                  dataKey="value" strokeWidth={0}>
                  {DONUT_DATA.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {DONUT_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] text-[var(--ink)]">{d.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-[var(--ink-2)]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="P&L diario · stacked por cuenta">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={BAR_DATA} barSize={14} barCategoryGap="20%">
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chip)" }} />
              <Bar dataKey="FXify" stackId="a" fill="#4f6ef7" radius={[0,0,0,0]} />
              <Bar dataKey="FTMO"  stackId="a" fill="#4caf7a" radius={[0,0,0,0]} />
              <Bar dataKey="IBKR"  stackId="a" fill="#e8962a" radius={[0,0,0,0]} />
              <Bar dataKey="Apex"  stackId="a" fill="#e05555" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Accounts table */}
      <Card title="Comparación de cuentas">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["Cuenta","Balance","P&L mes","Win %","Drawdown","Estado"].map(h => (
                <th key={h} className="pb-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockAccounts.map(a => (
              <tr key={a.id} className="border-b border-[var(--line)] last:border-0">
                <td className="py-3 font-medium text-[var(--ink)]">{a.name}</td>
                <td className="py-3 font-mono text-[var(--ink)]">${a.initialBalance.toLocaleString()}</td>
                <td className="py-3 font-mono font-semibold text-[var(--win)]">+$3,640</td>
                <td className="py-3 font-mono text-[var(--ink)]">65%</td>
                <td className="py-3 font-mono text-[var(--loss)]">-0.4%</td>
                <td className="py-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--win-soft)] text-[var(--win)]">Activa</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════
   TAB: OPERADOR
═══════════════════════════════════════ */
const EQUITY_DATA = [
  { date: "may 1",  balance: 100000, equity: 100000 },
  { date: "may 5",  balance: 100800, equity: 100500 },
  { date: "may 7",  balance: 101200, equity: 100900 },
  { date: "may 8",  balance: 100900, equity: 100600 },
  { date: "may 11", balance: 101800, equity: 101400 },
  { date: "may 12", balance: 102200, equity: 101900 },
  { date: "may 13", balance: 102000, equity: 101700 },
  { date: "may 14", balance: 102800, equity: 102500 },
  { date: "may 15", balance: 103200, equity: 102900 },
  { date: "may 18", balance: 103000, equity: 102700 },
  { date: "may 19", balance: 103500, equity: 103200 },
  { date: "may 20", balance: 103640, equity: 103220 },
]

const SESSION_DATA = [
  { session: "London",    trades: 6,  winRate: 67, avgR: 1.4 },
  { session: "New York",  trades: 14, winRate: 71, avgR: 1.9 },
  { session: "Asia",      trades: 2,  winRate: 50, avgR: 0.8 },
  { session: "NY Close",  trades: 1,  winRate: 0,  avgR: -1.0 },
]

function TabOperador() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Equity"    value="$103,640" sub="FXify 100K · Ph2" />
        <KpiCard label="Net P&L"   value="+$2,640"  sub="esta semana" color="var(--win)" />
        <KpiCard label="Trades"    value="23"        sub="este mes" color="var(--ink)" />
        <KpiCard label="Avg R"     value="+1.8R"     sub="ganadores" color="var(--win)" />
      </div>

      <Card title="Equity Curve — Balance vs Equity" sub="FXify 100K · Phase 2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f6ef7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#e8962a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#e8962a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`} domain={["auto","auto"]} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="balance" name="Balance" stroke="#4f6ef7" strokeWidth={2}
              fill="url(#gradBalance)" dot={false} />
            <Area type="monotone" dataKey="equity"  name="Equity"  stroke="#e8962a" strokeWidth={1.5}
              strokeDasharray="4 3" fill="url(#gradEquity)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-3">
          {[["#4f6ef7","Balance"],["#e8962a","Equity"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
              <span className="w-4 h-0.5 inline-block" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Rendimiento por sesión">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Sesión","Trades","Win %","Avg R"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SESSION_DATA.map(s => (
                <tr key={s.session} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2.5 text-[var(--ink)]">{s.session}</td>
                  <td className="py-2.5 font-mono text-[var(--ink-2)]">{s.trades}</td>
                  <td className={cn("py-2.5 font-mono font-semibold", s.winRate >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.winRate}%</td>
                  <td className={cn("py-2.5 font-mono font-semibold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.avgR > 0 ? "+" : ""}{s.avgR}R</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Trades recientes">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["","Símbolo","R","P&L"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockTrades.map(t => (
                <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", t.direction === "LONG" ? "bg-[var(--win-soft)] text-[var(--win)]" : "bg-[var(--loss-soft)] text-[var(--loss)]")}>{t.direction}</span>
                  </td>
                  <td className="py-2.5 font-mono font-semibold text-[var(--ink)]">{t.symbol}</td>
                  <td className={cn("py-2.5 font-mono font-semibold", (t.rMultiple ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                    {(t.rMultiple ?? 0) >= 0 ? "+" : ""}{t.rMultiple}R
                  </td>
                  <td className={cn("py-2.5 font-mono", (t.pnl ?? 0) >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
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

/* ═══════════════════════════════════════
   TAB: DISCIPLINA
═══════════════════════════════════════ */
const VIOLATIONS = [
  { rule: "Operar fuera de sesión",     count: 2 },
  { rule: "Exceder máximo de trades",   count: 3 },
  { rule: "Pérdida diaria sobre límite",count: 1 },
  { rule: "Operar símbolo no permitido",count: 1 },
]

function TabDisciplina() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Score"       value="78/100" sub="esta semana" />
        <KpiCard label="Violaciones" value="7"      sub="este mes" color="var(--loss)" />
        <KpiCard label="Plan rate"   value="82%"    sub="trades en plan" color="var(--win)" />
        <KpiCard label="DO-NOT-TAKE" value="3"      sub="evitados hoy" color="var(--be)" />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--loss)] bg-[var(--loss-soft)] px-4 py-3 text-sm font-semibold text-[var(--loss)]">
        🚫 DO-NOT-TAKE activo — Has alcanzado 3 trades hoy
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Score semanal" className="col-span-1">
          <div className="text-center py-3">
            <p className="font-mono font-bold text-[var(--ink)]" style={{ fontSize: 48, lineHeight: 1 }}>78</p>
            <p className="text-sm text-[var(--ink-3)] mt-1">de 100 · Sem. 20</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--be)]" style={{ width: "78%" }} />
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            {[["Plan rate","82%","var(--win)"],["Violaciones","7","var(--loss)"],["DO-NOT-TAKE","3","var(--be)"]].map(([l,v,c]) => (
              <div key={l} className="flex justify-between text-xs border-b border-[var(--line)] pb-1.5 last:border-0 last:pb-0">
                <span className="text-[var(--ink-2)]">{l}</span>
                <span className="font-mono font-semibold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Violaciones este mes" className="col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Regla","Veces"].map(h => (
                  <th key={h} className="pb-2 text-left" style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIOLATIONS.map(v => (
                <tr key={v.rule} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-3 text-[var(--ink)]">{v.rule}</td>
                  <td className="py-3 font-mono font-bold text-[var(--loss)]">{v.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   TAB: PLAYBOOK
═══════════════════════════════════════ */
const SETUPS = [
  { abbr: "OR", name: "Opening Range Break", wr: 64, avgR: 1.80, trades: 18, color: "#f59e0b" },
  { abbr: "FA", name: "Failed Auction",       wr: 52, avgR: 8.90, trades: 11, color: "#ef4444" },
  { abbr: "LR", name: "London Reversal",      wr: 58, avgR: 1.40, trades: 8,  color: "#4f6ef7" },
  { abbr: "LG", name: "Liquidity Grab",       wr: 71, avgR: 2.20, trades: 14, color: "#22c55e" },
  { abbr: "TC", name: "Trend Continuation",   wr: 49, avgR: 0.60, trades: 6,  color: "#9b59b6" },
  { abbr: "AS", name: "Asia Sweep",           wr: 55, avgR: 1.10, trades: 9,  color: "#14b8a6" },
  { abbr: "VW", name: "VWAP Reclaim",         wr: 60, avgR: 1.50, trades: 12, color: "#4f6ef7" },
  { abbr: "NF", name: "News Fade – NFP",      wr: 41, avgR: -0.20,trades: 5,  color: "#6b7280" },
]

const SPARKLINE_DATA = [
  [10,18,14,22,19,28,24,30],
  [20,15,18,12,16,10,14,11],
  [8,12,10,16,14,20,18,22],
  [15,22,18,28,24,32,30,36],
  [18,14,16,12,14,10,12,8],
  [10,14,12,18,16,22,20,24],
  [12,18,15,22,20,26,24,28],
  [20,16,18,12,14,8,10,6],
]

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const h = 36, w = 120
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3
    return `${x},${y}`
  }).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 36 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function TabPlaybook() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Setups activos" value="8"   sub="configurados" color="var(--ink)" />
        <KpiCard label="Mejor setup"    value="LG"  sub="71% WR · +2.2R" />
        <KpiCard label="Trades A+"      value="34%" sub="del total" color="var(--win)" />
        <KpiCard label="Avg RR"         value="1.8" sub="todos los setups" color="var(--win)" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SETUPS.map((s, i) => (
          <div key={s.abbr} className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: s.color }}>
                {s.abbr}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
              </div>
            </div>
            <Sparkline data={SPARKLINE_DATA[i]} color={s.wr >= 50 ? "var(--win)" : "var(--loss)"} />
            <div className="flex justify-between text-xs">
              <div>
                <p className="eyebrow mb-0.5">Win %</p>
                <p className={cn("font-mono font-bold", s.wr >= 50 ? "text-[var(--win)]" : "text-[var(--loss)]")}>{s.wr}%</p>
              </div>
              <div className="text-right">
                <p className="eyebrow mb-0.5">Avg R</p>
                <p className={cn("font-mono font-bold", s.avgR > 0 ? "text-[var(--win)]" : "text-[var(--loss)]")}>
                  {s.avgR > 0 ? "+" : ""}{s.avgR.toFixed(1)}
                </p>
              </div>
              <div className="text-right">
                <p className="eyebrow mb-0.5">Trades</p>
                <p className="font-mono text-[var(--ink-2)]">{s.trades}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   PAGE
═══════════════════════════════════════ */
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

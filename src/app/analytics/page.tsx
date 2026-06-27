"use client"

import { useState } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { FilterBar } from "@/components/ui/filter-bar"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { PracticeToggle } from "@/components/ui/practice-toggle"
import { SkeletonKpiStrip } from "@/components/ui/skeleton"
import { usePracticeScope } from "@/lib/practice-scope-store"
import { trpc } from "@/lib/trpc/client"
import { askCoach } from "@/lib/coach-bus"
import { currencySymbol } from "@/lib/fx"
import { CountUp } from "@/components/ui/count-up"
import { SimpleTable } from "@/components/ui/data-table"
import { Sparkles } from "lucide-react"
import type { RouterOutputs } from "@/server/trpc/root"
import { AiInsightsPanel } from "./components/ai-insights-panel"
import { BehaviorLoopPanel } from "@/components/behavior/behavior-loop-panel"
import { RDistributionChart } from "@/components/analytics/r-distribution-chart"
import { EquityDrawdownChart } from "@/components/analytics/equity-drawdown-chart"
import { ImprovementPanel } from "@/components/improvement/improvement-panel"

type Institutional = RouterOutputs["analytics"]["institutional"]
type Instruments = RouterOutputs["edges"]["instruments"]
type TagEdges = RouterOutputs["edges"]["tags"]

type Overview = RouterOutputs["analytics"]["overview"]
type Period = "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"

const PERIODS = [
  { value: "7d", label: "7D" }, { value: "1M", label: "1M" }, { value: "3M", label: "3M" },
  { value: "6M", label: "6M" }, { value: "1Y", label: "1A" }, { value: "ALL", label: "Todo" },
]
const SECTIONS = [
  { value: "mejora",        label: "Mejora" },
  { value: "performance",   label: "Performance" },
  { value: "risk",          label: "Riesgo" },
  { value: "institucional", label: "Institucional" },
  { value: "accounts",      label: "Cuentas" },
  { value: "setups",        label: "Setups" },
  { value: "markets",       label: "Mercados" },
  { value: "edges",         label: "Edges" },
  { value: "psychology",    label: "Psicología" },
  { value: "goals",         label: "Objetivos" },
  { value: "withdrawals",   label: "Retiros" },
]

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })
// Currency-aware: sym comes from the user's base currency (d.baseCurrency).
const money = (n: number, sym = "$") => `${n >= 0 ? "+" : "−"}${sym}${fmt(Math.abs(n))}`
const amt   = (n: number, sym = "$") => `${sym}${fmt(n)}`

/* ── Presentational helpers ────────────────────────────────────────────── */
function Stat({ label, value, tone, sub, explain }: { label: string; value: string; tone?: "win" | "loss" | "ink"; sub?: string; explain?: string }) {
  const color = tone === "win" ? "var(--win)" : tone === "loss" ? "var(--loss)" : "var(--ink)"
  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)]">{label}</p>
        {explain && (
          <button type="button" onClick={() => askCoach(explain)} aria-label={`Explícame: ${label}`} title="Explícame esta métrica"
            className="shrink-0 text-[var(--ink-3)] hover:text-[var(--accent)] opacity-60 hover:opacity-100 transition-colors">
            <Sparkles size={13} />
          </button>
        )}
      </div>
      <p className="num text-[20px] font-bold leading-tight mt-1" style={{ color }}><CountUp value={value} /></p>
      {sub && <p className="text-[10.5px] text-[var(--ink-3)] mt-0.5">{sub}</p>}
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points)
  const range = max - min || 1
  const w = 100, h = 32
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h}`).join(" ")
  const up = points[points.length - 1] >= points[0]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-10">
      <polyline points={d} fill="none" stroke={up ? "var(--win)" : "var(--loss)"} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ── Sections ──────────────────────────────────────────────────────────── */
function Performance({ d }: { d: Overview }) {
  const p = d.performance
  const sym = currencySymbol(d.baseCurrency)
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Stat label="Net P&L" value={money(p.netPnl, sym)} tone={p.netPnl >= 0 ? "win" : "loss"} sub={`${p.totalTrades} trades`} explain={`Mi Net P&L es ${money(p.netPnl, sym)} en ${p.totalTrades} trades. ¿Qué me dice y en qué enfocarme?`} />
      <Stat label="Win Rate" value={`${p.winRate}%`} sub={`${p.wins}G · ${p.losses}P`} explain={`Mi win rate es ${p.winRate}% con avg R ${p.avgR}. ¿Es saludable la combinación?`} />
      <Stat label="Profit Factor" value={p.profitFactor != null ? String(p.profitFactor) : "—"} sub="ganancia / pérdida" explain={`Mi profit factor es ${p.profitFactor ?? "n/d"}. ¿Qué significa y cómo lo mejoro?`} />
      <Stat label="Expectancy" value={money(p.expectancy, sym)} tone={p.expectancy >= 0 ? "win" : "loss"} sub="por trade" explain={`Mi expectancy es ${money(p.expectancy, sym)} por trade. ¿Qué implica para escalar el tamaño?`} />
      <Stat label="Avg R" value={`${p.avgR}R`} sub="r múltiplo medio" explain={`Mi avg R es ${p.avgR}. ¿Cómo lo subo sin bajar el win rate?`} />
      <Stat label="Avg Win" value={amt(p.avgWin, sym)} tone="win" explain={`Mi ganancia media por trade es ${amt(p.avgWin, sym)} y mi pérdida media ${amt(p.avgLoss, sym)}. ¿Está sana la relación riesgo/recompensa?`} />
      <Stat label="Avg Loss" value={amt(p.avgLoss, sym)} tone="loss" explain={`Mi pérdida media por trade es ${amt(p.avgLoss, sym)}. ¿Cómo la reduzco sin cortar ganadores antes de tiempo?`} />
      <Stat label="Holding medio" value={p.avgHoldMinutes != null ? `${p.avgHoldMinutes} min` : "—"} explain={p.avgHoldMinutes != null ? `Mantengo mis trades ${p.avgHoldMinutes} min en promedio. ¿Qué dice eso de mi estilo y gestión?` : undefined} />
    </div>
  )
}

function Risk({ d }: { d: Overview }) {
  const sym = currencySymbol(d.baseCurrency)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Stat label="Peor drawdown" value={`${d.risk.worstDrawdownPct}%`} tone="loss" sub="pico a valle global" explain={`Mi peor drawdown global es ${d.risk.worstDrawdownPct}%. ¿Es manejable y cómo protejo mi capital de caídas así?`} />
        <Stat label="Cuentas" value={String(d.risk.accounts.length)} sub={`${d.risk.accounts.filter(a => a.locked).length} bloqueadas`} />
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)] mb-1">Curva de equity</p>
          <Sparkline points={d.risk.equityCurve.map(e => e.balance)} />
        </div>
      </div>
      <SimpleTable
        data={d.risk.accounts}
        getRowKey={(a) => a.id}
        density="compact"
        columns={[
          { key: "name", header: "Cuenta", width: "minmax(120px, 1.6fr)", render: (a) => <span className="text-[var(--ink)]">{a.name}</span> },
          { key: "balance", header: "Balance", align: "right", render: (a) => <span className="num" style={{ color: a.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{amt(a.balance, sym)}</span> },
          { key: "dd", header: "Drawdown", align: "right", render: (a) => <span className="num" style={{ color: a.maxDrawdownPct > 0 ? "var(--loss)" : "var(--ink-2)" }}>{a.maxDrawdownPct}%</span> },
          { key: "ddlimit", header: "Límite DD", align: "right", hideBelow: "lg", render: (a) => <span className="num">{a.ddLimitPct != null ? `${a.ddLimitPct}%` : "—"}</span> },
          { key: "estado", header: "Estado", render: (a) => <span style={{ color: a.locked ? "var(--loss)" : "var(--win)" }}>{a.locked ? "Bloqueada" : "Activa"}</span> },
        ]}
      />
    </div>
  )
}

function AccountsIntel({ d }: { d: Overview }) {
  const sym = currencySymbol(d.baseCurrency)
  return (
    <SimpleTable
      data={d.risk.accounts}
      getRowKey={(a) => a.id}
      density="compact"
      columns={[
        { key: "name", header: "Cuenta", width: "minmax(120px, 1.6fr)", render: (a) => <span className="text-[var(--ink)]">{a.name}</span> },
        { key: "balance", header: "Balance", align: "right", render: (a) => <span className="num">{amt(a.balance, sym)}</span> },
        { key: "netPnl", header: "Net P&L", align: "right", render: (a) => <span className="num" style={{ color: a.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(a.netPnl, sym)}</span> },
        { key: "trades", header: "Trades", align: "right", hideBelow: "md", render: (a) => <span className="num">{a.trades}</span> },
        { key: "winRate", header: "Win Rate", align: "right", hideBelow: "sm", render: (a) => <span className="num">{a.winRate}%</span> },
      ]}
    />
  )
}

function Setups({ d }: { d: Overview }) {
  const sym = currencySymbol(d.baseCurrency)
  const max = Math.max(1, ...d.setups.map(s => Math.abs(s.netPnl)))
  if (d.setups.length === 0) return <Empty msg="Sin trades con setup asignado en este periodo." />
  return (
    <div className="flex flex-col gap-2">
      {d.setups.map(s => (
        <div key={s.setupId} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[13px] font-semibold text-[var(--ink)] truncate">{s.name}</span>
            </span>
            <span className="num text-[13px] font-bold shrink-0" style={{ color: s.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(s.netPnl, sym)}</span>
          </div>
          <Bar value={s.netPnl} max={max} color={s.netPnl >= 0 ? "var(--win)" : "var(--loss)"} />
          <div className="flex gap-4 mt-2 text-[11px] text-[var(--ink-3)]">
            <span>{s.trades} trades</span><span>WR {s.winRate}%</span><span>avgR {s.avgR}</span>
            <span>maxLoss {s.maxConsecutiveLosses}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Markets({ d }: { d: Overview }) {
  const sym = currencySymbol(d.baseCurrency)
  if (d.markets.length === 0) return <Empty msg="Sin datos de mercado en este periodo." />
  return (
    <SimpleTable
      data={d.markets}
      getRowKey={(m) => m.symbol}
      density="compact"
      columns={[
        { key: "symbol", header: "Símbolo", width: "minmax(100px, 1.4fr)", render: (m) => <span className="font-mono font-bold text-[var(--ink)]">{m.symbol}</span> },
        { key: "trades", header: "Trades", align: "right", hideBelow: "md", render: (m) => <span className="num">{m.trades}</span> },
        { key: "netPnl", header: "Net P&L", align: "right", render: (m) => <span className="num" style={{ color: m.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(m.netPnl, sym)}</span> },
        { key: "winRate", header: "Win Rate", align: "right", hideBelow: "sm", render: (m) => <span className="num">{m.winRate}%</span> },
        { key: "avgR", header: "Avg R", align: "right", hideBelow: "lg", render: (m) => <span className="num">{m.avgR}</span> },
      ]}
    />
  )
}

function Psychology({ d }: { d: Overview }) {
  const p = d.psychology
  const sym = currencySymbol(d.baseCurrency)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Disciplina" value={`${p.disciplineScore}/100`} tone={p.disciplineScore >= 70 ? "win" : "loss"} explain={`Mi score de disciplina es ${p.disciplineScore}/100 con ${p.violationRate}% de trades con violaciones. ¿Qué hábito ataco primero?`} />
        <Stat label="Violaciones" value={`${p.violationRate}%`} tone={p.violationRate > 0 ? "loss" : "win"} sub="de tus trades" explain={`El ${p.violationRate}% de mis trades tiene violaciones de reglas. ¿Cómo lo bajo?`} />
        <Stat label="FOMO" value={String(p.fomoCount)} tone={p.fomoCount > 0 ? "loss" : undefined} explain={`Tengo ${p.fomoCount} trades marcados como FOMO y ${p.revengeCount} de revancha. ¿Qué patrón emocional revela y cómo lo corto?`} />
        <Stat label="Revancha" value={String(p.revengeCount)} tone={p.revengeCount > 0 ? "loss" : undefined} explain={`Tengo ${p.revengeCount} trades de revancha. ¿Qué disparador los causa y qué regla me protege?`} />
      </div>
      <SimpleTable
        data={p.byEmotion}
        getRowKey={(e) => e.emotion}
        density="compact"
        columns={[
          { key: "emotion", header: "Emoción", width: "minmax(120px, 1.6fr)", render: (e) => <span className="capitalize text-[var(--ink)]">{e.emotion}</span> },
          { key: "trades", header: "Trades", align: "right", hideBelow: "md", render: (e) => <span className="num">{e.trades}</span> },
          { key: "avgPnl", header: "P&L medio", align: "right", render: (e) => <span className="num" style={{ color: e.avgPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(e.avgPnl, sym)}</span> },
          { key: "winRate", header: "Win Rate", align: "right", hideBelow: "sm", render: (e) => <span className="num">{e.winRate}%</span> },
        ]}
      />
    </div>
  )
}

function GoalRow({ label, current, goal, unit, unitLeading }: { label: string; current: number; goal: number | null; unit?: string; unitLeading?: boolean }) {
  const pct = goal && goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  const u = (n: number) => unitLeading ? `${unit}${fmt(n)}` : `${fmt(n)}${unit ?? ""}`
  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-[var(--ink)]">{label}</span>
        <span className="num text-[12px] text-[var(--ink-2)]">{u(current)} {goal != null ? `/ ${u(goal)}` : ""}</span>
      </div>
      {goal != null
        ? <Bar value={pct} max={100} color={pct >= 100 ? "var(--win)" : "var(--accent)"} />
        : <p className="text-[10.5px] text-[var(--ink-3)]">Sin objetivo definido · configúralo en Perfil.</p>}
    </div>
  )
}

function Goals({ d }: { d: Overview }) {
  const g = d.goals
  const sym = currencySymbol(d.baseCurrency)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <GoalRow label="P&L semanal" current={g.weekPnl} goal={g.weeklyPnlGoal} unit={sym} unitLeading />
      <GoalRow label="Trades semanales" current={g.weekTrades} goal={g.weeklyTradesGoal} />
      <GoalRow label="Disciplina" current={d.psychology.disciplineScore} goal={g.disciplineGoal} unit="/100" />
      <GoalRow label="Minutos de estudio (meta)" current={0} goal={g.weeklyGoalMinutes} unit="min" />
    </div>
  )
}

function Withdrawals({ d }: { d: Overview }) {
  const w = d.withdrawals
  const sym = currencySymbol(d.baseCurrency)
  const max = Math.max(1, ...w.byMonth.map(m => m.amount))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Stat label="Total retirado" value={amt(w.total, sym)} explain={`He retirado ${amt(w.total, sym)} en ${w.count} retiros (${w.impactPct}% de mi P&L neto). ¿Es sostenible mi ritmo de retiros?`} />
        <Stat label="Nº de retiros" value={String(w.count)} />
        <Stat label="Impacto en P&L" value={`${w.impactPct}%`} tone={w.impactPct > 50 ? "loss" : undefined} sub="del P&L neto" />
      </div>
      {w.byMonth.length > 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col gap-2">
          {w.byMonth.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--ink-3)] w-16 shrink-0">{m.month}</span>
              <div className="flex-1"><Bar value={m.amount} max={max} color="var(--accent)" /></div>
              <span className="num text-[11px] text-[var(--ink-2)] w-20 text-right shrink-0">{amt(m.amount, sym)}</span>
            </div>
          ))}
        </div>
      ) : <Empty msg="Sin retiros en este periodo." />}
    </div>
  )
}

/* ── Institutional (S3) ─────────────────────────────────────────────────── */
const ratio = (n: number | null) => (n != null ? fmt(n) : "—")

function Institutional({ d, sym }: { d: Institutional; sym: string }) {
  const r = d.ratios
  if (d.sampleSize === 0) return <Empty msg="Registra trades cerrados para desbloquear las métricas institucionales." />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Max Drawdown" value={`${fmt(d.drawdown.maxDrawdownPct)}%`} tone="loss" sub="pico a valle"
          explain={`Mi peor drawdown del periodo es ${fmt(d.drawdown.maxDrawdownPct)}%. ¿Es manejable y cómo lo controlo?`} />
        <Stat label="Sortino" value={ratio(r.sortino)} sub="retorno / downside"
          explain={`Mi ratio de Sortino es ${ratio(r.sortino)}. ¿Qué me dice de mi riesgo a la baja?`} />
        <Stat label="Calmar" value={ratio(r.calmar)} sub="retorno / max DD"
          explain={`Mi ratio de Calmar es ${ratio(r.calmar)}. ¿Es bueno y cómo lo mejoro?`} />
        <Stat label="½ Kelly" value={r.kellyHalf != null ? `${(r.kellyHalf * 100).toFixed(0)}%` : "—"} sub="tamaño prudente"
          explain={`El medio-Kelly sugiere arriesgar ${r.kellyHalf != null ? `${(r.kellyHalf * 100).toFixed(0)}%` : "n/d"} por trade. ¿Cómo lo aplico a mi sizing?`} />
      </div>
      <EquityDrawdownChart d={d.drawdown} money={(n) => amt(n, sym)} />
      <RDistributionChart d={d.rDistribution} />
    </div>
  )
}

/* ── Edges (S11 instrument + tags) ──────────────────────────────────────── */
function EdgeBadge({ label, tone }: { label: string; tone: "win" | "loss" | "ink" }) {
  const color = tone === "win" ? "var(--win)" : tone === "loss" ? "var(--loss)" : "var(--ink-3)"
  const bg = tone === "win" ? "var(--win-soft)" : tone === "loss" ? "var(--loss-soft)" : "var(--chip)"
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color, background: bg }}>{label}</span>
}

function Edges({ instruments, tags, sym }: { instruments: Instruments; tags: TagEdges; sym: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">Edge por instrumento</h3>
        {instruments.bySymbol.length === 0 ? <Empty msg="Sin trades cerrados para el edge por instrumento." /> : (
          <SimpleTable
            data={instruments.bySymbol}
            getRowKey={(s) => s.symbol}
            density="compact"
            columns={[
              { key: "symbol", header: "Símbolo", width: "minmax(100px, 1.4fr)", render: (s) => <span className="font-mono font-bold text-[var(--ink)]">{s.symbol}</span> },
              { key: "trades", header: "Trades", align: "right", hideBelow: "md", render: (s) => <span className="num">{s.trades}</span> },
              { key: "avgR", header: "Avg R", align: "right", render: (s) => <span className="num" style={{ color: (s.avgR ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}>{s.avgR != null ? `${fmt(s.avgR)}R` : "—"}</span> },
              { key: "netPnl", header: "Net P&L", align: "right", render: (s) => <span className="num" style={{ color: s.netPnl >= 0 ? "var(--win)" : "var(--loss)" }}>{money(s.netPnl, sym)}</span> },
              { key: "edge", header: "Edge", render: (s) => s.prune ? <EdgeBadge label="Poda sugerida" tone="loss" /> : s.edge === "positive" ? <EdgeBadge label="Positivo" tone="win" /> : <EdgeBadge label="Neutral" tone="ink" /> },
            ]}
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">Tags · veneno y oro</h3>
        {tags.byTag.length === 0 ? <Empty msg="Etiqueta tus trades para ver el edge por tag." /> : (
          <SimpleTable
            data={tags.byTag}
            getRowKey={(t) => t.tag}
            density="compact"
            columns={[
              { key: "tag", header: "Tag", width: "minmax(100px, 1.4fr)", render: (t) => <span className="text-[var(--ink)]">{t.tag}</span> },
              { key: "trades", header: "Trades", align: "right", hideBelow: "md", render: (t) => <span className="num">{t.trades}</span> },
              { key: "avgR", header: "Avg R", align: "right", render: (t) => <span className="num" style={{ color: (t.avgR ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}>{t.avgR != null ? `${fmt(t.avgR)}R` : "—"}</span> },
              { key: "winRate", header: "Win Rate", align: "right", hideBelow: "sm", render: (t) => <span className="num">{fmt(t.winRate)}%</span> },
              { key: "class", header: "Clase", render: (t) => t.classification === "gold" ? <EdgeBadge label="Oro" tone="win" /> : t.classification === "poison" ? <EdgeBadge label="Veneno" tone="loss" /> : <EdgeBadge label="Neutral" tone="ink" /> },
            ]}
          />
        )}
      </section>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] py-12 text-center text-[12px] text-[var(--ink-3)]">{msg}</div>
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("3M")
  const [section, setSection] = useState("performance")
  const includePractice = usePracticeScope((s) => s.includePractice)
  const { data, isLoading, isError } = trpc.analytics.overview.useQuery({ period, includePractice }, { staleTime: 30_000 })
  const institutional = trpc.analytics.institutional.useQuery({ period, includePractice }, { staleTime: 30_000, enabled: section === "institucional" })
  const improvement = trpc.improvement.overview.useQuery(undefined, { staleTime: 60_000, enabled: section === "mejora" })
  const instruments = trpc.edges.instruments.useQuery(undefined, { staleTime: 60_000, enabled: section === "edges" })
  const tagEdges = trpc.edges.tags.useQuery(undefined, { staleTime: 60_000, enabled: section === "edges" })
  const sym = currencySymbol(data?.baseCurrency ?? "USD")

  return (
    <main aria-label="Analytics">
      <TopBar title="Analytics" subtitle="Centro de inteligencia · qué está ocurriendo y por qué" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <SegmentedTabs variant="pill" options={SECTIONS} value={section} onChange={setSection} ariaLabel="Secciones de analytics" className="flex-wrap" />
        <div className="flex flex-wrap items-center gap-4">
          <PracticeToggle />
          <FilterBar options={PERIODS} value={period} onChange={(v) => setPeriod(v as Period)} ariaLabel="Periodo" />
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4">
        <AiInsightsPanel period={period} includePractice={includePractice} />
        <BehaviorLoopPanel />
      </div>

      {isLoading ? (
        <SkeletonKpiStrip />
      ) : isError || !data ? (
        <p className="text-sm text-[var(--loss)] py-8">No se pudieron cargar los datos de analytics.</p>
      ) : (
        <>
          {section === "mejora" && (
            improvement.isLoading || !improvement.data
              ? <SkeletonKpiStrip />
              : <ImprovementPanel d={improvement.data} money={(n) => amt(n, sym)} />
          )}
          {section === "performance" && <Performance d={data} />}
          {section === "risk"        && <Risk d={data} />}
          {section === "institucional" && (
            institutional.isLoading || !institutional.data
              ? <SkeletonKpiStrip />
              : <Institutional d={institutional.data} sym={sym} />
          )}
          {section === "edges" && (
            instruments.isLoading || tagEdges.isLoading || !instruments.data || !tagEdges.data
              ? <SkeletonKpiStrip />
              : <Edges instruments={instruments.data} tags={tagEdges.data} sym={sym} />
          )}
          {section === "accounts"    && <AccountsIntel d={data} />}
          {section === "setups"      && <Setups d={data} />}
          {section === "markets"     && <Markets d={data} />}
          {section === "psychology"  && <Psychology d={data} />}
          {section === "goals"       && <Goals d={data} />}
          {section === "withdrawals" && <Withdrawals d={data} />}
        </>
      )}
    </main>
  )
}

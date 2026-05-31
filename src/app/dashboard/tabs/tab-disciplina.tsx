"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { Shield, CheckCircle2, Award, Target, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { KpiCard } from "@/components/ui/kpi-card"
import { Card } from "../components/card"
import { ChartTooltip } from "../components/chart-tooltip"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type DashboardStats = RouterOutputs["trades"]["dashboardStats"]

const HEAT_COLORS: Record<string, string> = {
  "null": "var(--panel-2)",
  "0":    "var(--win)",
  "1":    "var(--be)",
  "2":    "var(--loss)",
}
const DAYS  = ["L","M","X","J","V","S","D"]
const WEEKS = 12

type HeatVal = null | 0 | 1 | 2

export function TabDisciplina({ kpis, discipline }: {
  kpis:       DashboardStats["kpis"]
  discipline: DashboardStats["discipline"]
}) {
  const today    = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  // ── Live rule violation stats (T-V-001) ────────────────────────────────────
  const { data: violationStats } = trpc.trades.ruleViolationStats.useQuery(undefined, { staleTime: 60_000 })

  // ── Mood correlation (T-V-004) ────────────────────────────────────────────
  const { data: moodCorr } = trpc.tradingSessions.moodCorrelation.useQuery(undefined, { staleTime: 60_000 })

  // ── Behavioral pattern insights (T-VI-002) ───────────────────────────────
  const { data: patterns, isLoading: patternsLoading } = trpc.trades.patternInsights.useQuery(undefined, { staleTime: 120_000 })

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discipline.heatmapData, todayISO])

  const { composition, aplusStats, violations, weeklyScore, rDistribution, costoIndisciplina, rachaDiasLimpios } = discipline
  const { tradesCountToday } = kpis
  const total = kpis.total

  const disciplineScore = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
  const planSeguidoPct  = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
  const totalViolations = violations.reduce((s: number, v: { rule: string; count: number }) => s + v.count, 0)
  const sinViolacionPct = total > 0 ? (((total - totalViolations) / total) * 100).toFixed(2) : "0.00"

  const compData = [
    { name: "Plan seguido", value: composition.planSeguido, color: "var(--win)"  },
    { name: "Plan parcial",  value: composition.partial,    color: "var(--be)"   },
    { name: "Off-plan",      value: composition.offPlan,    color: "var(--loss)" },
  ]

  type ViolationRow = { rule: string; count: number; severity: "mayor" | "menor" }

  // Live violations display (T-V-001): use live query counts, fall back to dashboard data
  const liveViolations: ViolationRow[] = violationStats
    ? [
        { rule: "Flag impulsivo manual",    count: violationStats.byTag["Impulsivo"] ?? 0, severity: "mayor" as const },
        { rule: "Off-plan",                 count: violationStats.byTag["Off-plan"]  ?? 0, severity: "mayor" as const },
        { rule: "Revanche / revenge trade", count: violationStats.byTag["Revanche"]  ?? 0, severity: "mayor" as const },
        { rule: "Sin setup asignado",       count: violations.find((v: { rule: string; count: number }) => v.rule === "Sin setup asignado")?.count ?? 0, severity: "menor" as const },
      ].filter((v: { count: number }) => v.count > 0)
    : (violations as ViolationRow[])

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
              { label: "Sin violación",  value: `${sinViolacionPct}%`,    sub: `${total} trades total`,          color: "var(--win)"  },
              { label: "Plan seguido",   value: `${planSeguidoPct}%`,     sub: `${composition.planSeguido} / ${total}`, color: "#4f6ef7" },
              { label: "Off-plan count", value: `${composition.offPlan}`, sub: "trades off-plan",                color: "var(--loss)" },
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
            {rDistribution.map((d: { bucket: string; count: number }) => {
              const maxCount = Math.max(...rDistribution.map((x: { count: number }) => x.count), 1)
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

        {/* Violations by tag — live query (T-V-001) */}
        <Card title="Violaciones por tag">
          <div className="flex flex-col gap-0">
            {liveViolations.map(v => (
              <div key={v.rule} className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: v.severity === "mayor" ? "var(--loss)" : "var(--be)" }} />
                <p className="flex-1 text-sm text-[var(--ink)]">{v.rule}</p>
                <span className="font-mono font-bold text-[var(--ink)] text-sm shrink-0">{v.count}</span>
              </div>
            ))}
            {liveViolations.length === 0 && (
              <p className="py-4 text-center text-[var(--ink-3)] text-sm">Sin violaciones registradas</p>
            )}
          </div>
        </Card>
      </div>

      {/* Monthly violation chart (T-V-001) */}
      {violationStats && violationStats.byMonth.length > 1 && (
        <Card title="Violaciones por mes" sub="Conteo total de trades con tag de violación">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={violationStats.byMonth} barSize={16}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chip)", opacity: 0.5 }} />
              <Bar dataKey="count" name="Violaciones" fill="var(--loss)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Mood vs win rate correlation (T-V-004) */}
      {moodCorr && moodCorr.rows.some(r => r.sessions > 0) && (
        <Card
          title="Estado de ánimo vs. Win Rate"
          sub={`Basado en ${moodCorr.totalSessions} sesiones con datos de estado`}
        >
          <div className="flex flex-col gap-3 mt-1">
            {moodCorr.rows.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-[var(--ink-2)] w-36 shrink-0">{row.label}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--panel-2)]">
                  {row.winRate != null && (
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${row.winRate}%`,
                        background: row.winRate >= 55 ? "var(--win)" : row.winRate >= 45 ? "var(--be)" : "var(--loss)",
                      }}
                    />
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-[var(--ink)] w-12 text-right shrink-0">
                  {row.winRate != null ? `${row.winRate}%` : "—"}
                </span>
                <span className="text-[10px] text-[var(--ink-3)] w-14 shrink-0">{row.sessions} ses.</span>
              </div>
            ))}
          </div>
          {(() => {
            const high = moodCorr.rows.find(r => r.label.includes("alto"))
            const low  = moodCorr.rows.find(r => r.label.includes("bajo"))
            if (high?.winRate != null && low?.winRate != null && Math.abs(high.winRate - low.winRate) >= 5) {
              return (
                <p className="text-[11px] text-[var(--ink-3)] mt-3 border-t border-[var(--line)] pt-3">
                  Rindes mejor cuando tu estado de ánimo es alto ({high.winRate}% WR vs {low.winRate}% cuando bajo).
                </p>
              )
            }
            return null
          })()}
        </Card>
      )}

      {/* Insights detectados (T-VI-002) */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-[#4f6ef7]" />
          <p className="text-[13px] font-semibold text-[var(--ink)]">Insights detectados</p>
          <p className="text-[11px] text-[var(--ink-3)] ml-1">Patrones de comportamiento basados en tu historial</p>
        </div>

        {patternsLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] h-20 animate-pulse" />
            ))}
          </div>
        )}

        {!patternsLoading && (!patterns || patterns.length === 0) && (
          <p className="text-sm text-[var(--ink-3)] text-center py-4">
            No se detectaron patrones con suficientes datos.
          </p>
        )}

        {!patternsLoading && patterns && patterns.length > 0 && (
          <div className="flex flex-col gap-3">
            {patterns.map(p => {
              const badgeColor =
                p.confidence === "high"   ? "var(--loss)" :
                p.confidence === "medium" ? "var(--be)"   : "var(--win)"
              const badgeLabel =
                p.confidence === "high"   ? "Alta"   :
                p.confidence === "medium" ? "Media"  : "Baja"

              return (
                <div
                  key={p.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--line)] p-4 flex flex-col gap-2"
                  style={{ borderLeftWidth: 3, borderLeftColor: badgeColor }}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--ink)] flex-1">{p.title}</p>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ background: badgeColor, color: "white" }}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-2)]">{p.description}</p>
                  <p className="text-[10px] text-[var(--ink-3)] italic">{p.evidence}</p>
                  <div className="flex items-start gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4f6ef7] shrink-0 mt-0.5">Acción</span>
                    <p className="text-[11px] text-[var(--ink-2)]">{p.actionable}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

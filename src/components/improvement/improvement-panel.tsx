"use client"

import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, Activity, Info } from "lucide-react"
import type { RouterOutputs } from "@/server/trpc/root"

type Improvement = RouterOutputs["improvement"]["overview"]

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 })
const REGIME_LABEL: Record<string, string> = { trend: "Tendencia", range: "Rango", volatile: "Volátil" }

function scoreColor(s: number) {
  return s >= 70 ? "var(--win)" : s >= 45 ? "var(--be)" : "var(--loss)"
}

/** ImprovementScore (#41) — the North Star: composite 0–100 with driver
 *  decomposition + regime performance (#33, experimental) + cost of indiscipline
 *  (#49). Every number deterministic (P2). */
export function ImprovementPanel({ d, money }: { d: Improvement; money: (n: number) => string }) {
  if (!d.hasData) {
    return <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] py-12 text-center text-[12px] text-[var(--ink-3)]">Registra trades reales para construir tu índice de mejora.</div>
  }
  const score = d.improvement.score
  const color = scoreColor(score)

  return (
    <div className="flex flex-col gap-4">
      {/* Score hero + drivers */}
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-5 grid gap-5 md:grid-cols-[200px_1fr] items-center">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={13} style={{ color: "var(--coach)" }} /><span className="text-eyebrow">Índice de mejora</span></div>
          <p className="num font-bold leading-none" style={{ fontSize: 52, color }}>{Math.round(score)}</p>
          <p className="text-[11px] text-[var(--ink-3)] mt-1">de 100 · {d.sampleSize} trades</p>
          {d.series.length >= 2 && (() => {
            const first = d.series[0].score
            const delta = score - first
            return (
              <div className="w-full mt-2">
                <div className="h-10 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d.series} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0].payload as { date: string; score: number }
                        return <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2 py-1 shadow-[var(--shadow-lg)] text-[10px]"><span className="num font-bold">{Math.round(p.score)}</span> · {p.date.slice(5)}</div>
                      }} />
                      <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] num mt-0.5" style={{ color: delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))} vs hace {d.series.length} días
                </p>
              </div>
            )
          })()}
        </div>
        <div className="flex flex-col gap-2.5">
          {d.improvement.drivers.map((dr) => {
            const fill = dr.maxPoints > 0 ? (dr.points / dr.maxPoints) * 100 : 0
            const c = fill >= 66 ? "var(--win)" : fill >= 40 ? "var(--be)" : "var(--loss)"
            return (
              <div key={dr.key}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="text-[var(--ink-2)]">{dr.label}</span>
                  <span className="num text-[var(--ink-3)]">{fmt(dr.points)} / {fmt(dr.maxPoints)} pts</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                  <div className="h-full rounded-full" style={{ width: `${fill}%`, background: c }} />
                </div>
              </div>
            )
          })}
          <p className="text-[11px] text-[var(--ink-3)] mt-1">
            Coste de indisciplina acumulado: <span className="num font-semibold" style={{ color: d.indisciplineCost > 0 ? "var(--loss)" : "var(--ink-2)" }}>{money(d.indisciplineCost)}</span>
          </p>
        </div>
      </div>

      {/* Regime performance */}
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={13} className="text-[var(--ink-3)]" />
          <p className="text-eyebrow">Rendimiento por régimen</p>
          {d.regime.experimental && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--ink-3)]" title="El régimen es una etiqueta manual/proxy (FREEZE-D18)">
              <Info size={11} /> experimental
            </span>
          )}
        </div>
        {d.regime.byRegime.length === 0 ? (
          <p className="text-[11.5px] text-[var(--ink-3)]">Etiqueta el régimen de tus trades (tendencia/rango/volátil) en la captura para ver dónde rindes mejor.</p>
        ) : (
          <>
            {d.regime.best && d.regime.worst && (
              <p className="text-[12px] text-[var(--ink-2)] mb-3">
                Ganas en <span className="font-semibold" style={{ color: "var(--win)" }}>{REGIME_LABEL[d.regime.best.regime] ?? d.regime.best.regime}</span>
                {" "}({fmt(d.regime.best.avgR ?? 0)}R), peor en <span className="font-semibold" style={{ color: "var(--loss)" }}>{REGIME_LABEL[d.regime.worst.regime] ?? d.regime.worst.regime}</span> ({fmt(d.regime.worst.avgR ?? 0)}R).
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {d.regime.byRegime.map((r) => (
                <div key={r.regime} className="flex items-center justify-between text-[12px] rounded-[var(--radius-sm)] px-3 py-2" style={{ background: "var(--panel-2)" }}>
                  <span className="font-medium text-[var(--ink)]">{REGIME_LABEL[r.regime] ?? r.regime}</span>
                  <span className="flex items-center gap-4 num text-[11px] text-[var(--ink-3)]">
                    <span>{r.trades}t</span>
                    <span>WR {fmt(r.winRate)}%</span>
                    <span style={{ color: (r.avgR ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}>{r.avgR != null ? `${fmt(r.avgR)}R` : "—"}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

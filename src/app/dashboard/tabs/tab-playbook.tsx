"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"

function sessionCellColor(pct: number) {
  if (pct >= 65) return { bg: "rgba(34,197,94,0.20)",  text: "var(--win)"  }
  if (pct >= 50) return { bg: "rgba(232,150,42,0.20)", text: "var(--be)"   }
  return           { bg: "rgba(224,85,85,0.20)",  text: "var(--loss)" }
}

// TASK-064: Setup health indicator dot
import type { SetupHealthStatus } from "@/lib/formulas/setup"

const HEALTH_CONFIG: Record<SetupHealthStatus, { dot: string; label: string; color: string }> = {
  healthy:      { dot: "🟢", label: "Saludable",    color: "var(--win)"  },
  warning:      { dot: "🟡", label: "Atención",     color: "var(--be)"   },
  critical:     { dot: "🔴", label: "Crítico",      color: "var(--loss)" },
  insufficient: { dot: "⚪", label: "Insuficiente", color: "var(--ink-3)" },
}

function SetupHealthDot({ health, winRate, avgR, expectedWr, expectedAvgR }: {
  health:       SetupHealthStatus
  winRate:      number
  avgR:         number
  expectedWr:   number | null
  expectedAvgR: number | null
}) {
  const cfg = HEALTH_CONFIG[health]
  const tooltip = health === "insufficient"
    ? "Menos de 5 trades — insuficiente para evaluar"
    : [
        expectedWr   != null ? `WR: ${winRate.toFixed(0)}% (esp. ${expectedWr.toFixed(0)}%)` : null,
        expectedAvgR != null ? `Avg R: ${avgR.toFixed(2)} (esp. ${expectedAvgR.toFixed(2)})` : null,
      ].filter(Boolean).join(" · ") || cfg.label

  return (
    <span
      className="text-[14px] shrink-0 cursor-default select-none"
      title={`${cfg.label} · ${tooltip}`}
      aria-label={`Salud del setup: ${cfg.label}`}
    >
      {cfg.dot}
    </span>
  )
}

function checklistColor(pct: number) {
  if (pct >= 80) return "var(--win)"
  if (pct >= 65) return "var(--be)"
  return "var(--loss)"
}

/** Returns Monday of the current ISO week as "YYYY-Www" for stable weekly dismiss keys. */
function getWeekKey(): string {
  const d = new Date()
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

// ── Lifecycle Suggestions (T-VIII-003) ─────────────────────────────────────

function LifecycleSuggestions() {
  const { data: suggestions } = trpc.setups.lifecycleCheck.useQuery(undefined, { staleTime: 300_000 })
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Load dismissals from localStorage on mount
  useEffect(() => {
    const weekKey = getWeekKey()
    const stored  = Object.keys(localStorage)
      .filter(k => k.startsWith("dismissed_suggestion_") && k.endsWith(`_${weekKey}`))
      .map(k => k.replace(`dismissed_suggestion_`, "").replace(`_${weekKey}`, ""))
    setDismissed(new Set(stored))
  }, [])

  const visible = (suggestions ?? []).filter(s => !dismissed.has(s.setupId))
  if (visible.length === 0) return null

  const dismiss = (setupId: string) => {
    const weekKey = getWeekKey()
    localStorage.setItem(`dismissed_suggestion_${setupId}_${weekKey}`, "1")
    setDismissed(prev => new Set([...prev, setupId]))
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-5">
      <p className="text-[13px] font-semibold text-[var(--ink)] mb-3">Sugerencias del sistema</p>
      <div className="flex flex-col gap-2">
        {visible.map(s => {
          const isPause = s.suggestion === "PAUSE"
          const borderColor = isPause ? "var(--loss)" : "var(--be)"
          const badgeBg     = isPause ? "var(--loss)" : "#f59e0b"
          return (
            <div
              key={s.setupId}
              className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)] border"
              style={{ borderColor, background: isPause ? "rgba(224,85,85,0.06)" : "rgba(245,158,11,0.06)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] font-bold text-[var(--ink)]">{s.setupAbbr}</span>
                  <span className="text-[11px] text-[var(--ink-2)]">{s.setupName}</span>
                  <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: badgeBg }}>
                    {s.suggestion}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--ink-2)] font-medium">{s.reason}</p>
                <p className="text-[11px] text-[var(--ink-3)] italic mt-0.5">{s.evidence}</p>
              </div>
              <button
                onClick={() => dismiss(s.setupId)}
                className="shrink-0 text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors border border-[var(--line)] rounded-[var(--radius-sm)] px-2 py-1"
              >
                Descartar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TabPlaybook() {
  const router = useRouter()
  const { data, isLoading } = trpc.setups.performanceStats.useQuery(undefined, { staleTime: 60_000 })

  const setupStats     = data?.setupStats     ?? []
  const sessionMatrix  = data?.sessionMatrix  ?? []
  const directionStats = data?.directionStats ?? []
  const playbookSummary = data?.playbookSummary ?? null

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-[var(--ink-3)] text-sm">Cargando…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* T-VIII-003: Lifecycle suggestions section */}
      <LifecycleSuggestions />

      {playbookSummary && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Más usado",    text: `${playbookSummary.mostUsed.abbr} · ${playbookSummary.mostUsed.trades} trades`, color: "var(--accent)" },
            { label: "Más rentable",  text: `${playbookSummary.mostProfitable.abbr} · ${playbookSummary.mostProfitable.netPnl >= 0 ? "+" : "-"}$${Math.abs(playbookSummary.mostProfitable.netPnl).toFixed(2)}`, color: "var(--win)" },
            { label: "En racha",       text: playbookSummary.setupInStreak.currentStreak > 0 ? `${playbookSummary.setupInStreak.abbr} · ${playbookSummary.setupInStreak.currentStreak}W` : "—", color: "var(--be)" },
            { label: "Mejor A+",       text: `${playbookSummary.bestAplus.abbr} · ${playbookSummary.bestAplus.aplusRate.toFixed(2)}%`, color: "var(--accent)" },
          ].map(({ label, text, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)]">
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

              // T-VIII-002: expected WR color coding
              const actualWr      = s.winRate
              const expectedWr    = s.expectedWr
              const wrColor: string = expectedWr != null
                ? actualWr >= expectedWr - 5  ? "var(--win)"
                : actualWr >= expectedWr - 10 ? "var(--be)"
                : "var(--loss)"
                : win ? "var(--win)" : "var(--loss)"

              return (
                <div key={s.setupId}
                  onClick={() => router.push(`/playbook?highlight=${s.setupId}`)}
                  className="rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden cursor-pointer hover:border-[var(--accent)] transition-colors"
                  style={{ background: "var(--panel-2)" }}>
                  <div className="flex items-center gap-2.5 p-3 pb-2">
                    <span className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: s.color }}>{s.abbr}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[var(--ink)] leading-tight truncate">{s.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{s.trades} trades</p>
                    </div>
                    {/* TASK-064: Setup health indicator */}
                    <SetupHealthDot health={s.health} winRate={s.winRate} avgR={s.avgR} expectedWr={s.expectedWr} expectedAvgR={s.expectedAvgR} />
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
                      ["Win", `${s.winRate}%`, wrColor],
                      ["Avg R", `${s.avgR > 0 ? "+" : ""}${s.avgR.toFixed(2)}`, s.avgR > 0 ? "var(--win)" : "var(--loss)"],
                      ["Cum",  `${s.cumR > 0 ? "+" : ""}${s.cumR.toFixed(1)}R`, s.cumR > 0 ? "var(--win)" : "var(--loss)"],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <p className="text-[9px] text-[var(--ink-3)] uppercase tracking-wider">{l}</p>
                        <p className="text-[13px] font-mono font-bold" style={{ color: c as string }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-1 flex justify-between text-[10px] text-[var(--ink-3)]">
                    <span>P&amp;L: <span className={s.netPnl >= 0 ? "text-[var(--win)]" : "text-[var(--loss)]"}>
                      {s.netPnl >= 0 ? "+" : ""}${Math.abs(s.netPnl).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span></span>
                  </div>
                  {/* T-VIII-002: actual vs expected WR color coding */}
                  {expectedWr != null && (
                    <div className="px-3 pb-1 text-[10px]">
                      <span style={{ color: wrColor }}>
                        WR {actualWr.toFixed(0)}%
                      </span>
                      <span className="text-[var(--ink-3)]"> / esperado {expectedWr.toFixed(0)}%</span>
                    </div>
                  )}
                  {/* T-VIII-001: bestSession / bestDayOfWeek row */}
                  {(s.bestSession != null || s.bestDayOfWeek != null) && (
                    <div className="px-3 pb-2 flex gap-3 text-[10px] text-[var(--ink-3)]">
                      {s.bestSession != null && (
                        <span>Sesión: <span className="text-[var(--be)] font-semibold">{s.bestSession}</span></span>
                      )}
                      {s.bestDayOfWeek != null && (
                        <span>Día: <span className="text-[var(--be)] font-semibold">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][s.bestDayOfWeek]}</span></span>
                      )}
                    </div>
                  )}
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
                              style={{ background: setup?.color ?? "var(--accent)" }}>{setup?.abbr ?? "?"}</span>
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

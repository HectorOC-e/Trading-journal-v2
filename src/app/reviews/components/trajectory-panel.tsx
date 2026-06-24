"use client"

// Top card of the unified /reviews index: the "Trayectoria" panel. Left side plots a
// per-week grade/discipline series (sparkline + grade "beads") and three from→to trend
// stats; the right side surfaces up to two recurring-pattern cards (from the Analytics
// insights engine). Data comes from weeklyReviews.overview — whole history by default,
// or the active year/month filter. Faithful port of the Reviews.dc.html design.

import { motion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import type { VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type Overview = RouterOutputs["weeklyReviews"]["overview"]

const TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)", bg: "var(--win-soft)" },
  mid: { fg: "var(--be)", bg: "var(--be-soft)" },
  bad: { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

/** Min–max normalized sparkline path over the score series (mirrors the design's spark2). */
function spark(arr: number[]) {
  const n = arr.length
  if (n === 0) return null
  const mn = Math.min(...arr), mx = Math.max(...arr), rng = Math.max(1, mx - mn)
  const pts = arr.map((v, i) => [n === 1 ? 0 : (i / (n - 1)) * 100, 85 - ((v - mn) / rng) * 68] as const)
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")
  const area = line + " L100,100 L0,100 Z"
  const last = pts[n - 1]
  return { line, area, ex: last[0].toFixed(1), ey: last[1].toFixed(1) }
}

export function TrajectoryPanel({ data, isLoading }: { data?: Overview; isLoading: boolean }) {
  if (isLoading || !data) {
    return <div className="h-[300px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse mb-7" />
  }

  const sg = data.scores.length ? spark(data.scores) : null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden mb-7"
      style={{ boxShadow: "0 1px 3px rgba(20,20,45,.05), 0 10px 30px rgba(20,20,45,.04)" }}
    >
      <div className="grid lg:grid-cols-[1.55fr_1fr]">
        {/* ── Left: trajectory ── */}
        <div className="p-5 sm:p-6">
          <div className="text-[10px] font-bold tracking-[0.13em] text-[var(--ink-3)]">TRAYECTORIA · TU HISTORIAL</div>
          <div className="flex items-baseline gap-3 mt-2 flex-wrap">
            <span className="text-[26px] font-extrabold tracking-[-0.025em] text-[var(--ink)]">{data.headline}</span>
            {data.trendDeltaText && (
              <span className="inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: data.trendPositive ? "var(--win)" : "var(--loss)" }}>
                {data.trendPositive ? "▲" : "▼"} {data.trendDeltaText}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--ink-3)]">{data.sub}</p>

          {/* Sparkline */}
          {sg && (
            <div className="relative mt-4">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full block overflow-visible" style={{ height: 100 }}>
                <defs>
                  <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--accent)" stopOpacity="0.20" />
                    <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sg.area} fill="url(#traj-fill)" />
                <path
                  d={sg.line} fill="none" stroke="var(--accent)" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                  className="traj-line"
                />
              </svg>
              <span
                className="absolute w-[9px] h-[9px] rounded-full bg-[var(--accent)] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${sg.ex}%`, top: `${sg.ey}%`, boxShadow: "0 0 0 3px var(--panel), 0 0 9px 1px color-mix(in srgb, var(--accent) 55%, transparent)" }}
              />
            </div>
          )}

          {/* Month axis */}
          {data.months.length > 0 && (
            <div className="flex justify-between mt-1">
              {data.months.map((m, i) => (
                <span key={i} className="text-[10px] font-semibold text-[var(--ink-3)]">{m}</span>
              ))}
            </div>
          )}

          {/* Grade beads */}
          {data.beads.length > 0 && (
            <div className="flex items-end gap-1 mt-4">
              {data.beads.map(b => {
                const t = TONE[b.tone]
                return (
                  <div key={b.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="font-mono font-bold text-[10px] w-full h-[21px] rounded-[5px] grid place-items-center" style={{ color: t.fg, background: t.bg }}>{b.grade}</span>
                    <span className="text-[7.5px] text-[var(--ink-3)] truncate max-w-full">{b.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* From→to stats */}
          {data.stats.length > 0 && (
            <div className="flex gap-4 mt-[18px] pt-4 border-t border-[var(--line)]">
              {data.stats.map(s => (
                <div key={s.label} className="flex-1 min-w-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--ink-3)] font-semibold">{s.label}</div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="font-mono font-bold text-[16px] text-[var(--ink)]">{s.to}</span>
                    <span className="text-[11px] font-bold" style={{ color: s.positive ? "var(--win)" : "var(--loss)" }}>{s.deltaText}</span>
                  </div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-0.5">desde {s.from}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: recurring patterns ── */}
        <div className="p-5 sm:p-[22px] border-t lg:border-t-0 lg:border-l border-[var(--line)] bg-[var(--panel-2)] flex flex-col gap-[13px]">
          <div className="text-[10px] font-bold tracking-[0.13em] text-[var(--ink-3)]">PATRÓN RECURRENTE</div>
          {data.patterns.length === 0 ? (
            <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">Aún no hay suficientes operaciones para detectar patrones. Sigue registrando tus semanas.</p>
          ) : (
            data.patterns.map((p, i) => {
              const t = TONE[p.tone]
              return (
                <div key={i} className="rounded-[11px] bg-[var(--panel)] border border-[var(--line)] p-3.5">
                  <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-[3px] tracking-[0.02em]" style={{ color: t.fg, background: t.bg }}>{p.tag}</span>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{p.body}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </motion.section>
  )
}

"use client"

// Top card of the unified /reviews index: the "Trayectoria" panel. Left side plots a
// per-week grade/discipline series (sparkline + grade "beads") and three from→to trend
// stats; the right side surfaces up to two recurring-pattern cards (from the Analytics
// insights engine). Data comes from weeklyReviews.overview — whole history by default,
// or the active year/month filter. Faithful port of the Reviews.dc.html design.

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { motion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import type { VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type Overview = RouterOutputs["weeklyReviews"]["overview"]
type Bead = Overview["beads"][number]

const TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)", bg: "var(--win-soft)" },
  mid: { fg: "var(--be)", bg: "var(--be-soft)" },
  bad: { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

// Staggered reveal for the grade beads (after the sparkline starts drawing).
const BEADS = { hidden: {}, show: { transition: { staggerChildren: 0.022, delayChildren: 0.18 } } }
const BEAD = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }
const STATS = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }
const STAT = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }
const HOVER = { duration: 0.16, ease: EASE_OUT }

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`
const fmtWeek = (ws: string) => new Date(ws + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })

/** Min–max normalized sparkline geometry over the score series (mirrors the design's spark2). */
function buildChart(scores: number[]) {
  const n = scores.length
  const mn = Math.min(...scores), mx = Math.max(...scores), rng = Math.max(1, mx - mn)
  const pts = scores.map((v, i) => ({ x: n === 1 ? 50 : (i / (n - 1)) * 100, y: 85 - ((v - mn) / rng) * 68 }))
  const line = pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")
  const area = line + ` L${pts[n - 1].x.toFixed(1)},100 L${pts[0].x.toFixed(1)},100 Z`
  return { pts, line, area }
}

/**
 * Interactive discipline sparkline. Hovering anywhere over it snaps to the nearest week,
 * drawing a vertical guide + highlighted node and a tooltip with that week's grade,
 * discipline score, P&L and win rate — the per-point detail charts usually expose.
 */
function TrajectoryChart({ beads, scores, months }: { beads: Bead[]; scores: number[]; months: string[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const n = scores.length
  if (n === 0) return null
  const { pts, line, area } = buildChart(scores)

  const onMove = (e: ReactMouseEvent) => {
    const el = ref.current
    if (!el || n < 2) { setHover(n === 1 ? 0 : null); return }
    const rect = el.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))))
  }

  const hv = hover != null ? { p: pts[hover], b: beads[hover] } : null
  const last = pts[n - 1]

  return (
    <div className="mt-4">
      {/* What the chart plots */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--ink-3)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />Disciplina semanal
        </span>
        <span className="text-[10px] text-[var(--ink-3)]">escala 0–100 · {n} semana{n === 1 ? "" : "s"}</span>
      </div>

      <div ref={ref} className="relative cursor-crosshair" style={{ height: 100 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full block overflow-visible">
          <defs>
            <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.20" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#traj-fill)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="traj-line" />
        </svg>

        {/* Vertical guide on hover */}
        {hv && (
          <span className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: `${hv.p.x}%`, background: "color-mix(in srgb, var(--accent) 35%, transparent)" }} />
        )}

        {/* Endpoint dot (hidden while hovering the last point to avoid doubling) */}
        {!(hv && hover === n - 1) && (
          <span
            className="absolute w-[9px] h-[9px] rounded-full bg-[var(--accent)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${last.x}%`, top: `${last.y}%`, boxShadow: "0 0 0 3px var(--panel), 0 0 9px 1px color-mix(in srgb, var(--accent) 55%, transparent)" }}
          />
        )}

        {/* Hover node + tooltip */}
        {hv && (
          <>
            <span
              className="absolute w-[11px] h-[11px] rounded-full bg-[var(--accent)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${hv.p.x}%`, top: `${hv.p.y}%`, boxShadow: "0 0 0 3px var(--panel), 0 0 0 4px color-mix(in srgb, var(--accent) 28%, transparent)" }}
            />
            <div
              className="absolute z-50 pointer-events-none rounded-[9px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(20,20,45,.16)] px-3 py-2 w-[148px]"
              style={{
                left: `${hv.p.x}%`,
                top: `${hv.p.y}%`,
                transform: `translate(${hv.p.x < 18 ? "0" : hv.p.x > 82 ? "-100%" : "-50%"}, ${hv.p.y < 45 ? "14px" : "calc(-100% - 14px)"})`,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-[11px] text-[var(--ink)]">{hv.b.label}</span>
                <span className="text-[10px] text-[var(--ink-3)]">{fmtWeek(hv.b.weekStart)}</span>
              </div>
              <TipRow label="Nota" value={hv.b.grade} color={TONE[hv.b.tone].fg} />
              <TipRow label="Disciplina" value={String(hv.b.score)} />
              <TipRow label="P&L" value={money(hv.b.net)} color={hv.b.net >= 0 ? "var(--win)" : "var(--loss)"} />
              <TipRow label="Win rate" value={`${Math.round(hv.b.winRate)}%`} />
            </div>
          </>
        )}
      </div>

      {/* Month axis */}
      {months.length > 0 && (
        <div className="flex justify-between mt-1">
          {months.map((m, i) => (
            <span key={i} className="text-[10px] font-semibold text-[var(--ink-3)]">{m}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function TipRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-[1.5px]">
      <span className="text-[10.5px] text-[var(--ink-3)]">{label}</span>
      <span className="font-mono font-bold text-[11px]" style={{ color: color ?? "var(--ink)" }}>{value}</span>
    </div>
  )
}

export function TrajectoryPanel({ data, isLoading }: { data?: Overview; isLoading: boolean }) {
  if (isLoading || !data) {
    return <div className="h-[300px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse mb-7" />
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="group rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden mb-6 transition-[box-shadow,border-color] duration-300 shadow-[0_1px_3px_rgba(20,20,45,.05),0_10px_30px_rgba(20,20,45,.04)] hover:shadow-[0_6px_18px_rgba(20,20,45,.08),0_20px_46px_rgba(20,20,45,.06)] hover:border-[color-mix(in_srgb,var(--accent)_22%,var(--line))]"
    >
      {/* Full-width band — recurring patterns now live in the index rail. */}
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

          {/* Interactive discipline sparkline (hover for per-week detail) */}
          {data.scores.length > 0 && <TrajectoryChart beads={data.beads} scores={data.scores} months={data.months} />}

          {/* Grade beads */}
          {data.beads.length > 0 && (
            <motion.div className="flex items-end gap-1 mt-4" variants={BEADS} initial="hidden" animate="show">
              {data.beads.map(b => {
                const t = TONE[b.tone]
                return (
                  <motion.div
                    key={b.weekStart}
                    variants={BEAD}
                    whileHover={{ y: -3, scale: 1.08 }}
                    transition={HOVER}
                    title={`${b.label} · ${b.grade}`}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0 cursor-default"
                  >
                    <span className="font-mono font-bold text-[10px] w-full h-[21px] rounded-[5px] grid place-items-center" style={{ color: t.fg, background: t.bg }}>{b.grade}</span>
                    <span className="text-[7.5px] text-[var(--ink-3)] truncate max-w-full">{b.label}</span>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* From→to stats */}
          {data.stats.length > 0 && (
            <motion.div className="flex gap-4 mt-[18px] pt-4 border-t border-[var(--line)]" variants={STATS} initial="hidden" animate="show">
              {data.stats.map(s => (
                <motion.div key={s.label} variants={STAT} whileHover={{ y: -2 }} transition={HOVER} className="flex-1 min-w-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--ink-3)] font-semibold">{s.label}</div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="font-mono font-bold text-[16px] text-[var(--ink)]">{s.to}</span>
                    <span className="text-[11px] font-bold" style={{ color: s.positive ? "var(--win)" : "var(--loss)" }}>{s.deltaText}</span>
                  </div>
                  <div className="text-[10px] text-[var(--ink-3)] mt-0.5">desde {s.from}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
      </div>
    </motion.section>
  )
}

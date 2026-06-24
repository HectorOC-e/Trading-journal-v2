"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MoreHorizontal, ArrowUpRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DUR, EASE_OUT } from "@/lib/motion"
import { MiniSparkline } from "@/components/ui/mini-sparkline"
import { deriveGrade, deriveVerdict, splitChips, metricChips, type VerdictTone } from "@/server/services/reviews/verdict"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB = RouterOutputs["weeklyReviews"]["list"][number]

// ── Helpers ──────────────────────────────────────────────────────────────────
export function disciplineColor(score: number): string {
  if (score >= 80) return "var(--win)"
  if (score >= 60) return "var(--be)"
  return "var(--loss)"
}

const pnlColor = (pnl: number) => (pnl >= 0 ? "var(--win)" : "var(--loss)")

/** "−$7,398" / "+$420" — whole dollars, thousands separator, real minus sign. */
function fmtMoney(n: number): string {
  const sign = n < 0 ? "−" : "+"
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`
}

const GRADE_TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)",  bg: "var(--win-soft)" },
  mid:  { fg: "var(--be)",   bg: "var(--be-soft)" },
  bad:  { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

// ── Overflow menu (⋯) ────────────────────────────────────────────────────────
function CardMenu({ onOpen, onDelete }: { onOpen: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        aria-label="Opciones"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "grid place-items-center w-7 h-7 rounded-md transition-[opacity,background-color,transform] duration-150 active:scale-90",
          "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]",
          "opacity-60 sm:opacity-0 sm:group-hover:opacity-100",
          open && "opacity-100 bg-[var(--chip)]",
        )}
      >
        <MoreHorizontal size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-8 z-20 w-40 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-lg)] p-1"
          >
            <button
              onClick={() => { setOpen(false); onOpen() }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
            >
              <ArrowUpRight size={14} /> Ver análisis
            </button>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12.5px] text-[var(--loss)] hover:bg-[var(--loss-soft)]"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Metric ─────────────────────────────────────────────────────────────────────
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-[15px] leading-none" style={{ color: color ?? "var(--ink)" }}>{value}</span>
      <span className="text-[9px] font-medium mt-1.5 uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  )
}

// ── Chips ──────────────────────────────────────────────────────────────────────
function Chips({ worked, toImprove }: { worked: string[]; toImprove: string[] }) {
  if (worked.length === 0 && toImprove.length === 0) return null
  return (
    <motion.div
      className="flex flex-wrap gap-1.5"
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.035 } } }}
    >
      {worked.map((t, i) => <Chip key={`w${i}`} tone="win" text={t} />)}
      {toImprove.map((t, i) => <Chip key={`i${i}`} tone="loss" text={t} />)}
    </motion.div>
  )
}

function Chip({ tone, text }: { tone: "win" | "loss"; text: string }) {
  const fg = tone === "win" ? "var(--win)" : "var(--loss)"
  const bg = tone === "win" ? "var(--win-soft)" : "var(--loss-soft)"
  return (
    <motion.span
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1"
      style={{ color: fg, background: bg }}
    >
      <span aria-hidden>{tone === "win" ? "✓" : "✗"}</span>{text}
    </motion.span>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────
export function ReviewCard({ review, onOpen, onDelete, accountName }: {
  review: ReviewFromDB
  onOpen: () => void
  onDelete: () => void
  accountName: (id: string | null) => string
}) {
  const isDraft = review.status === "draft"
  const noTrades = review.tradeCount === 0
  const isLoss  = review.netPnl < 0

  // ── Empty / no-trades week: compact, quiet card ──
  if (noTrades) {
    return (
      <motion.div
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: DUR.hover, ease: EASE_OUT }}
        onClick={onOpen}
        className="group review-card relative rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] cursor-pointer hover:border-[var(--accent)]/50 hover:shadow-sm transition-[border-color,box-shadow]"
      >
        <div className="flex items-center gap-3 p-4">
          <div className="grid place-items-center w-10 h-10 rounded-xl font-mono font-bold text-[15px]" style={{ background: "var(--chip)", color: "var(--ink-3)" }}>—</div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[14px]" style={{ color: "var(--ink)" }}>{review.weekLabel}</p>
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>{review.weekRange} · sin operaciones</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--chip)", color: "var(--ink-3)" }}>Sin trades</span>
          <CardMenu onOpen={onOpen} onDelete={onDelete} />
        </div>
      </motion.div>
    )
  }

  const grade = deriveGrade({
    disciplineScore: review.disciplineScore, winRate: review.winRate,
    netPnl: review.netPnl, profitFactor: review.profitFactor, trades: review.tradeCount,
  })
  const verdict = deriveVerdict({
    aiAnalysis: review.aiAnalysis, netPnl: review.netPnl, winRate: review.winRate,
    disciplineScore: review.disciplineScore, trades: review.tradeCount,
  })
  const fallback = metricChips({
    netPnl: review.netPnl, winRate: review.winRate, profitFactor: review.profitFactor,
    disciplineScore: review.disciplineScore, trades: review.tradeCount,
  })
  const worked    = splitChips(review.whatWorked).length ? splitChips(review.whatWorked) : fallback.worked
  const toImprove = splitChips(review.toImprove).length  ? splitChips(review.toImprove)  : fallback.toImprove

  const tone = GRADE_TONE[grade.tone]
  const showSpark = review.spark.length >= 2

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
      onClick={onOpen}
      className="group review-card relative rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] overflow-hidden cursor-pointer hover:border-[var(--accent)] hover:shadow-md transition-[border-color,box-shadow]"
    >
      <div className="h-0.5 w-full" style={{ background: isLoss ? "var(--loss)" : isDraft ? "var(--be)" : "var(--win)" }} />

      <div className="p-4 sm:p-5">
        {/* Header: grade + date · sparkline · menu */}
        <div className="flex items-start gap-3 mb-3.5">
          <motion.div
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="shrink-0 grid place-items-center w-11 h-11 rounded-xl font-mono font-extrabold text-[17px]"
            style={{ color: tone.fg, background: tone.bg }}
          >
            {grade.letter}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[15px] leading-tight" style={{ color: "var(--ink)" }}>{review.weekLabel}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
              {review.weekRange} · {review.tradeCount} trades · {accountName(review.accountId)}
            </p>
          </div>
          {showSpark && (
            <div className="hidden sm:block w-[112px] shrink-0">
              <MiniSparkline data={review.spark} positive={!isLoss} width={112} height={36} interactive={false} format={fmtMoney} />
            </div>
          )}
          <CardMenu onOpen={onOpen} onDelete={onDelete} />
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-5 sm:gap-7 mb-3.5 flex-wrap">
          <Metric label="P&L"        value={fmtMoney(review.netPnl)}            color={pnlColor(review.netPnl)} />
          <Metric label="Win Rate"   value={`${review.winRate.toFixed(0)}%`}    color={review.winRate >= 55 ? "var(--win)" : undefined} />
          <Metric label="P. Factor"  value={review.profitFactor ? review.profitFactor.toFixed(2) : "—"} />
          <Metric label="Avg R"      value={review.avgR ? `${review.avgR.toFixed(2)}R` : "—"}           color={review.avgR > 0 ? "var(--win)" : review.avgR < 0 ? "var(--loss)" : undefined} />
          <Metric label="Disciplina" value={review.disciplineScore.toString()}  color={disciplineColor(review.disciplineScore)} />
        </div>

        {/* AI verdict */}
        <p className="text-[12.5px] leading-snug mb-3.5" style={{ color: "var(--ink-2)" }}>{verdict}</p>

        {/* Worked / improve chips */}
        <Chips worked={worked} toImprove={toImprove} />
      </div>
    </motion.div>
  )
}

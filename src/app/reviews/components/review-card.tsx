"use client"

import { motion } from "framer-motion"
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

function formatPnl(pnl: number): string {
  return pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${Math.abs(pnl).toLocaleString()}`
}

const GRADE_TONE: Record<VerdictTone, { fg: string; bg: string }> = {
  good: { fg: "var(--win)",  bg: "var(--win-soft)" },
  mid:  { fg: "var(--be)",   bg: "var(--be-soft)" },
  bad:  { fg: "var(--loss)", bg: "var(--loss-soft)" },
}

// ── Metric ─────────────────────────────────────────────────────────────────────
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold text-[15px] leading-none" style={{ color: color ?? "var(--ink)" }}>{value}</span>
      <span className="text-[10px] font-medium mt-1 uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  )
}

// ── ChipColumn ───────────────────────────────────────────────────────────────
function ChipColumn({ title, items, tone }: { title: string; items: string[]; tone: "win" | "loss" }) {
  const fg = tone === "win" ? "var(--win)" : "var(--loss)"
  const bg = tone === "win" ? "var(--win-soft)" : "var(--loss-soft)"
  return (
    <div className="flex-1 rounded-lg p-2.5" style={{ background: bg }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: fg }}>
        {tone === "win" ? "✓ " : "✗ "}{title}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0
          ? <span className="text-[11px] italic" style={{ color: "var(--ink-3)" }}>—</span>
          : items.map((item, i) => (
              <span key={i} className="text-[10.5px] font-medium rounded-md px-1.5 py-0.5"
                    style={{ color: fg, background: "color-mix(in srgb, var(--panel) 55%, transparent)" }}>
                {item}
              </span>
            ))}
      </div>
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────
export function ReviewCard({ review, onClick, isSelected, accountName }: {
  review: ReviewFromDB; onClick: () => void; isSelected: boolean
  accountName: (id: string | null) => string
}) {
  const isDraft = review.status === "draft"
  const isLoss  = review.netPnl < 0

  const grade   = deriveGrade({
    disciplineScore: review.disciplineScore,
    winRate: review.winRate,
    netPnl: review.netPnl,
    profitFactor: review.profitFactor,
    trades: review.tradeCount,
  })
  const verdict = deriveVerdict({
    aiAnalysis: review.aiAnalysis,
    netPnl: review.netPnl,
    winRate: review.winRate,
    disciplineScore: review.disciplineScore,
    trades: review.tradeCount,
  })

  // Chips: prefer the saved AI/user text; fall back to metric-derived chips.
  const fallback = metricChips({
    netPnl: review.netPnl, winRate: review.winRate, profitFactor: review.profitFactor,
    disciplineScore: review.disciplineScore, trades: review.tradeCount,
  })
  const worked    = splitChips(review.whatWorked).length ? splitChips(review.whatWorked) : fallback.worked
  const toImprove = splitChips(review.toImprove).length  ? splitChips(review.toImprove)  : fallback.toImprove

  const tone = GRADE_TONE[grade.tone]
  const spark = review.spark.length >= 2 ? review.spark : [0, review.netPnl]

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: DUR.hover, ease: EASE_OUT }}
      className={cn(
        "review-card rounded-[var(--radius)] border bg-[var(--panel)] overflow-hidden cursor-pointer",
        isSelected
          ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]"
          : "border-[var(--line)] hover:border-[var(--accent)] hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <div className="h-0.5 w-full" style={{ background: isLoss ? "var(--loss)" : isDraft ? "var(--be)" : "var(--win)" }} />

      <div className="p-4 sm:p-5">
        {/* Header: grade + date · sparkline */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-mono font-extrabold text-[17px]"
            style={{ color: tone.fg, background: tone.bg }}
          >
            {grade.letter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[15px] leading-tight" style={{ color: "var(--ink)" }}>{review.weekLabel}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
              {review.weekRange} · {review.tradeCount} trades · {accountName(review.accountId)}
            </p>
          </div>
          <div className="hidden sm:block w-[108px] shrink-0">
            <MiniSparkline data={spark} positive={!isLoss} width={108} height={34} interactive={false} />
          </div>
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: isDraft ? "var(--be-soft)" : "var(--win-soft)", color: isDraft ? "var(--be)" : "var(--win)" }}
          >
            {isDraft ? "Borrador" : "Enviada"}
          </span>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-5 sm:gap-7 mb-3 flex-wrap">
          <Metric label="P&L"        value={formatPnl(review.netPnl)}              color={pnlColor(review.netPnl)} />
          <Metric label="Win Rate"   value={`${review.winRate.toFixed(0)}%`}       color={review.winRate >= 55 ? "var(--win)" : undefined} />
          <Metric label="P. Factor"  value={review.profitFactor ? review.profitFactor.toFixed(2) : "—"} />
          <Metric label="Avg R"      value={review.avgR ? `${review.avgR.toFixed(2)}R` : "—"}           color={review.avgR > 0 ? "var(--win)" : review.avgR < 0 ? "var(--loss)" : undefined} />
          <Metric label="Disciplina" value={review.disciplineScore.toString()}     color={disciplineColor(review.disciplineScore)} />
        </div>

        {/* AI verdict */}
        <p className="text-[12.5px] leading-snug mb-3" style={{ color: "var(--ink-2)" }}>
          <span className="font-medium" style={{ color: "var(--accent)" }}>“</span>
          {verdict}
          <span className="font-medium" style={{ color: "var(--accent)" }}>”</span>
        </p>

        {/* Worked / improve chips */}
        <div className="flex gap-2">
          <ChipColumn title="Funcionó" items={worked}    tone="win" />
          <ChipColumn title="A mejorar" items={toImprove} tone="loss" />
        </div>
      </div>
    </motion.div>
  )
}

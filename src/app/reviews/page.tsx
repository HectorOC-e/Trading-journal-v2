"use client"

import { useMemo, useState } from "react"
import { Plus, X, ChevronDown, ChevronUp, Check, TrendingUp, Percent, Award, ClipboardCheck } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"

type ReviewFromDB   = RouterOutputs["weeklyReviews"]["list"][number]
type AccountFromDB  = RouterOutputs["accounts"]["list"][number]
type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]
type TradeFromDB    = RouterOutputs["trades"]["list"]["items"][number]

// ── Week generation ────────────────────────────────────────────────────────
const MONTH_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

function getISOWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const jan4 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

function formatWeekRange(start: Date, end: Date): string {
  const sm = MONTH_SHORT[start.getMonth()]
  const em = MONTH_SHORT[end.getMonth()]
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${sm}`
    : `${start.getDate()} ${sm}–${end.getDate()} ${em}`
}

function generateWeekOptions(n = 6) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - daysBack)
  thisMonday.setHours(0, 0, 0, 0)

  return Array.from({ length: n }, (_, i) => {
    const start = new Date(thisMonday)
    start.setDate(thisMonday.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      label: `Sem. ${getISOWeekNumber(start)}`,
      range: formatWeekRange(start, end),
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
    }
  })
}

const WEEK_OPTIONS = generateWeekOptions(6)

// ── Helpers ────────────────────────────────────────────────────────────────
function disciplineColor(score: number): string {
  if (score >= 80) return "var(--win)"
  if (score >= 60) return "var(--be)"
  return "var(--loss)"
}

function disciplineBg(score: number): string {
  if (score >= 80) return "var(--win-soft)"
  if (score >= 60) return "var(--be-soft)"
  return "var(--loss-soft)"
}

function pnlColor(pnl: number): string {
  return pnl >= 0 ? "var(--win)" : "var(--loss)"
}

function pnlBg(pnl: number): string {
  return pnl >= 0 ? "var(--win-soft)" : "var(--loss-soft)"
}

function formatPnl(pnl: number): string {
  return pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${Math.abs(pnl).toLocaleString()}`
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg"
      style={{ background: bg, minWidth: 72 }}
    >
      <span className="font-mono font-bold text-sm leading-tight" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] font-medium mt-0.5" style={{ color: "var(--ink-3)" }}>
        {label}
      </span>
    </div>
  )
}

// ── Discipline bar ──────────────────────────────────────────────────────────
function DisciplineBar({ score }: { score: number }) {
  return (
    <div className="h-1 w-full rounded-full" style={{ background: "var(--line)" }}>
      <div
        className="h-1 rounded-full transition-all duration-500"
        style={{ width: `${score}%`, background: disciplineColor(score) }}
      />
    </div>
  )
}

// ── Bullet preview ──────────────────────────────────────────────────────────
function BulletPreview({
  title, text, color, bg, limit = 2,
}: {
  title: string; text: string; color: string; bg: string; limit?: number
}) {
  const items = text
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit)

  return (
    <div className="flex-1 rounded-lg p-3" style={{ background: bg }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-[9px] mt-0.5 font-bold" style={{ color }}>•</span>
            <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs italic" style={{ color: "var(--ink-3)" }}>—</li>
        )}
      </ul>
    </div>
  )
}

// ── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({
  review, onClick, isSelected, accountName,
}: {
  review: ReviewFromDB
  onClick: () => void
  isSelected: boolean
  accountName: (id: string | null) => string
}) {
  const isDraft = review.status === "draft"
  const isLoss  = review.netPnl < 0

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border bg-[var(--panel)] transition-all duration-150 overflow-hidden cursor-pointer",
        isSelected
          ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]"
          : "border-[var(--line)] hover:border-[var(--accent)] hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div
        className="h-0.5 w-full"
        style={{ background: isLoss ? "var(--loss)" : isDraft ? "var(--be)" : "var(--win)" }}
      />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-5 mb-3">
          {/* LEFT */}
          <div className="shrink-0 w-20 sm:w-28">
            <p
              className="font-mono font-bold leading-none"
              style={{ fontSize: "clamp(20px,5vw,28px)", color: "var(--ink)" }}
            >
              {review.weekLabel}
            </p>
            <p className="text-[10px] sm:text-xs mt-1" style={{ color: "var(--ink-3)" }}>
              {review.weekRange}
            </p>
            <p className="text-[10px] sm:text-[11px] mt-0.5 font-medium truncate" style={{ color: "var(--ink-2)" }}>
              {accountName(review.accountId)}
            </p>
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
              style={{
                background: isDraft ? "var(--be-soft)" : "var(--win-soft)",
                color: isDraft ? "var(--be)" : "var(--win)",
              }}
            >
              {isDraft ? "Borrador" : "Enviada"}
            </span>
          </div>

          {/* CENTER */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-3">
              <StatPill label="Trades"    value={review.tradeCount.toString()}    color="var(--ink)"                  bg="var(--panel-2)" />
              <StatPill label="Net P&L"   value={formatPnl(review.netPnl)}        color={pnlColor(review.netPnl)}     bg={pnlBg(review.netPnl)} />
              <StatPill label="Win Rate"  value={`${review.winRate.toFixed(0)}%`} color={review.winRate >= 55 ? "var(--win)" : "var(--loss)"} bg={review.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)"} />
              <StatPill label="Disciplina" value={review.disciplineScore.toString()} color={disciplineColor(review.disciplineScore)} bg={disciplineBg(review.disciplineScore)} />
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>Score de disciplina</span>
                <span className="text-[10px] font-bold" style={{ color: disciplineColor(review.disciplineScore) }}>
                  {review.disciplineScore}/100
                </span>
              </div>
              <DisciplineBar score={review.disciplineScore} />
            </div>

            {review.executiveSummary && (
              <p className="hidden sm:block text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {review.executiveSummary}
              </p>
            )}
          </div>

          {/* RIGHT bullet previews */}
          <div className="hidden lg:flex shrink-0 w-64 gap-2">
            <BulletPreview title="Qué funcionó" text={review.whatWorked} color="var(--win)" bg="var(--win-soft)" />
            <BulletPreview title="A mejorar"    text={review.toImprove}  color="var(--loss)" bg="var(--loss-soft)" />
          </div>
        </div>

        {/* Bullet previews on mobile */}
        <div className="flex lg:hidden gap-2 mb-3">
          <BulletPreview title="Qué funcionó" text={review.whatWorked} color="var(--win)" bg="var(--win-soft)" />
          <BulletPreview title="A mejorar"    text={review.toImprove}  color="var(--loss)" bg="var(--loss-soft)" />
        </div>

        <div
          className="flex items-center gap-2 mt-4 pt-4"
          style={{ borderTop: "1px solid var(--line)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" onClick={onClick}>Ver review completa</Button>
          <Button variant="ghost" size="sm">Editar</Button>
        </div>
      </div>
    </div>
  )
}

// ── Section block (detail panel) ──────────────────────────────────────────────
function SectionBlock({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  const items = text.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean)
  const isBullets = text.includes("•") || text.includes("\n")

  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
        {emoji} {title}
      </p>
      {isBullets ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
              <span className="mt-1 text-[10px]" style={{ color: "var(--accent)" }}>▸</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {text || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>Sin contenido</span>}
        </p>
      )}
    </div>
  )
}

// ── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  review, onClose, accountName, weekTrades,
}: {
  review:      ReviewFromDB
  onClose:     () => void
  accountName: (id: string | null) => string
  weekTrades:  TradeFromDB[]
}) {
  const isDraft = review.status === "draft"

  return (
    <div
      className="flex flex-col overflow-hidden detail-panel-mobile"
      style={{
        width:      380,
        background: "var(--panel)",
        borderLeft: "1px solid var(--line)",
        position:   "sticky",
        top:        0,
        maxHeight:  "100vh",
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div>
          <p className="font-mono font-bold text-2xl" style={{ color: "var(--ink)" }}>
            {review.weekLabel}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {review.weekRange} · {accountName(review.accountId)}
          </p>
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
            style={{
              background: isDraft ? "var(--be-soft)" : "var(--win-soft)",
              color:      isDraft ? "var(--be)"      : "var(--win)",
            }}
          >
            {isDraft ? "Borrador" : "Enviada"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--ink-3)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-0" style={{ borderBottom: "1px solid var(--line)" }}>
        {[
          { label: "Trades",    value: review.tradeCount.toString(),    color: "var(--ink)" },
          { label: "Net P&L",   value: formatPnl(review.netPnl),        color: pnlColor(review.netPnl) },
          { label: "Win Rate",  value: `${review.winRate.toFixed(0)}%`, color: review.winRate >= 55 ? "var(--win)" : "var(--loss)" },
          { label: "Disciplina", value: `${review.disciplineScore}`,    color: disciplineColor(review.disciplineScore) },
        ].map(({ label, value, color }, i) => (
          <div
            key={label}
            className="flex flex-col items-center py-3"
            style={{ borderRight: i < 3 ? "1px solid var(--line)" : undefined }}
          >
            <span className="font-mono font-bold text-sm" style={{ color }}>{value}</span>
            <span className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <SectionBlock emoji="📋" title="Resumen ejecutivo" text={review.executiveSummary} />

        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            ✅ Qué funcionó bien
          </p>
          <div className="rounded-lg p-3" style={{ background: "var(--win-soft)" }}>
            {review.whatWorked
              .split("\n").map((l: string) => l.replace(/^•\s*/, "").trim()).filter(Boolean)
              .map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--win)" }}>•</span>
                  <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            🔧 A mejorar
          </p>
          <div className="rounded-lg p-3" style={{ background: "var(--loss-soft)" }}>
            {review.toImprove
              .split("\n").map((l: string) => l.replace(/^•\s*/, "").trim()).filter(Boolean)
              .map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--loss)" }}>•</span>
                  <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Trade breakdown */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            📊 Trades de la semana
          </p>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  {["Símbolo", "Sesión", "R múlt.", "P&L"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium"
                      style={{ color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekTrades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center italic" style={{ color: "var(--ink-3)" }}>
                      Sin trades registrados para esta semana
                    </td>
                  </tr>
                ) : (
                  weekTrades.map((t, i) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: i < weekTrades.length - 1 ? "1px solid var(--line)" : undefined }}
                    >
                      <td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--ink)" }}>
                        {t.symbol}
                      </td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: "var(--ink-3)" }}>
                        {t.session}
                      </td>
                      <td
                        className="px-3 py-2 font-mono font-semibold"
                        style={{ color: (t.rMultiple ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}
                      >
                        {t.rMultiple != null ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(1)}R` : "—"}
                      </td>
                      <td
                        className="px-3 py-2 font-mono font-semibold"
                        style={{ color: (t.pnl ?? 0) >= 0 ? "var(--win)" : "var(--loss)" }}
                      >
                        {t.pnl != null ? formatPnl(t.pnl) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Auto-generation from real trade data ──────────────────────────────────────
interface GeneratedReview {
  tradeCount:      number
  netPnl:          number
  winRate:         number
  disciplineScore: number
  executiveSummary: string
  whatWorked:      string
  toImprove:       string
}

function generateWeekReview(weekStart: string, weekEnd: string, accountId: string, trades: TradeFromDB[]): GeneratedReview {
  const filtered = trades.filter((t) => {
    const acctMatch = accountId === "ALL" || t.accountId === accountId
    return acctMatch && t.date >= weekStart && t.date <= weekEnd
  })

  if (filtered.length === 0) {
    return {
      tradeCount: 0, netPnl: 0, winRate: 0, disciplineScore: 0,
      executiveSummary: "No hay trades registrados para esta semana y cuenta.",
      whatWorked: "", toImprove: "",
    }
  }

  const netPnl   = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winners  = filtered.filter((t) => (t.pnl ?? 0) > 0)
  const winRate  = Math.round((winners.length / filtered.length) * 100)

  const disciplinedCount = filtered.filter((t) =>
    t.tags.some((tag: string) => tag === "A+" || tag === "Plan")
  ).length
  const offPlanCount = filtered.filter((t) =>
    t.tags.some((tag: string) => tag === "Off-plan" || tag === "Impulsivo")
  ).length
  const disciplineScore = filtered.length > 0 ? Math.round((disciplinedCount / filtered.length) * 100) : 0

  const pnlStr    = formatPnl(netPnl)
  const sentiment = disciplineScore >= 80 && winRate >= 60
    ? "Excelente semana"
    : disciplineScore >= 60 && netPnl >= 0
      ? "Semana positiva"
      : netPnl < 0
        ? "Semana difícil"
        : "Semana regular"

  const execSummary = `${sentiment}. ${filtered.length} trades ejecutados con un resultado neto de ${pnlStr} (${winRate}% win rate). Score de disciplina: ${disciplineScore}/100. ${
    offPlanCount > 0
      ? `${offPlanCount} trade${offPlanCount > 1 ? "s" : ""} fuera del plan.`
      : "Todos los trades siguieron el plan."
  }`

  const winningTrades = filtered.filter((t) => (t.pnl ?? 0) > 0)
  const aPlus         = filtered.filter((t) => t.tags.includes("A+"))
  const whatWorkedLines: string[] = []
  if (aPlus.length > 0) {
    whatWorkedLines.push(`Trades A+ en ${[...new Set(aPlus.map((t) => t.symbol))].join(", ")} ejecutados con alta confluencia`)
  }
  if (winningTrades.length > 0) {
    whatWorkedLines.push(`Mejores resultados en sesión ${[...new Set(winningTrades.map((t) => t.session))].join(", ")}`)
  }
  if (disciplinedCount === filtered.length) {
    whatWorkedLines.push("100% de trades dentro del plan establecido")
  }
  if (winRate >= 60) whatWorkedLines.push(`Win rate de ${winRate}% por encima del objetivo`)
  if (whatWorkedLines.length === 0) whatWorkedLines.push("—")

  const toImproveLines: string[] = []
  const offPlanTrades = filtered.filter((t) => t.tags.some((tag: string) => tag === "Off-plan" || tag === "Impulsivo"))
  if (offPlanTrades.length > 0) {
    toImproveLines.push(`Revisar disciplina en ${[...new Set(offPlanTrades.map((t) => t.symbol))].join(", ")} — ${offPlanTrades.length} trade${offPlanTrades.length > 1 ? "s" : ""} fuera del plan`)
  }
  if (winRate < 50) toImproveLines.push(`Mejorar selectividad — win rate de ${winRate}% por debajo del objetivo`)
  const losingTrades = filtered.filter((t) => (t.pnl ?? 0) < 0)
  if (losingTrades.length > 0) {
    const sessions = [...new Set(losingTrades.map((t) => t.session))]
    if (sessions.length > 0) toImproveLines.push(`Analizar trades perdedores en sesión ${sessions.join(", ")}`)
  }
  if (toImproveLines.length === 0) toImproveLines.push("Mantener consistencia la próxima semana")

  return {
    tradeCount:       filtered.length,
    netPnl,
    winRate,
    disciplineScore,
    executiveSummary: execSummary,
    whatWorked:       whatWorkedLines.map((l) => `• ${l}`).join("\n"),
    toImprove:        toImproveLines.map((l) => `• ${l}`).join("\n"),
  }
}

// ── Week selector card ────────────────────────────────────────────────────────
type WeekOption = typeof WEEK_OPTIONS[number]

function WeekSelectorCard({
  week, selected, onClick, generated,
}: {
  week:      WeekOption
  selected:  boolean
  onClick:   () => void
  generated?: GeneratedReview
}) {
  const pnlDisplay    = generated ? formatPnl(generated.netPnl) : "—"
  const wrDisplay     = generated ? `${generated.winRate}%` : "—"
  const tradesDisplay = generated ? generated.tradeCount : "—"
  const isLoss        = generated ? generated.netPnl < 0 : false

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[var(--radius-sm)] border p-3 transition-all duration-100",
        selected
          ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]"
          : "border-[var(--line)] hover:border-[var(--accent)]"
      )}
      style={{ background: selected ? "var(--accent-soft)" : "var(--panel-2)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-bold text-sm" style={{ color: "var(--ink)" }}>{week.label}</span>
        {selected && <Check size={12} style={{ color: "var(--accent)" }} />}
      </div>
      <p className="text-[11px] mb-2" style={{ color: "var(--ink-3)" }}>{week.range}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
          {tradesDisplay} trades
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
          style={{ color: isLoss ? "var(--loss)" : "var(--win)", background: isLoss ? "var(--loss-soft)" : "var(--win-soft)" }}
        >
          {pnlDisplay}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>
          {wrDisplay} WR
        </span>
      </div>
    </button>
  )
}

// ── Account selector card ─────────────────────────────────────────────────────
function AccountSelectorCard({
  account, selected, onClick,
}: {
  account:  AccountFromDB
  selected: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[var(--radius-sm)] border p-3 transition-all duration-100",
        selected
          ? "border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,110,247,0.18)]"
          : "border-[var(--line)] hover:border-[var(--accent)]"
      )}
      style={{ background: selected ? "var(--accent-soft)" : "var(--panel-2)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{account.name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>{account.broker}</p>
        </div>
        {selected && <Check size={14} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  )
}

// ── Nueva review modal ────────────────────────────────────────────────────────
function NuevaReviewModal({
  open,
  onOpenChange,
  reviewResources,
}: {
  open:            boolean
  onOpenChange:    (v: boolean) => void
  reviewResources: ResourceFromDB[]
}) {
  const [step, setStep]                   = useState<"config" | "analisis">("config")
  const [selectedWeek, setSelectedWeek]   = useState(0)
  const [generated, setGenerated]         = useState<GeneratedReview | null>(null)
  const [autoFields, setAutoFields]       = useState<Set<string>>(new Set())
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [whatWorked, setWhatWorked]       = useState("")
  const [toImprove, setToImprove]         = useState("")
  const [disciplineScore, setDisciplineScore] = useState(75)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [linkedResources, setLinkedResources] = useState<string[]>([])

  const { data: accounts = [] } = trpc.accounts.list.useQuery()
  const { data: rawTrades } = trpc.trades.list.useQuery()
  const allTrades: TradeFromDB[] = rawTrades?.items ?? []
  const utils = trpc.useUtils()

  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  // Initialize selectedAccountId once accounts load
  const effectiveAccountId = selectedAccountId || accounts[0]?.id || ""

  const createReview = trpc.weeklyReviews.create.useMutation({
    onSuccess: () => {
      utils.weeklyReviews.list.invalidate()
      onOpenChange(false)
      resetState()
    },
  })

  function resetState() {
    setStep("config")
    setSelectedWeek(0)
    setGenerated(null)
    setAutoFields(new Set())
    setExecutiveSummary("")
    setWhatWorked("")
    setToImprove("")
    setDisciplineScore(75)
    setLinkedResources([])
    setResourcesOpen(false)
  }

  const week = WEEK_OPTIONS[selectedWeek]

  function runAutoGenerate(weekIdx: number, accountId: string) {
    if (!accountId) return
    const w   = WEEK_OPTIONS[weekIdx]
    const gen = generateWeekReview(w.start, w.end, accountId, allTrades)
    setGenerated(gen)
    setExecutiveSummary(gen.executiveSummary)
    setWhatWorked(gen.whatWorked)
    setToImprove(gen.toImprove)
    setDisciplineScore(gen.disciplineScore)
    setAutoFields(new Set(["executiveSummary", "whatWorked", "toImprove", "disciplineScore"]))
  }

  function handleSelectWeek(idx: number) {
    setSelectedWeek(idx)
    runAutoGenerate(idx, effectiveAccountId)
  }

  function handleSelectAccount(id: string) {
    setSelectedAccountId(id)
    runAutoGenerate(selectedWeek, id)
  }

  function markEdited(field: string) {
    setAutoFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  function toggleResource(id: string) {
    setLinkedResources((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])
  }

  function handleSave(status: "draft" | "submitted") {
    if (!week) return
    createReview.mutate({
      accountId:        effectiveAccountId || null,
      weekLabel:        week.label,
      weekRange:        week.range,
      weekStart:        week.start,
      weekEnd:          week.end,
      tradeCount:       generated?.tradeCount ?? 0,
      netPnl:           generated?.netPnl ?? 0,
      winRate:          generated?.winRate ?? 0,
      disciplineScore,
      executiveSummary,
      whatWorked,
      toImprove,
      status,
    })
  }

  const discColor = disciplineColor(disciplineScore)
  const discBg    = disciplineBg(disciplineScore)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva review semanal</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-[var(--radius-sm)] mx-0"
          style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
        >
          {(["config", "analisis"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={cn(
                "flex-1 text-xs font-semibold py-1.5 px-3 rounded transition-all duration-100",
                step === s ? "text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              )}
              style={step === s ? { background: "var(--panel)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : {}}
            >
              {s === "config" ? "1 · Configuración" : "2 · Análisis"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {step === "config" && (
            <div className="flex flex-col gap-5 py-2">
              {/* Account selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
                  Cuenta
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {accounts.length === 0 ? (
                    <p className="text-xs text-[var(--ink-3)] italic py-2">Cargando cuentas…</p>
                  ) : (
                    accounts.map((acct: AccountFromDB) => (
                      <AccountSelectorCard
                        key={acct.id}
                        account={acct}
                        selected={effectiveAccountId === acct.id}
                        onClick={() => handleSelectAccount(acct.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Week selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
                  Semana
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {WEEK_OPTIONS.map((w, i) => (
                    <WeekSelectorCard
                      key={w.label}
                      week={w}
                      selected={selectedWeek === i}
                      onClick={() => handleSelectWeek(i)}
                      generated={generated && selectedWeek === i ? generated : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Auto stats */}
              <div
                className="rounded-[var(--radius-sm)] p-4"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    Resumen automático · {week?.label}
                  </p>
                  {generated && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      ✨ Auto-generado de tus trades
                    </span>
                  )}
                </div>
                {generated ? (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Trades",    value: generated.tradeCount.toString(), color: "var(--ink)", bg: "var(--chip)" },
                      { label: "Net P&L",   value: formatPnl(generated.netPnl), color: generated.netPnl >= 0 ? "var(--win)" : "var(--loss)", bg: generated.netPnl >= 0 ? "var(--win-soft)" : "var(--loss-soft)" },
                      { label: "Win Rate",  value: `${generated.winRate}%`, color: generated.winRate >= 55 ? "var(--win)" : "var(--loss)", bg: generated.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)" },
                      { label: "Disciplina", value: `${generated.disciplineScore}`, color: disciplineColor(generated.disciplineScore), bg: disciplineBg(generated.disciplineScore) },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className="flex flex-col items-center py-2 rounded-lg" style={{ background: bg }}>
                        <span className="font-mono font-bold text-base" style={{ color }}>{value}</span>
                        <span className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ink-3)] italic text-center py-3">
                    Selecciona una semana y cuenta para ver los stats automáticos
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "analisis" && (
            <div className="flex flex-col gap-4 py-2">
              {/* Executive summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    📋 Resumen ejecutivo
                  </label>
                  {autoFields.has("executiveSummary") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      ✨ Auto-generado
                    </span>
                  )}
                </div>
                <Textarea
                  value={executiveSummary}
                  onChange={(e) => { setExecutiveSummary(e.target.value); markEdited("executiveSummary") }}
                  placeholder="Describe los puntos clave de la semana en 3-5 líneas..."
                  rows={3}
                />
              </div>

              {/* What worked */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    ✅ ¿Qué funcionó bien?
                  </label>
                  {autoFields.has("whatWorked") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      ✨ Auto-generado
                    </span>
                  )}
                </div>
                <Textarea
                  value={whatWorked}
                  onChange={(e) => { setWhatWorked(e.target.value); markEdited("whatWorked") }}
                  placeholder={"• Punto 1\n• Punto 2\n• Punto 3"}
                  rows={4}
                />
              </div>

              {/* To improve */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    🔧 A mejorar la próxima semana
                  </label>
                  {autoFields.has("toImprove") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      ✨ Auto-generado
                    </span>
                  )}
                </div>
                <Textarea
                  value={toImprove}
                  onChange={(e) => { setToImprove(e.target.value); markEdited("toImprove") }}
                  placeholder={"• Punto 1\n• Punto 2\n• Punto 3"}
                  rows={4}
                />
              </div>

              {/* Pending learning resources accordion */}
              {reviewResources.length > 0 && (
                <div
                  className="rounded-[var(--radius-sm)] overflow-hidden"
                  style={{ border: "1px solid var(--line)" }}
                >
                  <button
                    onClick={() => setResourcesOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: "var(--panel-2)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      📚 Aprendizajes pendientes ({reviewResources.length})
                    </span>
                    {resourcesOpen ? (
                      <ChevronUp size={14} style={{ color: "var(--ink-3)" }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: "var(--ink-3)" }} />
                    )}
                  </button>
                  {resourcesOpen && (
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {reviewResources.map((res) => (
                        <label key={res.id} className="flex items-start gap-3 cursor-pointer">
                          <div
                            className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                            style={{
                              background:  linkedResources.includes(res.id) ? "var(--accent)" : "var(--panel)",
                              borderColor: linkedResources.includes(res.id) ? "var(--accent)" : "var(--line)",
                            }}
                            onClick={() => toggleResource(res.id)}
                          >
                            {linkedResources.includes(res.id) && (
                              <Check size={10} style={{ color: "white" }} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>{res.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                              {res.author} · {res.type}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Discipline score */}
              <div
                className="rounded-[var(--radius-sm)] p-4 text-center"
                style={{ background: discBg, border: `1px solid ${discColor}33` }}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: discColor }}>
                    Score de disciplina
                  </p>
                  {autoFields.has("disciplineScore") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      ✨ Auto-calculado
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={disciplineScore}
                  onChange={(e) => {
                    setDisciplineScore(Math.max(0, Math.min(100, Number(e.target.value))))
                    markEdited("disciplineScore")
                  }}
                  className="w-28 text-center font-mono font-bold rounded-[var(--radius-sm)] border outline-none focus:ring-2"
                  style={{ fontSize: 40, lineHeight: 1.2, color: discColor, background: "transparent", borderColor: `${discColor}44` }}
                />
                <p className="text-[11px] mt-3" style={{ color: "var(--ink-3)" }}>
                  0 = caos total · 100 = ejecución perfecta
                </p>
                <div className="mt-3">
                  <DisciplineBar score={disciplineScore} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "config" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="ghost" onClick={() => runAutoGenerate(selectedWeek, effectiveAccountId)}>
                ✨ Auto-generar
              </Button>
              <Button variant="primary" onClick={() => { runAutoGenerate(selectedWeek, effectiveAccountId); setStep("analisis") }}>
                Siguiente →
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("config")}>← Atrás</Button>
              <Button
                variant="ghost"
                onClick={() => handleSave("draft")}
                disabled={createReview.isPending}
              >
                {createReview.isPending ? "Guardando…" : "Guardar borrador"}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave("submitted")}
                disabled={createReview.isPending}
              >
                {createReview.isPending ? "Enviando…" : "Enviar review"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const [modalOpen, setModalOpen]         = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewFromDB | null>(null)

  const { data: reviews = [], isLoading }          = trpc.weeklyReviews.list.useQuery()
  const { data: accounts = [] }                    = trpc.accounts.list.useQuery()
  const { data: reviewResources = [] }             = trpc.learningResources.list.useQuery({ markedForReview: true })
  const { data: rawPageTrades }                    = trpc.trades.list.useQuery()
  const allTrades: TradeFromDB[]                   = rawPageTrades?.items ?? []

  const accountName = (id: string | null) => {
    if (!id) return "—"
    return accounts.find((a: AccountFromDB) => a.id === id)?.name ?? id
  }

  const totalPnl = useMemo(() => reviews.reduce((s: number, r: ReviewFromDB) => s + r.netPnl, 0), [reviews])
  const avgWr    = useMemo(() =>
    reviews.length ? Math.round(reviews.reduce((s: number, r: ReviewFromDB) => s + r.winRate, 0) / reviews.length) : 0,
    [reviews]
  )
  const avgDisc  = useMemo(() =>
    reviews.length ? Math.round(reviews.reduce((s: number, r: ReviewFromDB) => s + r.disciplineScore, 0) / reviews.length) : 0,
    [reviews]
  )

  const kpis = useMemo(() => [
    {
      label: "P&L acumulado",
      value: totalPnl >= 0 ? `+$${totalPnl.toLocaleString()}` : `-$${Math.abs(totalPnl).toLocaleString()}`,
      sub:   `${reviews.length} semanas`,
      trend: (totalPnl >= 0 ? "up" : "down") as "up" | "down",
      mono:  true,
      icon:  <TrendingUp size={15} />,
    },
    {
      label: "Win Rate prom.",
      value: `${avgWr}%`,
      sub:   "promedio semanal",
      trend: (avgWr >= 55 ? "up" : "down") as "up" | "down",
      mono:  true,
      icon:  <Percent size={15} />,
    },
    {
      label: "Score disciplina",
      value: avgDisc.toString(),
      sub:   "promedio semanal",
      trend: (avgDisc >= 70 ? "up" : avgDisc >= 60 ? "neutral" : "down") as "up" | "neutral" | "down",
      mono:  true,
      icon:  <Award size={15} />,
    },
    {
      label: "Semanas revisadas",
      value: reviews.filter((r: ReviewFromDB) => r.status === "submitted").length.toString(),
      sub:   `de ${reviews.length} totales`,
      trend: "neutral" as "neutral",
      mono:  true,
      icon:  <ClipboardCheck size={15} />,
    },
  ], [reviews, totalPnl, avgWr, avgDisc])

  const weekTrades = useMemo(() => {
    if (!selectedReview) return []
    return allTrades.filter((t: TradeFromDB) => {
      const acctMatch = !selectedReview.accountId || t.accountId === selectedReview.accountId
      return acctMatch && t.date >= selectedReview.weekStart && t.date <= selectedReview.weekEnd
    })
  }, [selectedReview, allTrades])

  function handleCardClick(review: ReviewFromDB) {
    setSelectedReview((prev: ReviewFromDB | null) => (prev?.id === review.id ? null : review))
  }

  return (
    <>
      <div className="flex gap-0 items-start" style={{ margin: selectedReview ? "-28px -32px" : undefined }}>
        {/* Main column */}
        <div className={cn("flex-1 min-w-0", selectedReview ? "px-8 py-7" : "")}>
          <TopBar
            title="Reviews"
            subtitle="Semanas analizadas y aprendizajes"
            actions={[{
              label:   "Nueva review",
              icon:    <Plus size={14} />,
              variant: "primary",
              onClick: () => setModalOpen(true),
            }]}
          />

          <KpiStrip items={kpis} className="mb-6" />

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-[var(--ink-3)]">Cargando reviews…</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-[var(--ink-3)]">No hay reviews todavía.</p>
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                <Plus size={14} className="mr-1" /> Crear primera review
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((review: ReviewFromDB) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onClick={() => handleCardClick(review)}
                  isSelected={selectedReview?.id === review.id}
                  accountName={accountName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedReview && (
          <DetailPanel
            review={selectedReview}
            onClose={() => setSelectedReview(null)}
            accountName={accountName}
            weekTrades={weekTrades}
          />
        )}
      </div>

      <NuevaReviewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reviewResources={reviewResources}
      />
    </>
  )
}

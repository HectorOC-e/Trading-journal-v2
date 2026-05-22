"use client"

import { useState } from "react"
import { Plus, X, ChevronDown, ChevronUp, Check } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockReviews, mockAccounts, mockResources, mockTrades } from "@/mock-data"
import type { WeeklyReview, LearningResource } from "@/types"

// ── Additional inline mock reviews ─────────────────────────────────────────
const EXTRA_REVIEWS: WeeklyReview[] = [
  {
    id: "review-2",
    accountId: "acc-1",
    weekLabel: "Sem. 19",
    weekRange: "7–13 may 2026",
    tradeCount: 18,
    netPnl: 3920,
    winRate: 72,
    disciplineScore: 88,
    executiveSummary: "Excelente semana. Todas las entradas siguieron el plan con precisión quirúrgica. OR en NQ funcionó perfecto los tres días que lo operé. El trabajo de preparación pre-mercado está dando sus frutos.",
    whatWorked: "• Preparación pre-mercado exhaustiva\n• Esperar confirmación en M5 antes de entrar\n• Gestión del stop ajustada a structure\n• Cerrar posiciones antes de noticias FOMC",
    toImprove: "• Tomar más tamaño cuando el setup es A+\n• No reducir posición prematuramente en tendencia clara",
    status: "submitted",
    createdAt: "2026-05-13T00:00:00Z",
  },
  {
    id: "review-3",
    accountId: "acc-2",
    weekLabel: "Sem. 18",
    weekRange: "30 abr–6 may 2026",
    tradeCount: 31,
    netPnl: -1850,
    winRate: 42,
    disciplineScore: 51,
    executiveSummary: "Semana muy difícil marcada por errores de disciplina. Operé en revenge mode después de dos pérdidas consecutivas el martes y el resultado fue catastrófico. Necesito revisar el protocolo de pausa obligatoria.",
    whatWorked: "• La única sesión London del miércoles fue limpia\n• Stop loss respetado en todos los trades (no amplié ninguno)",
    toImprove: "• Activar protocolo de pausa tras 2 pérdidas consecutivas\n• No operar Asia session bajo ningún concepto\n• Reducir el número de trades diarios a máximo 2\n• Volver a revisar reglas de la cuenta antes de abrir plataforma",
    status: "draft",
    createdAt: "2026-05-06T00:00:00Z",
  },
  {
    id: "review-4",
    accountId: "acc-1",
    weekLabel: "Sem. 17",
    weekRange: "23–29 abr 2026",
    tradeCount: 15,
    netPnl: 1100,
    winRate: 60,
    disciplineScore: 74,
    executiveSummary: "Semana regular. Resultado positivo pero podría haber sido mejor si hubiera cerrado las posiciones ganadoras en target en lugar de moverlos. El mercado en modo choppy la mayor parte del tiempo.",
    whatWorked: "• Identificar bien el sesgo diario HTF\n• Reducir tamaño en días de bajo volumen\n• Failed Auction en ES dio 3R limpio el jueves",
    toImprove: "• No mover target antes de alcanzarlo\n• Mejorar identificación de días choppy para no operar\n• Revisar ratio riesgo/recompensa mínimo antes de entrar",
    status: "submitted",
    createdAt: "2026-04-29T00:00:00Z",
  },
  {
    id: "review-5",
    accountId: "acc-1",
    weekLabel: "Sem. 16",
    weekRange: "16–22 abr 2026",
    tradeCount: 20,
    netPnl: 2210,
    winRate: 65,
    disciplineScore: 82,
    executiveSummary: "Semana positiva con buena consistencia. Operé solo las killzones NY y London, evitando Asia completamente. La disciplina mejoró notablemente respecto a la semana anterior.",
    whatWorked: "• Restricción estricta a killzones definidas\n• OR break en NQ con confluencia 4H funcionó 3/4 veces\n• Diario de preparación cumplido todos los días",
    toImprove: "• Mejorar timing de entrada en London open\n• Documentar mejor las razones de salida anticipada",
    status: "submitted",
    createdAt: "2026-04-22T00:00:00Z",
  },
]

const ALL_REVIEWS: WeeklyReview[] = [...mockReviews, ...EXTRA_REVIEWS]

// ── Resources marked for review ────────────────────────────────────────────
const REVIEW_RESOURCES: LearningResource[] = mockResources.filter(
  (r: LearningResource) => r.markedForReview
)

// ── KPI strip ──────────────────────────────────────────────────────────────
const totalPnl = ALL_REVIEWS.reduce((s, r) => s + r.netPnl, 0)
const avgWr = Math.round(ALL_REVIEWS.reduce((s, r) => s + r.winRate, 0) / ALL_REVIEWS.length)
const avgDisc = Math.round(ALL_REVIEWS.reduce((s, r) => s + r.disciplineScore, 0) / ALL_REVIEWS.length)

const KPIS = [
  {
    label: "P&L acumulado mes",
    value: totalPnl >= 0 ? `+$${totalPnl.toLocaleString()}` : `-$${Math.abs(totalPnl).toLocaleString()}`,
    sub: "últimas 5 semanas",
    trend: (totalPnl >= 0 ? "up" : "down") as "up" | "down",
    mono: true,
  },
  {
    label: "Win Rate prom.",
    value: `${avgWr}%`,
    sub: "promedio semanal",
    trend: (avgWr >= 55 ? "up" : "down") as "up" | "down",
    mono: true,
  },
  {
    label: "Score disciplina",
    value: avgDisc.toString(),
    sub: "promedio semanal",
    trend: (avgDisc >= 70 ? "up" : avgDisc >= 60 ? "neutral" : "down") as "up" | "neutral" | "down",
    mono: true,
  },
  {
    label: "Semanas revisadas",
    value: ALL_REVIEWS.filter((r) => r.status === "submitted").length.toString(),
    sub: `de ${ALL_REVIEWS.length} totales`,
    trend: "neutral" as "neutral",
    mono: true,
  },
]

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

function accountName(accountId: string): string {
  const acct = mockAccounts.find((a) => a.id === accountId)
  return acct ? acct.name : accountId
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
  title,
  text,
  color,
  bg,
  limit = 2,
}: {
  title: string
  text: string
  color: string
  bg: string
  limit?: number
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
            <span className="text-[9px] mt-0.5 font-bold" style={{ color }}>
              •
            </span>
            <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
              {item}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs italic" style={{ color: "var(--ink-3)" }}>
            —
          </li>
        )}
      </ul>
    </div>
  )
}

// ── Review card ──────────────────────────────────────────────────────────────
export function ReviewCard({
  review,
  onClick,
  isSelected,
}: {
  review: WeeklyReview
  onClick: () => void
  isSelected: boolean
}) {
  const isDraft = review.status === "draft"
  const isLoss = review.netPnl < 0

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
      {/* top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: isLoss ? "var(--loss)" : isDraft ? "var(--be)" : "var(--win)" }}
      />

      <div className="p-5">
        {/* Row 1: left label + pills + status */}
        <div className="flex items-start gap-5">
          {/* LEFT: week label */}
          <div className="shrink-0 w-28">
            <p
              className="font-mono font-bold leading-none"
              style={{ fontSize: 28, color: "var(--ink)" }}
            >
              {review.weekLabel}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
              {review.weekRange}
            </p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--ink-2)" }}>
              {accountName(review.accountId)}
            </p>
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2"
              style={{
                background: isDraft ? "var(--be-soft)" : "var(--win-soft)",
                color: isDraft ? "var(--be)" : "var(--win)",
              }}
            >
              {isDraft ? "Borrador" : "Enviada"}
            </span>
          </div>

          {/* CENTER: stat pills + discipline bar + summary */}
          <div className="flex-1 min-w-0">
            {/* Stat pills row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <StatPill
                label="Trades"
                value={review.tradeCount.toString()}
                color="var(--ink)"
                bg="var(--panel-2)"
              />
              <StatPill
                label="Net P&L"
                value={formatPnl(review.netPnl)}
                color={pnlColor(review.netPnl)}
                bg={pnlBg(review.netPnl)}
              />
              <StatPill
                label="Win Rate"
                value={`${review.winRate}%`}
                color={review.winRate >= 55 ? "var(--win)" : "var(--loss)"}
                bg={review.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)"}
              />
              <StatPill
                label="Disciplina"
                value={review.disciplineScore.toString()}
                color={disciplineColor(review.disciplineScore)}
                bg={disciplineBg(review.disciplineScore)}
              />
            </div>

            {/* Discipline bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>
                  Score de disciplina
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: disciplineColor(review.disciplineScore) }}
                >
                  {review.disciplineScore}/100
                </span>
              </div>
              <DisciplineBar score={review.disciplineScore} />
            </div>

            {/* Summary excerpt */}
            {review.executiveSummary && (
              <p
                className="text-sm line-clamp-2 leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                {review.executiveSummary}
              </p>
            )}
          </div>

          {/* RIGHT: what worked / to improve */}
          <div className="shrink-0 w-64 flex gap-2">
            <BulletPreview
              title="Qué funcionó"
              text={review.whatWorked}
              color="var(--win)"
              bg="var(--win-soft)"
            />
            <BulletPreview
              title="A mejorar"
              text={review.toImprove}
              color="var(--loss)"
              bg="var(--loss-soft)"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 mt-4 pt-4"
          style={{ borderTop: "1px solid var(--line)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" onClick={onClick}>
            Ver review completa
          </Button>
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Detail panel ─────────────────────────────────────────────────────────────
const MOCK_TRADES = [
  { symbol: "NQ", rMultiple: "+2.4R", tag: "A+", pnl: "+$960" },
  { symbol: "NQ", rMultiple: "+1.8R", tag: "A", pnl: "+$720" },
  { symbol: "ES", rMultiple: "-1.0R", tag: "B", pnl: "-$400" },
  { symbol: "NQ", rMultiple: "+3.1R", tag: "A+", pnl: "+$1,240" },
  { symbol: "MNQ", rMultiple: "-1.0R", tag: "Plan", pnl: "-$120" },
]

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

export function DetailPanel({ review, onClose }: { review: WeeklyReview; onClose: () => void }) {
  const isDraft = review.status === "draft"

  return (
    <div
      className="flex flex-col overflow-hidden detail-panel-mobile"
      style={{
        width: 380,
        background: "var(--panel)",
        borderLeft: "1px solid var(--line)",
        position: "sticky",
        top: 0,
        maxHeight: "100vh",
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
              color: isDraft ? "var(--be)" : "var(--win)",
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
      <div
        className="grid grid-cols-4 gap-0"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        {[
          { label: "Trades", value: review.tradeCount.toString(), color: "var(--ink)" },
          { label: "Net P&L", value: formatPnl(review.netPnl), color: pnlColor(review.netPnl) },
          { label: "Win Rate", value: `${review.winRate}%`, color: review.winRate >= 55 ? "var(--win)" : "var(--loss)" },
          { label: "Disciplina", value: `${review.disciplineScore}`, color: disciplineColor(review.disciplineScore) },
        ].map(({ label, value, color }, i) => (
          <div
            key={label}
            className="flex flex-col items-center py-3"
            style={{
              borderRight: i < 3 ? "1px solid var(--line)" : undefined,
            }}
          >
            <span className="font-mono font-bold text-sm" style={{ color }}>
              {value}
            </span>
            <span className="text-[10px] mt-0.5" style={{ color: "var(--ink-3)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <SectionBlock emoji="📋" title="Resumen ejecutivo" text={review.executiveSummary} />

        {/* What worked */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            ✅ Qué funcionó bien
          </p>
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--win-soft)" }}
          >
            {review.whatWorked
              .split("\n")
              .map((l) => l.replace(/^•\s*/, "").trim())
              .filter(Boolean)
              .map((item, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--win)" }}>
                    •
                  </span>
                  <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
                    {item}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* To improve */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            🔧 A mejorar
          </p>
          <div
            className="rounded-lg p-3"
            style={{ background: "var(--loss-soft)" }}
          >
            {review.toImprove
              .split("\n")
              .map((l) => l.replace(/^•\s*/, "").trim())
              .filter(Boolean)
              .map((item, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-[10px] mt-0.5 font-bold" style={{ color: "var(--loss)" }}>
                    •
                  </span>
                  <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
                    {item}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Trade breakdown table */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            📊 Trades de la semana
          </p>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--line)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  {["Símbolo", "Tag", "R múlt.", "P&L"].map((h) => (
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
                {MOCK_TRADES.map((t, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < MOCK_TRADES.length - 1 ? "1px solid var(--line)" : undefined }}
                  >
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--ink)" }}>
                      {t.symbol}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {t.tag}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 font-mono font-semibold"
                      style={{ color: t.rMultiple.startsWith("+") ? "var(--win)" : "var(--loss)" }}
                    >
                      {t.rMultiple}
                    </td>
                    <td
                      className="px-3 py-2 font-mono font-semibold"
                      style={{ color: t.pnl.startsWith("+") ? "var(--win)" : "var(--loss)" }}
                    >
                      {t.pnl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Auto-generation from trade data ──────────────────────────────────────────
interface GeneratedReview {
  tradeCount:    number
  netPnl:        number
  winRate:       number
  disciplineScore: number
  executiveSummary: string
  whatWorked:    string
  toImprove:     string
}

function generateWeekReview(weekStart: string, weekEnd: string, accountId: string): GeneratedReview {
  const trades = mockTrades.filter((t) => {
    const d = t.date
    const acctMatch = accountId === "ALL" || t.accountId === accountId
    return acctMatch && d >= weekStart && d <= weekEnd
  })

  if (trades.length === 0) {
    return {
      tradeCount: 0,
      netPnl: 0,
      winRate: 0,
      disciplineScore: 0,
      executiveSummary: "No hay trades registrados para esta semana y cuenta.",
      whatWorked: "",
      toImprove: "",
    }
  }

  const netPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winners = trades.filter((t) => (t.pnl ?? 0) > 0)
  const winRate = Math.round((winners.length / trades.length) * 100)

  // Discipline: A+ and Plan tags = disciplined; Off-plan/Impulsivo = violations
  const disciplinedCount = trades.filter((t) =>
    t.tags.some((tag) => tag === "A+" || tag === "Plan")
  ).length
  const offPlanCount = trades.filter((t) =>
    t.tags.some((tag) => tag === "Off-plan" || tag === "Impulsivo")
  ).length
  const disciplineScore = Math.round((disciplinedCount / trades.length) * 100)

  // Build executive summary
  const pnlStr = netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`
  const sentiment = disciplineScore >= 80 && winRate >= 60
    ? "Excelente semana"
    : disciplineScore >= 60 && netPnl >= 0
      ? "Semana positiva"
      : netPnl < 0
        ? "Semana difícil"
        : "Semana regular"

  const execSummary = `${sentiment}. ${trades.length} trades ejecutados con un resultado neto de ${pnlStr} (${winRate}% win rate). Score de disciplina: ${disciplineScore}/100. ${
    offPlanCount > 0
      ? `${offPlanCount} trade${offPlanCount > 1 ? "s" : ""} fuera del plan registrado${offPlanCount > 1 ? "s" : ""}.`
      : "Todos los trades siguieron el plan establecido."
  }`

  // What worked: sessions and setups from winning A+ trades
  const winningTrades = trades.filter((t) => (t.pnl ?? 0) > 0)
  const aPlus = trades.filter((t) => t.tags.includes("A+"))
  const whatWorkedLines: string[] = []
  if (aPlus.length > 0) {
    const symbols = [...new Set(aPlus.map((t) => t.symbol))].join(", ")
    whatWorkedLines.push(`Trades A+ en ${symbols} ejecutados con alta confluencia`)
  }
  if (winningTrades.length > 0) {
    const sessions = [...new Set(winningTrades.map((t) => t.session))].join(", ")
    whatWorkedLines.push(`Mejores resultados en sesión ${sessions}`)
  }
  if (disciplinedCount === trades.length) {
    whatWorkedLines.push("100% de trades dentro del plan establecido")
  }
  if (winRate >= 60) {
    whatWorkedLines.push(`Win rate de ${winRate}% por encima del objetivo`)
  }
  if (whatWorkedLines.length === 0) whatWorkedLines.push("—")

  // To improve: off-plan trades and losing patterns
  const toImproveLines: string[] = []
  const offPlanTrades = trades.filter((t) => t.tags.some((tag) => tag === "Off-plan" || tag === "Impulsivo"))
  if (offPlanTrades.length > 0) {
    const symbols = [...new Set(offPlanTrades.map((t) => t.symbol))].join(", ")
    toImproveLines.push(`Revisar disciplina en ${symbols} — ${offPlanTrades.length} trade${offPlanTrades.length > 1 ? "s" : ""} fuera del plan`)
  }
  if (winRate < 50) {
    toImproveLines.push(`Mejorar selectividad de entradas — win rate de ${winRate}% por debajo del objetivo`)
  }
  const losingTrades = trades.filter((t) => (t.pnl ?? 0) < 0)
  if (losingTrades.length > 0) {
    const sessions = [...new Set(losingTrades.map((t) => t.session))]
    if (sessions.length > 0) {
      toImproveLines.push(`Analizar trades perdedores en sesión ${sessions.join(", ")}`)
    }
  }
  if (toImproveLines.length === 0) toImproveLines.push("Mantener consistencia la próxima semana")

  return {
    tradeCount:       trades.length,
    netPnl,
    winRate,
    disciplineScore,
    executiveSummary: execSummary,
    whatWorked:       whatWorkedLines.map((l) => `• ${l}`).join("\n"),
    toImprove:        toImproveLines.map((l) => `• ${l}`).join("\n"),
  }
}

// ── Week selector card ────────────────────────────────────────────────────────
const WEEK_OPTIONS = [
  { label: "Sem. 20", range: "14–20 may", start: "2026-05-14", end: "2026-05-20", displayPnl: "+$2,640", wr: "65%" },
  { label: "Sem. 19", range: "7–13 may",  start: "2026-05-07", end: "2026-05-13", displayPnl: "+$3,920", wr: "72%" },
  { label: "Sem. 18", range: "30 abr–6 may", start: "2026-04-30", end: "2026-05-06", displayPnl: "−$1,850", wr: "42%" },
  { label: "Sem. 17", range: "23–29 abr", start: "2026-04-23", end: "2026-04-29", displayPnl: "+$1,100", wr: "60%" },
]

function WeekSelectorCard({
  week,
  selected,
  onClick,
  generated,
}: {
  week: typeof WEEK_OPTIONS[number]
  selected: boolean
  onClick: () => void
  generated?: GeneratedReview
}) {
  const pnlDisplay = generated ? (generated.netPnl >= 0 ? `+$${generated.netPnl.toLocaleString()}` : `-$${Math.abs(generated.netPnl).toLocaleString()}`) : week.displayPnl
  const wrDisplay  = generated ? `${generated.winRate}%` : week.wr
  const tradesDisplay = generated ? generated.tradeCount : "—"
  const isLoss = generated ? generated.netPnl < 0 : (week.displayPnl.startsWith("−") || week.displayPnl.startsWith("-"))
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
        <span className="font-mono font-bold text-sm" style={{ color: "var(--ink)" }}>
          {week.label}
        </span>
        {selected && <Check size={12} style={{ color: "var(--accent)" }} />}
      </div>
      <p className="text-[11px] mb-2" style={{ color: "var(--ink-3)" }}>
        {week.range}
      </p>
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
  accountId,
  name,
  broker,
  selected,
  onClick,
}: {
  accountId: string
  name: string
  broker: string
  selected: boolean
  onClick: () => void
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
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>
            {name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
            {broker}
          </p>
        </div>
        {selected && <Check size={14} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  )
}

// ── Nueva review modal ────────────────────────────────────────────────────────
export function NuevaReviewModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [step, setStep] = useState<"config" | "analisis">("config")
  const [selectedAccountId, setSelectedAccountId] = useState(mockAccounts[0].id)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [generated, setGenerated] = useState<GeneratedReview | null>(null)
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set())
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [whatWorked, setWhatWorked] = useState("")
  const [toImprove, setToImprove] = useState("")
  const [objectives, setObjectives] = useState("")
  const [insights, setInsights] = useState("")
  const [disciplineScore, setDisciplineScore] = useState(75)
  const [linkedResources, setLinkedResources] = useState<string[]>([])
  const [resourcesOpen, setResourcesOpen] = useState(false)

  const week = WEEK_OPTIONS[selectedWeek]

  function runAutoGenerate(weekIdx: number, accountId: string) {
    const w = WEEK_OPTIONS[weekIdx]
    const gen = generateWeekReview(w.start, w.end, accountId)
    setGenerated(gen)
    setExecutiveSummary(gen.executiveSummary)
    setWhatWorked(gen.whatWorked)
    setToImprove(gen.toImprove)
    setDisciplineScore(gen.disciplineScore)
    setAutoFields(new Set(["executiveSummary", "whatWorked", "toImprove", "disciplineScore"]))
  }

  function handleSelectWeek(idx: number) {
    setSelectedWeek(idx)
    runAutoGenerate(idx, selectedAccountId)
  }

  function handleSelectAccount(id: string) {
    setSelectedAccountId(id)
    runAutoGenerate(selectedWeek, id)
  }

  function markEdited(field: string) {
    setAutoFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  const isLoss = generated ? generated.netPnl < 0 : (week.displayPnl.startsWith("−") || week.displayPnl.startsWith("-"))

  function toggleResource(id: string) {
    setLinkedResources((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const discColor = disciplineColor(disciplineScore)
  const discBg = disciplineBg(disciplineScore)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                step === s
                  ? "text-[var(--ink)]"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              )}
              style={
                step === s
                  ? { background: "var(--panel)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : {}
              }
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
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  Cuenta
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {mockAccounts.map((acct) => (
                    <AccountSelectorCard
                      key={acct.id}
                      accountId={acct.id}
                      name={acct.name}
                      broker={acct.broker}
                      selected={selectedAccountId === acct.id}
                      onClick={() => handleSelectAccount(acct.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Week selector */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--ink-3)" }}
                >
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
                    Resumen automático · {week.label}
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
                      {
                        label: "Net P&L",
                        value: generated.netPnl >= 0 ? `+$${generated.netPnl.toLocaleString()}` : `-$${Math.abs(generated.netPnl).toLocaleString()}`,
                        color: generated.netPnl >= 0 ? "var(--win)" : "var(--loss)",
                        bg:    generated.netPnl >= 0 ? "var(--win-soft)" : "var(--loss-soft)",
                      },
                      {
                        label: "Win Rate",
                        value: `${generated.winRate}%`,
                        color: generated.winRate >= 55 ? "var(--win)" : "var(--loss)",
                        bg:    generated.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)",
                      },
                      {
                        label: "Disciplina",
                        value: `${generated.disciplineScore}`,
                        color: disciplineColor(generated.disciplineScore),
                        bg:    disciplineBg(generated.disciplineScore),
                      },
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
              {/* Section 1 */}
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

              {/* Section 2 */}
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

              {/* Section 3 */}
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

              {/* Section 4 */}
              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--ink-3)" }}
                >
                  🎯 Objetivos para la próxima semana
                </label>
                <Textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder={"• Objetivo 1\n• Objetivo 2\n• Objetivo 3"}
                  rows={3}
                />
              </div>

              {/* Section 5 */}
              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--ink-3)" }}
                >
                  🧠 Insights y aprendizajes clave
                </label>
                <Textarea
                  value={insights}
                  onChange={(e) => setInsights(e.target.value)}
                  placeholder="Notas sobre el juego mental, patrones detectados, aprendizajes del mercado..."
                  rows={3}
                />
              </div>

              {/* Aprendizajes pendientes accordion */}
              {REVIEW_RESOURCES.length > 0 && (
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
                      📚 Aprendizajes pendientes ({REVIEW_RESOURCES.length})
                    </span>
                    {resourcesOpen ? (
                      <ChevronUp size={14} style={{ color: "var(--ink-3)" }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: "var(--ink-3)" }} />
                    )}
                  </button>
                  {resourcesOpen && (
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {REVIEW_RESOURCES.map((res) => (
                        <label
                          key={res.id}
                          className="flex items-start gap-3 cursor-pointer"
                        >
                          <div
                            className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                            style={{
                              background: linkedResources.includes(res.id)
                                ? "var(--accent)"
                                : "var(--panel)",
                              borderColor: linkedResources.includes(res.id)
                                ? "var(--accent)"
                                : "var(--line)",
                            }}
                            onClick={() => toggleResource(res.id)}
                          >
                            {linkedResources.includes(res.id) && (
                              <Check size={10} style={{ color: "white" }} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                              {res.title}
                            </p>
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
                  style={{
                    fontSize: 40,
                    lineHeight: 1.2,
                    color: discColor,
                    background: "transparent",
                    borderColor: `${discColor}44`,
                  }}
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
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant="ghost"
                onClick={() => runAutoGenerate(selectedWeek, selectedAccountId)}
              >
                ✨ Auto-generar
              </Button>
              <Button variant="primary" onClick={() => { runAutoGenerate(selectedWeek, selectedAccountId); setStep("analisis") }}>
                Siguiente →
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("config")}>
                ← Atrás
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Guardar borrador
              </Button>
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                Enviar review
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
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null)

  function handleCardClick(review: WeeklyReview) {
    setSelectedReview((prev) => (prev?.id === review.id ? null : review))
  }

  return (
    <>
      <div className="flex gap-0 items-start" style={{ margin: selectedReview ? "-28px -32px" : undefined }}>
        {/* Main column */}
        <div className={cn("flex-1 min-w-0", selectedReview ? "px-8 py-7" : "")}>
          <TopBar
            title="Reviews"
            subtitle="Semanas analizadas y aprendizajes"
            actions={[
              {
                label: "Nueva review",
                icon: <Plus size={14} />,
                variant: "primary",
                onClick: () => setModalOpen(true),
              },
            ]}
          />

          <KpiStrip items={KPIS} className="mb-6" />

          <div className="flex flex-col gap-3">
            {ALL_REVIEWS.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => handleCardClick(review)}
                isSelected={selectedReview?.id === review.id}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedReview && (
          <DetailPanel review={selectedReview} onClose={() => setSelectedReview(null)} />
        )}
      </div>

      <NuevaReviewModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}

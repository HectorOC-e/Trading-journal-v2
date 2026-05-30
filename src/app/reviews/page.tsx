"use client"

import { useMemo, useState } from "react"
import { Plus, TrendingUp, Percent, Award, ClipboardCheck } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/trpc/root"
import { ReviewDetailPanel } from "./components/review-detail-panel"
import { NuevaReviewModal } from "./modals/create-review-modal"

type ReviewFromDB  = RouterOutputs["weeklyReviews"]["list"][number]
type AccountFromDB = RouterOutputs["accounts"]["list"][number]
type TradeFromDB   = RouterOutputs["trades"]["list"]["items"][number]

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg" style={{ background: bg, minWidth: 72 }}>
      <span className="font-mono font-bold text-sm leading-tight" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium mt-0.5" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  )
}

// ── DisciplineBar ─────────────────────────────────────────────────────────────
function DisciplineBar({ score }: { score: number }) {
  return (
    <div className="h-1 w-full rounded-full" style={{ background: "var(--line)" }}>
      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: disciplineColor(score) }} />
    </div>
  )
}

// ── BulletPreview ─────────────────────────────────────────────────────────────
function BulletPreview({ title, text, color, bg, limit = 2 }: { title: string; text: string; color: string; bg: string; limit?: number }) {
  const items = text.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean).slice(0, limit)
  return (
    <div className="flex-1 rounded-lg p-3" style={{ background: bg }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-[9px] mt-0.5 font-bold" style={{ color }}>•</span>
            <span className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>{item}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs italic" style={{ color: "var(--ink-3)" }}>—</li>}
      </ul>
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────
function ReviewCard({ review, onClick, isSelected, accountName }: {
  review: ReviewFromDB; onClick: () => void; isSelected: boolean
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
      <div className="h-0.5 w-full" style={{ background: isLoss ? "var(--loss)" : isDraft ? "var(--be)" : "var(--win)" }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-5 mb-3">
          {/* LEFT */}
          <div className="shrink-0 w-20 sm:w-28">
            <p className="font-mono font-bold leading-none" style={{ fontSize: "clamp(20px,5vw,28px)", color: "var(--ink)" }}>{review.weekLabel}</p>
            <p className="text-[10px] sm:text-xs mt-1" style={{ color: "var(--ink-3)" }}>{review.weekRange}</p>
            <p className="text-[10px] sm:text-[11px] mt-0.5 font-medium truncate" style={{ color: "var(--ink-2)" }}>{accountName(review.accountId)}</p>
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
              style={{ background: isDraft ? "var(--be-soft)" : "var(--win-soft)", color: isDraft ? "var(--be)" : "var(--win)" }}
            >
              {isDraft ? "Borrador" : "Enviada"}
            </span>
          </div>

          {/* CENTER */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-3">
              <StatPill label="Trades"     value={review.tradeCount.toString()}       color="var(--ink)"                                           bg="var(--panel-2)" />
              <StatPill label="Net P&L"    value={formatPnl(review.netPnl)}           color={pnlColor(review.netPnl)}                              bg={pnlBg(review.netPnl)} />
              <StatPill label="Win Rate"   value={`${review.winRate.toFixed(0)}%`}    color={review.winRate >= 55 ? "var(--win)" : "var(--loss)"}   bg={review.winRate >= 55 ? "var(--win-soft)" : "var(--loss-soft)"} />
              <StatPill label="Disciplina" value={review.disciplineScore.toString()}  color={disciplineColor(review.disciplineScore)}               bg={disciplineBg(review.disciplineScore)} />
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>Score de disciplina</span>
                <span className="text-[10px] font-bold" style={{ color: disciplineColor(review.disciplineScore) }}>{review.disciplineScore}/100</span>
              </div>
              <DisciplineBar score={review.disciplineScore} />
            </div>

            {review.executiveSummary && (
              <p className="hidden sm:block text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--ink-2)" }}>{review.executiveSummary}</p>
            )}
          </div>

          {/* RIGHT bullet previews */}
          <div className="hidden lg:flex shrink-0 w-64 gap-2">
            <BulletPreview title="Qué funcionó" text={review.whatWorked} color="var(--win)"  bg="var(--win-soft)" />
            <BulletPreview title="A mejorar"    text={review.toImprove}  color="var(--loss)" bg="var(--loss-soft)" />
          </div>
        </div>

        {/* Bullet previews on mobile */}
        <div className="flex lg:hidden gap-2 mb-3">
          <BulletPreview title="Qué funcionó" text={review.whatWorked} color="var(--win)"  bg="var(--win-soft)" />
          <BulletPreview title="A mejorar"    text={review.toImprove}  color="var(--loss)" bg="var(--loss-soft)" />
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onClick}>Ver review completa</Button>
          <Button variant="ghost" size="sm">Editar</Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const [modalOpen,      setModalOpen]      = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewFromDB | null>(null)

  const { data: reviews = [], isLoading } = trpc.weeklyReviews.list.useQuery()
  const { data: accounts = [] }           = trpc.accounts.list.useQuery()
  const { data: reviewResources = [] }    = trpc.learningResources.list.useQuery({ markedForReview: true })
  const { data: rawPageTrades }           = trpc.trades.list.useQuery()
  const allTrades: TradeFromDB[]          = rawPageTrades?.items ?? []

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
        <div className={cn("flex-1 min-w-0", selectedReview ? "px-8 py-7" : "")}>
          <TopBar
            title="Reviews"
            subtitle="Semanas analizadas y aprendizajes"
            actions={[{ label: "Nueva review", icon: <Plus size={14} />, variant: "primary", onClick: () => setModalOpen(true) }]}
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

        {selectedReview && (
          <ReviewDetailPanel
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

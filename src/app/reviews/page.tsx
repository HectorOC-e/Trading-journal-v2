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
import { ReviewCard } from "./components/review-card"

type ReviewFromDB  = RouterOutputs["weeklyReviews"]["list"][number]
type AccountFromDB = RouterOutputs["accounts"]["list"][number]
type TradeFromDB   = RouterOutputs["trades"]["list"]["items"][number]

export default function ReviewsPage() {
  const [modalOpen,      setModalOpen]      = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewFromDB | null>(null)

  const { data: reviews = [], isLoading } = trpc.weeklyReviews.list.useQuery()
  const { data: accounts = [] }           = trpc.accounts.list.useQuery()
  const { data: reviewResources = [] }    = trpc.learningResources.list.useQuery({ markedForReview: true })
  const { data: rawPageTrades }           = trpc.trades.list.useQuery({ limit: 200 })
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

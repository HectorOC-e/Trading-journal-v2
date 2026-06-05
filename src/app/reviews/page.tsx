"use client"

// TASK-048: Review filtering and search
// Sprint 7: Filter state synced to URL params for persistence across navigation
// Sprint 8 (TASK-071): Monthly reviews tab added

import { useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, TrendingUp, Percent, Award, ClipboardCheck, Search, X, Calendar } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { KpiStrip } from "@/components/ui/kpi-strip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"
import { ReviewDetailPanel } from "./components/review-detail-panel"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { NuevaReviewModal } from "./modals/create-review-modal"
import { NuevaMensualModal } from "./modals/create-monthly-review-modal"
import { ReviewCard } from "./components/review-card"
import { MonthlyReviewCard } from "./components/monthly-review-card"

type ReviewFromDB        = RouterOutputs["weeklyReviews"]["list"][number]
type MonthlyReviewFromDB = RouterOutputs["monthlyReviews"]["list"][number]
type AccountFromDB       = RouterOutputs["accounts"]["list"][number]
type TradeFromDB         = RouterOutputs["trades"]["list"]["items"][number]

type ReviewTab = "weekly" | "monthly"

type OutcomeFilter = "ALL" | "WIN" | "LOSS" | "NEUTRAL"
type StatusFilter  = "ALL" | "draft" | "submitted"

const OUTCOME_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "ALL",     label: "Todos"     },
  { value: "WIN",     label: "Positivo"  },
  { value: "LOSS",    label: "Negativo"  },
  { value: "NEUTRAL", label: "Neutral"   },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL",       label: "Todos"       },
  { value: "submitted", label: "Completadas" },
  { value: "draft",     label: "Borrador"    },
]

const VALID_OUTCOMES = new Set(["ALL", "WIN", "LOSS", "NEUTRAL"])
const VALID_STATUSES = new Set(["ALL", "draft", "submitted"])

function FilterChip<T extends string>({
  value, options, onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors",
            value === o.value
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-3)] hover:text-[var(--ink)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Hook that syncs filter state to URL search params.
// router.replace() updates the URL without adding a browser history entry.
function useReviewFilters() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const q       = searchParams.get("q") ?? ""
  const outcome = (VALID_OUTCOMES.has(searchParams.get("outcome") ?? "") ? searchParams.get("outcome") : "ALL") as OutcomeFilter
  const status  = (VALID_STATUSES.has(searchParams.get("status")  ?? "") ? searchParams.get("status")  : "ALL") as StatusFilter
  const disc    = searchParams.get("disc") ?? ""

  function buildParams(overrides: Record<string, string | null>) {
    const p = new URLSearchParams()
    const merged = { q, outcome, status, disc, ...overrides }
    if (merged.q)                           p.set("q",       merged.q)
    if (merged.outcome && merged.outcome !== "ALL") p.set("outcome", merged.outcome)
    if (merged.status  && merged.status  !== "ALL") p.set("status",  merged.status)
    if (merged.disc)                        p.set("disc",    merged.disc)
    const qs = p.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const setSearchQuery   = (v: string)         => router.replace(buildParams({ q: v || null }))
  const setOutcomeFilter = (v: OutcomeFilter)  => router.replace(buildParams({ outcome: v === "ALL" ? null : v }))
  const setStatusFilter  = (v: StatusFilter)   => router.replace(buildParams({ status:  v === "ALL" ? null : v }))
  const setMinDisc       = (v: string)         => router.replace(buildParams({ disc: v || null }))
  const clearFilters     = () => router.replace(pathname)

  return {
    searchQuery: q, setSearchQuery,
    outcomeFilter: outcome, setOutcomeFilter,
    statusFilter: status, setStatusFilter,
    minDisc: disc, setMinDisc,
    clearFilters,
    hasFilters: !!(q || outcome !== "ALL" || status !== "ALL" || disc),
  }
}

function ReviewsPageContent() {
  const [activeTab,         setActiveTab]         = useState<ReviewTab>("weekly")
  const [modalOpen,         setModalOpen]          = useState(false)
  const [selectedReview,    setSelectedReview]     = useState<ReviewFromDB | null>(null)
  const [editingReview,     setEditingReview]      = useState<ReviewFromDB | null>(null)
  const [monthlyModalOpen,  setMonthlyModalOpen]   = useState(false)
  const [editingMonthly,    setEditingMonthly]     = useState<MonthlyReviewFromDB | null>(null)
  const [selectedMonthlyId, setSelectedMonthlyId] = useState<string | null>(null)

  const now   = new Date()
  const [monthlyYear,  setMonthlyYear]  = useState(now.getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1)

  const {
    searchQuery, setSearchQuery,
    outcomeFilter, setOutcomeFilter,
    statusFilter, setStatusFilter,
    minDisc, setMinDisc,
    clearFilters, hasFilters,
  } = useReviewFilters()

  const { data: reviews = [], isLoading }        = trpc.weeklyReviews.list.useQuery()
  const { data: monthlyReviews = [], isLoading: monthlyLoading } = trpc.monthlyReviews.list.useQuery()
  const { data: accounts = [] }                 = trpc.accounts.list.useQuery()
  const { data: reviewResources = [] }          = trpc.learningResources.list.useQuery({ markedForReview: true })
  const { data: rawPageTrades }                 = trpc.trades.list.useQuery({ limit: 200 })
  const allTrades: TradeFromDB[]                = rawPageTrades?.items ?? []

  const utils = trpc.useUtils()
  const deleteMonthly = trpc.monthlyReviews.delete.useMutation({
    onSuccess: () => utils.monthlyReviews.list.invalidate(),
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

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
      trend: "neutral" as const,
      mono:  true,
      icon:  <ClipboardCheck size={15} />,
    },
  ], [reviews, totalPnl, avgWr, avgDisc])

  const filteredReviews = useMemo(() => {
    const q       = searchQuery.trim().toLowerCase()
    const minDiscN = minDisc !== "" ? parseFloat(minDisc) : null

    return reviews.filter((r: ReviewFromDB) => {
      if (q) {
        const haystack = [
          r.executiveSummary ?? "",
          r.whatWorked ?? "",
          r.toImprove ?? "",
          r.weekLabel ?? "",
        ].join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (outcomeFilter !== "ALL") {
        if (outcomeFilter === "WIN"     && r.netPnl <= 0)  return false
        if (outcomeFilter === "LOSS"    && r.netPnl >= 0)  return false
        if (outcomeFilter === "NEUTRAL" && r.netPnl !== 0) return false
      }
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false
      if (minDiscN !== null && r.disciplineScore < minDiscN) return false
      return true
    })
  }, [reviews, searchQuery, outcomeFilter, statusFilter, minDisc])

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
      <div>
        <div className="min-w-0">
          <TopBar
            title="Reviews"
            subtitle="Semanas y meses analizados"
            actions={[{
              label: activeTab === "weekly" ? "Nueva review" : "Nueva review mensual",
              icon: activeTab === "weekly" ? <Plus size={14} /> : <Calendar size={14} />,
              variant: "primary",
              onClick: () => activeTab === "weekly" ? setModalOpen(true) : setMonthlyModalOpen(true),
            }]}
          />

          {/* Semanales / Mensuales tab toggle */}
          <SegmentedTabs
            variant="pill"
            options={[{ value: "weekly", label: "Semanales" }, { value: "monthly", label: "Mensuales" }]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as ReviewTab)}
            ariaLabel="Tipo de review"
            className="mb-5"
          />

          {/* ── Monthly reviews tab ── */}
          {activeTab === "monthly" && (
            <>
              {monthlyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm text-[var(--ink-3)]">Cargando reviews mensuales…</p>
                </div>
              ) : monthlyReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <p className="text-sm text-[var(--ink-3)]">No hay reviews mensuales todavía.</p>
                  <Button variant="primary" onClick={() => setMonthlyModalOpen(true)}>
                    <Plus size={14} className="mr-1" /> Crear primera review mensual
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {monthlyReviews.map((review: MonthlyReviewFromDB) => (
                    <MonthlyReviewCard
                      key={review.id}
                      review={review}
                      isSelected={selectedMonthlyId === review.id}
                      onClick={() => setSelectedMonthlyId(s => s === review.id ? null : review.id)}
                      onEdit={() => {
                        setEditingMonthly(review)
                        setMonthlyYear(review.year)
                        setMonthlyMonth(review.month)
                        setMonthlyModalOpen(true)
                      }}
                      onDelete={() => {
                        if (confirm("¿Eliminar esta review mensual?")) {
                          deleteMonthly.mutate(review.id)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Weekly reviews tab ── */}
          {activeTab === "weekly" && (
            <>
          <KpiStrip items={kpis} className="mb-5" />
          {/* TASK-048 + Sprint 7 URL persistence: Filter bar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar en reviews…"
                className="w-full pl-7 pr-3 h-8 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X size={11} className="text-[var(--ink-3)]" />
                </button>
              )}
            </div>

            <div className="w-px h-4 bg-[var(--line)]" />

            <FilterChip value={outcomeFilter} options={OUTCOME_OPTIONS} onChange={setOutcomeFilter} />

            <div className="w-px h-4 bg-[var(--line)]" />

            <FilterChip value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />

            <div className="w-px h-4 bg-[var(--line)]" />

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-3)] whitespace-nowrap">Disc ≥</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minDisc}
                onChange={e => setMinDisc(e.target.value)}
                placeholder="—"
                className="w-14 h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[12px] text-[var(--ink)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <span className="text-[11px] text-[var(--ink-3)] ml-auto whitespace-nowrap">
              {filteredReviews.length} de {reviews.length}
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Limpiar filtros
              </button>
            )}
          </div>

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
          ) : filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-[13px] text-[var(--ink-3)]">Sin resultados para los filtros actuales.</p>
              <button onClick={clearFilters} className="text-[11px] text-[var(--accent)] hover:underline">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredReviews.map((review: ReviewFromDB) => (
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
            </>
          )}
        </div>
      </div>

      <DrawerPanel
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        width={480}
        ariaLabel="Detalle de la review"
      >
        {selectedReview && (
          <ReviewDetailPanel
            review={selectedReview}
            onClose={() => setSelectedReview(null)}
            accountName={accountName}
            weekTrades={weekTrades}
            onEdit={(r) => { setEditingReview(r); setModalOpen(true) }}
          />
        )}
      </DrawerPanel>

      <NuevaReviewModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingReview(null) }}
        reviewResources={reviewResources}
        editReview={editingReview}
      />

      <NuevaMensualModal
        open={monthlyModalOpen}
        onOpenChange={(v) => { setMonthlyModalOpen(v); if (!v) setEditingMonthly(null) }}
        year={monthlyYear}
        month={monthlyMonth}
        editReview={editingMonthly}
      />
    </>
  )
}

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsPageContent />
    </Suspense>
  )
}

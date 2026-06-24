"use client"

// TASK-048: Review filtering and search
// Sprint 7: Filter state synced to URL params for persistence across navigation
// Sprint 8 (TASK-071): Monthly reviews tab added
// 2026-06: weekly redesign v2 — hero is the top node of a month-grouped timeline;
// calendar (month/year) filter; no drawer panel; cards own delete via ⋯ menu.

import { useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, Search, X, Calendar } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { NuevaMensualModal } from "./modals/create-monthly-review-modal"
import { WeekHero } from "./components/week-hero"
import { WeekTimeline, type MonthGroup } from "./components/week-timeline"
import { ReviewsCalendarFilter, type MonthFilter } from "./components/reviews-calendar-filter"
import { MonthlyReviewCard } from "./components/monthly-review-card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

/** Monday (local) of the current week, as YYYY-MM-DD. */
function currentMondayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

type ReviewFromDB        = RouterOutputs["weeklyReviews"]["list"][number]
type MonthlyReviewFromDB = RouterOutputs["monthlyReviews"]["list"][number]
type AccountFromDB       = RouterOutputs["accounts"]["list"][number]

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
  { value: "ALL",       label: "Todas"       },
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
            "px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
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

  function buildParams(overrides: Record<string, string | null>) {
    const p = new URLSearchParams()
    const merged = { q, outcome, status, ...overrides }
    if (merged.q)                                   p.set("q",       merged.q)
    if (merged.outcome && merged.outcome !== "ALL") p.set("outcome", merged.outcome)
    if (merged.status  && merged.status  !== "ALL") p.set("status",  merged.status)
    const qs = p.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const setSearchQuery   = (v: string)         => router.replace(buildParams({ q: v || null }))
  const setOutcomeFilter = (v: OutcomeFilter)  => router.replace(buildParams({ outcome: v === "ALL" ? null : v }))
  const setStatusFilter  = (v: StatusFilter)   => router.replace(buildParams({ status:  v === "ALL" ? null : v }))
  const clearFilters     = () => router.replace(pathname)

  return {
    searchQuery: q, setSearchQuery,
    outcomeFilter: outcome, setOutcomeFilter,
    statusFilter: status, setStatusFilter,
    clearFilters,
    hasFilters: !!(q || outcome !== "ALL" || status !== "ALL"),
  }
}

function ReviewsPageContent() {
  const router = useRouter()
  const [activeTab,         setActiveTab]        = useState<ReviewTab>("weekly")
  const [monthFilter,       setMonthFilter]      = useState<MonthFilter>(null)
  const [monthlyModalOpen,  setMonthlyModalOpen] = useState(false)
  const [editingMonthly,    setEditingMonthly]   = useState<MonthlyReviewFromDB | null>(null)
  const [pendingDelete,        setPendingDelete]        = useState<ReviewFromDB | null>(null)
  const [pendingMonthlyDelete, setPendingMonthlyDelete] = useState<MonthlyReviewFromDB | null>(null)

  const now   = new Date()
  const [monthlyYear,  setMonthlyYear]  = useState(now.getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1)

  const {
    searchQuery, setSearchQuery,
    outcomeFilter, setOutcomeFilter,
    statusFilter, setStatusFilter,
    clearFilters, hasFilters,
  } = useReviewFilters()

  const thisMonday = useMemo(() => currentMondayISO(), [])

  const { data: reviews = [], isLoading }        = trpc.weeklyReviews.list.useQuery()
  const { data: monthlyReviews = [], isLoading: monthlyLoading } = trpc.monthlyReviews.list.useQuery()
  const { data: accounts = [] }                 = trpc.accounts.list.useQuery()

  // Live "current week" hero (the in-progress, auto-draft week).
  const { data: currentWeek, isLoading: currentWeekLoading } =
    trpc.weeklyReviews.report.useQuery({ weekStart: thisMonday }, { enabled: activeTab === "weekly" })

  const utils = trpc.useUtils()
  const deleteWeekly = trpc.weeklyReviews.delete.useMutation({
    onSuccess: () => { utils.weeklyReviews.list.invalidate(); setPendingDelete(null); toast.success("Review eliminada") },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })
  const deleteMonthly = trpc.monthlyReviews.delete.useMutation({
    onSuccess: () => { utils.monthlyReviews.list.invalidate(); setPendingMonthlyDelete(null); toast.success("Review mensual eliminada") },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const accountName = (id: string | null) => {
    if (!id) return "—"
    return accounts.find((a: AccountFromDB) => a.id === id)?.name ?? id
  }

  // Months that have at least one past review (for the calendar filter dots).
  const monthsWithReviews = useMemo(() => {
    const s = new Set<string>()
    for (const r of reviews) if (r.weekStart !== thisMonday) s.add(r.weekStart.slice(0, 7))
    return s
  }, [reviews, thisMonday])

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return reviews.filter((r: ReviewFromDB) => {
      if (r.weekStart === thisMonday) return false // the current week lives in the hero
      if (monthFilter) {
        const y = +r.weekStart.slice(0, 4), m = +r.weekStart.slice(5, 7)
        if (y !== monthFilter.year) return false
        if (monthFilter.month != null && m !== monthFilter.month) return false
      }
      if (q) {
        const haystack = [r.executiveSummary ?? "", r.whatWorked ?? "", r.toImprove ?? "", r.weekLabel ?? ""].join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (outcomeFilter !== "ALL") {
        if (outcomeFilter === "WIN"     && r.netPnl <= 0)  return false
        if (outcomeFilter === "LOSS"    && r.netPnl >= 0)  return false
        if (outcomeFilter === "NEUTRAL" && r.netPnl !== 0) return false
      }
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false
      return true
    })
  }, [reviews, searchQuery, outcomeFilter, statusFilter, monthFilter, thisMonday])

  // Group the filtered weeks by calendar month (most recent first).
  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, ReviewFromDB[]>()
    for (const r of filteredReviews) {
      const key = r.weekStart.slice(0, 7)
      const arr = map.get(key) ?? []
      arr.push(r); map.set(key, arr)
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, rs]) => ({
        key,
        label: `${MONTHS_LONG[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`,
        netPnl: rs.reduce((s, r) => s + r.netPnl, 0),
        reviews: rs,
      }))
  }, [filteredReviews])

  const anyFilter = hasFilters || monthFilter != null
  const clearAll  = () => { clearFilters(); setMonthFilter(null) }
  const showHero  = monthFilter == null

  function openReview(r: ReviewFromDB) {
    router.push(`/reviews/semanal/${r.weekStart}`)
  }
  function removeReview(r: ReviewFromDB) {
    setPendingDelete(r)
  }
  function goNewMonthly() {
    const d = new Date()
    router.push(`/reviews/mensual/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  return (
    <>
      <div>
        <div className="min-w-0">
          <TopBar
            title="Reviews"
            subtitle="Tu evolución, semana a semana"
            actions={activeTab === "monthly" ? [{
              label: "Nueva review mensual",
              icon: <Calendar size={14} />,
              variant: "primary",
              onClick: goNewMonthly,
            }] : []}
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
                  <Button variant="primary" onClick={goNewMonthly}>
                    <Plus size={14} className="mr-1" /> Crear primera review mensual
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {monthlyReviews.map((review: MonthlyReviewFromDB) => (
                    <MonthlyReviewCard
                      key={review.id}
                      review={review}
                      isSelected={false}
                      onClick={() => router.push(`/reviews/mensual/${review.year}-${String(review.month).padStart(2, "0")}`)}
                      onEdit={() => {
                        setEditingMonthly(review)
                        setMonthlyYear(review.year)
                        setMonthlyMonth(review.month)
                        setMonthlyModalOpen(true)
                      }}
                      onDelete={() => setPendingMonthlyDelete(review)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Weekly reviews tab ── */}
          {activeTab === "weekly" && (
            <>
              {/* Compact filter bar (above the hero so the timeline reads continuous) */}
              <div className="flex items-center gap-2.5 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-[240px]">
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

                <ReviewsCalendarFilter value={monthFilter} onChange={setMonthFilter} monthsWithReviews={monthsWithReviews} />
                <FilterChip value={outcomeFilter} options={OUTCOME_OPTIONS} onChange={setOutcomeFilter} />
                <FilterChip value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />

                <span className="text-[11px] text-[var(--ink-3)] ml-auto whitespace-nowrap">
                  {filteredReviews.length} semana{filteredReviews.length === 1 ? "" : "s"}
                </span>
                {anyFilter && (
                  <button onClick={clearAll} className="text-[11px] text-[var(--accent)] hover:underline whitespace-nowrap">
                    Limpiar
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-[176px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <WeekTimeline
                    groups={groups}
                    heroSlot={<WeekHero data={currentWeek} weekStart={thisMonday} isLoading={currentWeekLoading} />}
                    showHero={showHero}
                    onOpen={openReview}
                    onDelete={removeReview}
                    accountName={accountName}
                  />

                  {groups.length === 0 && (
                    anyFilter ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <p className="text-[13px] text-[var(--ink-3)]">Sin reviews para este filtro.</p>
                        <button onClick={clearAll} className="text-[11px] text-[var(--accent)] hover:underline">Limpiar filtros</button>
                      </div>
                    ) : (
                      <p className="text-center text-[13px] text-[var(--ink-3)] py-8">
                        Aún no hay semanas anteriores. Tu semana en curso está arriba.
                      </p>
                    )
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <NuevaMensualModal
        open={monthlyModalOpen}
        onOpenChange={(v) => { setMonthlyModalOpen(v); if (!v) setEditingMonthly(null) }}
        year={monthlyYear}
        month={monthlyMonth}
        editReview={editingMonthly}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => { if (!v) setPendingDelete(null) }}
        title="Eliminar review semanal"
        description={pendingDelete ? `Se eliminará la review de “${pendingDelete.weekLabel}”. Esta acción no se puede deshacer.` : ""}
        loading={deleteWeekly.isPending}
        onConfirm={() => { if (pendingDelete) deleteWeekly.mutate(pendingDelete.id) }}
      />

      <ConfirmDialog
        open={!!pendingMonthlyDelete}
        onOpenChange={(v) => { if (!v) setPendingMonthlyDelete(null) }}
        title="Eliminar review mensual"
        description="Se eliminará esta review mensual. Esta acción no se puede deshacer."
        loading={deleteMonthly.isPending}
        onConfirm={() => { if (pendingMonthlyDelete) deleteMonthly.mutate(pendingMonthlyDelete.id) }}
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

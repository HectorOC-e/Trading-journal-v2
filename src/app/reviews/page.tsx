"use client"

// Unified Reviews index (2026-06 redesign — faithful port of Reviews.dc.html).
// One continuous view: a "Trayectoria" panel on top, the live current-week hero, then
// one chapter per calendar month (rich "Edición" header + that month's weekly cards on
// a short rail). No Semanales/Mensuales tabs; a discreet year/month calendar filter
// scopes both the trajectory and the chapters. Theme/palette is the app's global one.

import { useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"
import { WeekHero } from "./components/week-hero"
import { TrajectoryPanel } from "./components/trajectory-panel"
import { ReviewsTimeline, type TimelineChapter } from "./components/reviews-timeline"
import { ReviewsRail } from "./components/reviews-rail"
import type { JumpItem } from "./components/month-jump-index"
import type { MonthFilter } from "./components/reviews-calendar-filter"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deriveGrade, deriveVerdict, type VerdictTone } from "@/server/services/reviews/verdict"
import type { EditionHeaderData } from "./components/edition-header"

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

/** Build the Edición header model from the month's weekly rows (+ its monthly review, if any). */
function buildEdition(
  key: string, year: number, month: number,
  weeksDesc: ReviewFromDB[], mr: MonthlyReviewFromDB | null,
  net: number, weekPnls: number[], currentYm: string,
): EditionHeaderData {
  const monthShort = MONTHS_LONG[month - 1]
  const current = key === currentYm

  if (mr) {
    const verdict = deriveVerdict({
      aiAnalysis: mr.aiAnalysis ?? null, netPnl: mr.netPnl,
      winRate: mr.winRate, disciplineScore: mr.overallScore, trades: mr.trades,
    })
    return {
      monthShort, year, gradeLetter: mr.gradeLetter, gradeTone: mr.gradeTone as VerdictTone,
      current, net: mr.netPnl, deltaPnl: mr.deltaPnl, weekPnls, goalsPct: mr.goalsPct, verdict,
    }
  }

  // No saved monthly review → derive a header from the weekly rows.
  const trades = weeksDesc.reduce((s, r) => s + r.tradeCount, 0)
  const avgWr  = weeksDesc.length ? weeksDesc.reduce((s, r) => s + r.winRate, 0) / weeksDesc.length : 0
  const grade  = deriveGrade({ disciplineScore: null, winRate: avgWr, netPnl: net, profitFactor: 0, trades })
  const verdict = deriveVerdict({ aiAnalysis: null, netPnl: net, winRate: avgWr, disciplineScore: null, trades })
  return { monthShort, year, gradeLetter: grade.letter, gradeTone: grade.tone, current, net, deltaPnl: null, weekPnls, goalsPct: 0, verdict }
}

function ReviewsPageContent() {
  const router = useRouter()
  const [monthFilter,   setMonthFilter]   = useState<MonthFilter>(null)
  const [pendingDelete, setPendingDelete] = useState<ReviewFromDB | null>(null)

  const thisMonday = useMemo(() => currentMondayISO(), [])
  const currentYm  = thisMonday.slice(0, 7)

  const { data: reviews = [],        isLoading }            = trpc.weeklyReviews.list.useQuery()
  const { data: monthlyReviews = [] }                       = trpc.monthlyReviews.list.useQuery()
  const { data: accounts = [] }                             = trpc.accounts.list.useQuery()

  const overviewInput = monthFilter
    ? { year: monthFilter.year, ...(monthFilter.month != null ? { month: monthFilter.month } : {}) }
    : undefined
  const { data: overview, isLoading: overviewLoading } = trpc.weeklyReviews.overview.useQuery(overviewInput)

  const { data: currentWeek, isLoading: currentWeekLoading } =
    trpc.weeklyReviews.report.useQuery({ weekStart: thisMonday })

  const utils = trpc.useUtils()
  const deleteWeekly = trpc.weeklyReviews.delete.useMutation({
    onSuccess: () => {
      utils.weeklyReviews.list.invalidate()
      utils.weeklyReviews.overview.invalidate()
      setPendingDelete(null)
      toast.success("Review eliminada")
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const accountName = (id: string | null) => {
    if (!id) return "—"
    return accounts.find((a: AccountFromDB) => a.id === id)?.name ?? id
  }

  const monthsWithReviews = useMemo(() => {
    const s = new Set<string>()
    for (const r of reviews) if (r.weekStart !== thisMonday) s.add(r.weekStart.slice(0, 7))
    return s
  }, [reviews, thisMonday])

  const monthlyByKey = useMemo(() => {
    const m = new Map<string, MonthlyReviewFromDB>()
    for (const mr of monthlyReviews) m.set(`${mr.year}-${String(mr.month).padStart(2, "0")}`, mr)
    return m
  }, [monthlyReviews])

  // One chapter per calendar month (most recent first), excluding the live current week
  // (it lives in the hero). Each chapter joins its weekly rows with the monthly review.
  const chapters = useMemo<TimelineChapter[]>(() => {
    const weeks = reviews.filter((r: ReviewFromDB) => {
      if (r.weekStart === thisMonday) return false
      if (monthFilter) {
        const y = +r.weekStart.slice(0, 4), mo = +r.weekStart.slice(5, 7)
        if (y !== monthFilter.year) return false
        if (monthFilter.month != null && mo !== monthFilter.month) return false
      }
      return true
    })

    const map = new Map<string, ReviewFromDB[]>()
    for (const r of weeks) {
      const k = r.weekStart.slice(0, 7)
      const arr = map.get(k) ?? []
      arr.push(r); map.set(k, arr)
    }

    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, rs]) => {
        rs.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)) // most recent first
        const year = +key.slice(0, 4), month = +key.slice(5, 7)
        const net  = rs.reduce((s, r) => s + r.netPnl, 0)
        const weekPnls = [...rs].reverse().map(r => r.netPnl)   // chronological for the bars
        const edition = buildEdition(key, year, month, rs, monthlyByKey.get(key) ?? null, net, weekPnls, currentYm)
        return { key, year, month, edition, weeks: rs }
      })
  }, [reviews, monthFilter, thisMonday, monthlyByKey, currentYm])

  // Hero shows when the filter is off or includes the current month.
  const showHero = monthFilter == null
    || (monthFilter.year === +currentYm.slice(0, 4) && (monthFilter.month == null || monthFilter.month === +currentYm.slice(5, 7)))

  // Anchors for the rail's "Saltar a mes" jump index (matches the timeline ids).
  const jumpItems = useMemo<JumpItem[]>(() => {
    const items: JumpItem[] = []
    if (showHero) items.push({ id: "review-hero", label: "Semana en curso" })
    for (const ch of chapters) items.push({ id: `chapter-${ch.key}`, label: `${MONTHS_LONG[ch.month - 1]} ${ch.year}` })
    return items
  }, [showHero, chapters])

  const goNewWeekly = () => router.push(`/reviews/semanal/${thisMonday}`)
  const openWeek    = (r: ReviewFromDB) => router.push(`/reviews/semanal/${r.weekStart}`)
  const openEdition = (ch: TimelineChapter) => router.push(`/reviews/mensual/${ch.year}-${String(ch.month).padStart(2, "0")}`)

  const noContent = !isLoading && chapters.length === 0 && !showHero

  return (
    <>
      <div className="min-w-0">
        <TopBar
          title="Reviews"
          subtitle="Tu trayectoria, semana a semana"
          actions={[{ label: "Nueva review", icon: <Plus size={14} />, variant: "primary", onClick: goNewWeekly }]}
        />

        <div className="mx-auto max-w-[1320px]">
          {/* Trayectoria — full-width band */}
          <TrajectoryPanel data={overview} isLoading={overviewLoading} />

          {/* Desktop workspace: sticky rail + timeline. Collapses to one column < lg. */}
          <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:items-start">
            <ReviewsRail
              filter={monthFilter}
              onFilterChange={setMonthFilter}
              monthsWithReviews={monthsWithReviews}
              onNewReview={goNewWeekly}
              overview={overview}
              jumpItems={jumpItems}
            />

            <div className="min-w-0">
              {/* Hero + chapters */}
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-[176px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <ReviewsTimeline
                    chapters={chapters}
                    heroSlot={<WeekHero data={currentWeek} weekStart={thisMonday} isLoading={currentWeekLoading} />}
                    showHero={showHero}
                    onOpenWeek={openWeek}
                    onDeleteWeek={setPendingDelete}
                    onOpenEdition={openEdition}
                    accountName={accountName}
                  />

                  {chapters.length === 0 && showHero && reviews.filter(r => r.weekStart !== thisMonday).length === 0 && (
                    <p className="text-center text-[13px] text-[var(--ink-3)] py-8">
                      Aún no hay semanas anteriores. Tu semana en curso está arriba.
                    </p>
                  )}

                  {noContent && (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                      <p className="text-[13px] text-[var(--ink-3)]">Sin reviews para este filtro.</p>
                      <Button variant="subtle" onClick={() => setMonthFilter(null)}>Quitar filtro</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => { if (!v) setPendingDelete(null) }}
        title="Eliminar review semanal"
        description={pendingDelete ? `Se eliminará la review de “${pendingDelete.weekLabel}”. Esta acción no se puede deshacer.` : ""}
        loading={deleteWeekly.isPending}
        onConfirm={() => { if (pendingDelete) deleteWeekly.mutate(pendingDelete.id) }}
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

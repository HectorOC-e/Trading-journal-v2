"use client"
import { ReviewContinuity } from "../../components/report/review-continuity"

import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { ReviewReportShell } from "../../components/report/review-report-shell"
import { AiAnalysisCard } from "../../components/report/ai-analysis-card"
import { ReviewActions, ReviewNotes } from "../../components/report/review-lifecycle"
import { LearningSummary } from "../../components/report/learning-summary"
import { weeklyToVM } from "../../components/report/view-model"
import { OperationalModeSelector } from "@/components/ui/operational-mode-selector"
import { useOperationalMode } from "@/lib/operational-mode-store"

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function WeeklyReportPage() {
  const mode = useOperationalMode(s => s.mode)
  const params = useParams<{ weekStart: string }>()
  const weekStart = params.weekStart ?? ""
  const valid = VALID_DATE.test(weekStart)

  const { data: r, isLoading } = trpc.weeklyReviews.report.useQuery(
    { weekStart, mode },
    { enabled: valid },
  )

  if (!valid) return <div className="p-8 text-sm text-[var(--ink-3)]">Semana inválida.</div>
  if (isLoading || !r || r.scope?.mode !== mode) return <><OperationalModeSelector /><div className="p-8 text-sm text-[var(--ink-3)]">Cargando reporte…</div></>

  const vm = weeklyToVM(r)
  return (
    <>
    <div className="mb-4 print:hidden"><OperationalModeSelector /></div>
    <ReviewReportShell
      vm={vm}
      excludedCurrencies={r.scope.excludedCurrencies}
      aiSlot={<AiAnalysisCard key={`${weekStart}:${mode}`} period={{ kind: "weekly", weekStart }} initial={vm.ai} />}
      actions={<ReviewActions key={`${weekStart}:${mode}`} period={{ kind: "weekly", weekStart }} initialStatus={vm.status} />}
      notesSlot={<><ReviewNotes period={{ kind: "weekly", weekStart }} initialNotes={vm.notes} userId={r.userId} /><div className="mt-5"><ReviewContinuity key={`${weekStart}:${mode}`} weekStart={weekStart} initialConclusion={vm.notes} /></div></>}
      learningSlot={<LearningSummary weekStart={weekStart} />}
    />
    </>
  )
}

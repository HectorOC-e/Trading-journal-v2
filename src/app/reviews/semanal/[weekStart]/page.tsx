"use client"

import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { ReviewReportShell } from "../../components/report/review-report-shell"
import { AiAnalysisCard } from "../../components/report/ai-analysis-card"
import { weeklyToVM } from "../../components/report/view-model"

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function WeeklyReportPage() {
  const params = useParams<{ weekStart: string }>()
  const weekStart = params.weekStart ?? ""
  const valid = VALID_DATE.test(weekStart)

  const { data: r, isLoading } = trpc.weeklyReviews.report.useQuery(
    { weekStart },
    { enabled: valid },
  )

  if (!valid) return <div className="p-8 text-sm text-[var(--ink-3)]">Semana inválida.</div>
  if (isLoading || !r) return <div className="p-8 text-sm text-[var(--ink-3)]">Cargando reporte…</div>

  const vm = weeklyToVM(r)
  return (
    <ReviewReportShell
      vm={vm}
      aiSlot={<AiAnalysisCard period={{ kind: "weekly", weekStart }} initial={vm.ai} />}
    />
  )
}

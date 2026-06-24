"use client"

import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { ReviewReportShell } from "../../components/report/review-report-shell"
import { AiAnalysisCard } from "../../components/report/ai-analysis-card"
import { ReviewActions, ReviewNotes } from "../../components/report/review-lifecycle"
import { MonthlyLetter } from "../../components/report/monthly-letter"
import { monthlyToVM } from "../../components/report/view-model"

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export default function MonthlyReportPage() {
  const params = useParams<{ yearMonth: string }>()
  const [yStr, mStr] = (params.yearMonth ?? "").split("-")
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  const valid = !isNaN(year) && month >= 1 && month <= 12

  const { data: r, isLoading } = trpc.monthlyReviews.report.useQuery(
    { year, month },
    { enabled: valid },
  )

  if (!valid) return <div className="p-8 text-sm text-[var(--ink-3)]">Mes inválido.</div>
  if (isLoading || !r) return <div className="p-8 text-sm text-[var(--ink-3)]">Cargando reporte…</div>

  const vm = monthlyToVM(r)
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`
  return (
    <ReviewReportShell
      vm={vm}
      letterSlot={<MonthlyLetter data={r} year={year} month={month} monthLabel={monthLabel} />}
      aiSlot={<AiAnalysisCard period={{ kind: "monthly", year, month }} initial={vm.ai} />}
      actions={<ReviewActions period={{ kind: "monthly", year, month }} initialStatus={vm.status} />}
      notesSlot={<ReviewNotes period={{ kind: "monthly", year, month }} initialNotes={vm.notes} />}
    />
  )
}

"use client"

import { useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { Markdown } from "@/components/ui/markdown"
import { InsightCards } from "@/components/ui/insight-cards"
import { Card, Eyebrow } from "./primitives"
import type { AiMeta } from "./view-model"
import { useOperationalMode } from "@/lib/operational-mode-store"
import { MODE_LABELS, type OperationalMode } from "@/domains/trading/operational-mode"

type Period =
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }

/** AI-generated analysis of the report. Generates on demand, persisted server-side. */
export function AiAnalysisCard({ period, initial }: { period: Period; initial: AiMeta }) {
  const mode = useOperationalMode(s => s.mode)
  const key = `${period.kind === "weekly" ? period.weekStart : `${period.year}-${period.month}`}:${mode}`
  return <ScopedAnalysis key={key} period={period} initial={initial} mode={mode} />
}

function ScopedAnalysis({ period, initial, mode }: { period: Period; initial: AiMeta; mode: OperationalMode }) {
  const utils = trpc.useUtils()
  const [analysis, setAnalysis] = useState<string | null>(initial.analysis)
  const [at, setAt] = useState<string | null>(initial.at)

  const onSuccess = (res: { analysis: string; at: string }) => {
    setAnalysis(res.analysis)
    setAt(res.at)
    if (period.kind === "weekly") utils.weeklyReviews.report.invalidate({ weekStart: period.weekStart, mode })
    else utils.monthlyReviews.report.invalidate({ year: period.year, month: period.month, mode })
    toast.success(`Análisis de ${MODE_LABELS[mode]} generado`)
  }
  const onError = (e: unknown) => toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))

  const weeklyMut  = trpc.weeklyReviews.generateAnalysis.useMutation({ onSuccess, onError })
  const monthlyMut = trpc.monthlyReviews.generateAnalysis.useMutation({ onSuccess, onError })
  const pending = weeklyMut.isPending || monthlyMut.isPending

  // Deterministic insight cards (same engine as /analytics), scoped to this period.
  const weeklyInsights  = trpc.weeklyReviews.insights.useQuery(
    period.kind === "weekly" ? { weekStart: period.weekStart, mode } : { weekStart: "", mode },
    { enabled: period.kind === "weekly", staleTime: 60_000 },
  )
  const monthlyInsights = trpc.monthlyReviews.insights.useQuery(
    period.kind === "monthly" ? { year: period.year, month: period.month, mode } : { year: 0, month: 1, mode },
    { enabled: period.kind === "monthly", staleTime: 60_000 },
  )
  const insights = (period.kind === "weekly" ? weeklyInsights.data : monthlyInsights.data) ?? []

  const generate = () => {
    if (period.kind === "weekly") weeklyMut.mutate({ weekStart: period.weekStart, mode })
    else monthlyMut.mutate({ year: period.year, month: period.month, mode })
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>Análisis IA</Eyebrow>
        <button
          onClick={generate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] disabled:opacity-60 print:hidden"
        >
          {analysis ? <RefreshCw size={12} className={pending ? "animate-spin" : ""} /> : <Sparkles size={12} />}
          {pending ? "Generando…" : analysis ? "Regenerar" : "Generar análisis"}
        </button>
      </div>

      {insights.length > 0 && (
        <div className="mb-3">
          <InsightCards insights={insights} />
        </div>
      )}

      {analysis ? (
        <>
          <Markdown content={analysis} className="text-sm" />
          {at && <p className="text-[10px] text-[var(--ink-3)] mt-2">Generado {new Date(at).toLocaleString("es")}</p>}
        </>
      ) : (
        <p className="text-sm text-[var(--ink-3)]">
          {pending ? "Analizando tu desempeño…" : "Genera un análisis del periodo con tu proveedor de IA configurado."}
        </p>
      )}
    </Card>
  )
}

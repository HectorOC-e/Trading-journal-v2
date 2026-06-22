"use client"

import { useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { Markdown } from "@/components/ui/markdown"
import { Card, Eyebrow } from "./primitives"
import type { AiMeta } from "./view-model"

type Period =
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }

/** AI-generated analysis of the report. Generates on demand, persisted server-side. */
export function AiAnalysisCard({ period, initial }: { period: Period; initial: AiMeta }) {
  const utils = trpc.useUtils()
  const [analysis, setAnalysis] = useState<string | null>(initial.analysis)
  const [at, setAt] = useState<string | null>(initial.at)

  const onSuccess = (res: { analysis: string; at: string }) => {
    setAnalysis(res.analysis)
    setAt(res.at)
    if (period.kind === "weekly") utils.weeklyReviews.report.invalidate({ weekStart: period.weekStart })
    else utils.monthlyReviews.report.invalidate({ year: period.year, month: period.month })
    toast.success("Análisis generado")
  }
  const onError = (e: unknown) => toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))

  const weeklyMut  = trpc.weeklyReviews.generateAnalysis.useMutation({ onSuccess, onError })
  const monthlyMut = trpc.monthlyReviews.generateAnalysis.useMutation({ onSuccess, onError })
  const pending = weeklyMut.isPending || monthlyMut.isPending

  const generate = () => {
    if (period.kind === "weekly") weeklyMut.mutate({ weekStart: period.weekStart })
    else monthlyMut.mutate({ year: period.year, month: period.month })
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

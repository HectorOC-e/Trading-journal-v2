"use client"

import { AlertTriangle, Sparkles } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { askCoach } from "@/lib/coach-bus"

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 })

/** Errors → study cards (#42, MEJORAR) — recurring mistakes turned into prioritized
 *  lessons by real cost (R). Each card offers a coach action to turn it into a
 *  rule/commitment (DS §12: every item ends in an action). Read-only data. */
export function ErrorCardsPanel() {
  const { data, isLoading } = trpc.learningInsights.errorCards.useQuery(undefined, { staleTime: 60_000 })

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={13} style={{ color: "var(--be)" }} />
        <p className="text-[13px] font-semibold text-[var(--ink)]">Errores recurrentes → lecciones</p>
        <span className="ml-auto text-[10px] text-[var(--ink-3)]">ordenados por coste</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.slice(0, 6).map((c) => (
          <div key={c.errorTag} className="rounded-[var(--radius-sm)] p-3 border border-[var(--line)] flex flex-col gap-1.5" style={{ background: "var(--panel-2)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--ink)]">{c.errorTag}</span>
              <span className="num text-[12px] font-bold" style={{ color: "var(--loss)" }}>{fmt(c.costR)}R</span>
            </div>
            <p className="text-[11px] text-[var(--ink-3)] leading-snug">
              {c.occurrences} trades · {c.costPnl < 0 ? "−" : ""}${fmt(Math.abs(c.costPnl))}
            </p>
            <button
              onClick={() => askCoach(`El error "${c.errorTag}" se repite (${c.occurrences} trades, ${fmt(c.costR)}R). ¿Qué regla o compromiso me protege de él?`)}
              className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent)] hover:underline self-start"
            >
              <Sparkles size={11} /> Convertir en regla
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { ArrowRight, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

const fmt = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}R`)

const LABEL: Record<string, { text: string; color: string; Icon: React.ComponentType<{ size?: number | string }> }> = {
  "associated-improvement": { text: "Mejora asociada", color: "var(--win)", Icon: TrendingUp },
  "associated-decline": { text: "Deterioro asociado", color: "var(--loss)", Icon: TrendingDown },
  "no-association": { text: "Sin asociación clara", color: "var(--ink-3)", Icon: Minus },
  "insufficient": { text: "Muestra insuficiente", color: "var(--ink-3)", Icon: Minus },
}

/** Learning transfer (#31, closure A2) — edge before vs after studying this resource,
 *  over its linked setups. Honest association (never "cause", FREEZE-D17) + the SRS
 *  cadence nudge from the linked-setup edge (#45). */
export function ResourceTransferPanel({ resourceId }: { resourceId: string }) {
  const { data, isLoading } = trpc.learningInsights.transfer.useQuery({ resourceId }, { staleTime: 60_000 })

  if (isLoading || !data) return null
  const t = data.transfer
  const meta = LABEL[t.label] ?? LABEL["no-association"]

  return (
    <div>
      <p className="text-eyebrow mb-2">Transferencia al trading</p>
      <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3 flex flex-col gap-2">
        {t.label === "insufficient" ? (
          <p className="text-[11.5px] text-[var(--ink-3)] leading-snug">
            Vincula setups y registra trades antes/después para medir si estudiar esto movió tu edge.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: meta.color }}>
                <meta.Icon size={14} /> {meta.text}
              </span>
              <span className="num text-[12px] font-bold text-[var(--ink)]">
                {fmt(t.beforeAvgR)} <ArrowRight size={11} className="inline mx-0.5 text-[var(--ink-3)]" /> {fmt(t.afterAvgR)}
              </span>
            </div>
            <p className="text-[10.5px] num text-[var(--ink-3)]">antes n={t.nBefore} · después n={t.nAfter}{t.significant ? " · significativo" : ""}</p>
            <p className="text-[10px] text-[var(--ink-3)] leading-snug italic">{t.caveat}</p>
          </>
        )}
        {data.reviewSooner && (
          <div className="flex items-start gap-1.5 mt-0.5 rounded-[var(--radius-xs)] px-2 py-1.5" style={{ background: "var(--be-soft)", color: "var(--be)" }}>
            <Clock size={12} className="mt-0.5 shrink-0" />
            <p className="text-[10.5px] leading-snug">El edge del setup vinculado está decayendo — conviene repasar este material antes (el SRS ya lo adelanta).</p>
          </div>
        )}
      </div>
    </div>
  )
}

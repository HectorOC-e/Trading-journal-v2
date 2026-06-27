"use client"

import { Gauge } from "lucide-react"
import type { RiskBudget as Budget } from "@/domains/analytics/risk/risk-budget"

const pct = (f: number) => `${(f * 100).toFixed(1)}%`

/** Daily risk budget meter (#17, DS §11) — how much loss room is left today and
 *  how many usual-sized trades still fit. safe/warning/exceeded by token, with
 *  icon+text so color is never the only signal. Warn-level in S12 (hard block S13). */
export function RiskBudgetMeter({ budget }: { budget: Budget }) {
  if (!budget.hasLimit || budget.remainingPct == null || budget.usedPct == null) {
    return (
      <p className="text-[11px] text-[var(--ink-3)]">
        Sin límite de pérdida diaria configurado para esta cuenta.
      </p>
    )
  }

  const used = Math.min(1, Math.max(0, budget.usedPct))
  const level = budget.exhausted ? "exceeded" : used >= 0.8 ? "warning" : "safe"
  const color = level === "exceeded" ? "var(--loss)" : level === "warning" ? "var(--be)" : "var(--win)"
  const bg = level === "exceeded" ? "var(--loss-soft)" : level === "warning" ? "var(--be-soft)" : "var(--win-soft)"
  const label = level === "exceeded" ? "Límite diario alcanzado" : level === "warning" ? "Margen diario bajo" : "Margen diario disponible"

  return (
    <div className="rounded-[var(--radius-sm)] p-3 border border-[var(--line)]" style={{ background: "var(--panel-2)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color }}>
          <Gauge size={13} /> {label}
        </span>
        <span className="num text-[11px] font-bold" style={{ color }}>
          {budget.exhausted ? "0 trades" : `${budget.maxTrades} trades`}
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: pct(used), background: color }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[var(--ink-3)]">
        <span>{pct(used)} del presupuesto usado</span>
        <span className="num" style={{ color: budget.remainingPct > 0 ? "var(--ink-2)" : "var(--loss)" }}>
          {pct(Math.max(0, budget.remainingPct))} de margen al floor
        </span>
      </div>
      {budget.exhausted && (
        <p className="mt-2 text-[10.5px] leading-snug px-2 py-1.5 rounded-[var(--radius-xs)]" style={{ background: bg, color }}>
          Has agotado tu presupuesto de riesgo del día. Operar más acerca el bloqueo por pérdida diaria.
        </p>
      )}
    </div>
  )
}

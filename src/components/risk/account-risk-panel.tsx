"use client"

import { Activity, Target, ShieldAlert } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { RiskBudgetMeter } from "./risk-budget-meter"

const asPct = (f: number) => `${(f * 100).toFixed(1)}%`

const BOTTLENECK: Record<string, string> = {
  DAILY_DD: "límite diario",
  TOTAL_DD: "drawdown total",
  TIMEOUT: "ritmo/tiempo",
  NONE: "—",
}

/** PROTEGER surface (S9) — per-account quant risk: daily budget, risk of ruin
 *  (Monte Carlo band), phase-pass projection. All in bands (FREEZE-D16); read-
 *  only signal (the hard block is S13). */
export function AccountRiskPanel({ accountId }: { accountId: string }) {
  const { data, isLoading } = trpc.risk.overview.useQuery({ accountId }, { staleTime: 30_000 })

  if (isLoading) {
    return <div className="h-24 rounded-[var(--radius-sm)] animate-pulse" style={{ background: "var(--panel-2)" }} />
  }
  if (!data) return null

  const ruin = data.riskOfRuin
  const proj = data.projection
  const ruinLevel = ruin == null ? null : ruin.monteCarlo.value < 0.05 ? "low" : ruin.monteCarlo.value < 0.2 ? "moderate" : "high"
  const ruinColor = ruinLevel === "high" ? "var(--loss)" : ruinLevel === "moderate" ? "var(--be)" : "var(--win)"

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <ShieldAlert size={12} style={{ color: "var(--intervene)" }} />
        <p className="text-eyebrow">Riesgo cuantitativo</p>
        <span className="ml-auto text-[9px] text-[var(--ink-3)]">señal · no bloquea</span>
      </div>

      <div className="flex flex-col gap-3">
        <RiskBudgetMeter budget={data.budget} />

        {ruin && (
          <div className="rounded-[var(--radius-sm)] p-3 border border-[var(--line)]" style={{ background: "var(--panel-2)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-2)]">
                <Activity size={13} /> Riesgo de ruina
              </span>
              <span className="num text-[14px] font-bold" style={{ color: ruinColor }}>{asPct(ruin.monteCarlo.value)}</span>
            </div>
            <p className="text-[10px] text-[var(--ink-3)] mt-1 num">
              banda {asPct(ruin.monteCarlo.ciLow)}–{asPct(ruin.monteCarlo.ciHigh)} · analítica {asPct(ruin.analytic)} · n={ruin.sampleSize}
            </p>
            <p className="text-[10.5px] text-[var(--ink-3)] mt-1.5 leading-snug">
              P(tocar el DD total) en el horizonte de fase, sobre tu distribución de R real.
            </p>
          </div>
        )}

        {proj && (
          <div className="rounded-[var(--radius-sm)] p-3 border border-[var(--line)]" style={{ background: "var(--panel-2)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-2)]">
                <Target size={13} /> Proyección de fase
              </span>
              <span className="num text-[14px] font-bold" style={{ color: proj.passProbability.value >= 0.5 ? "var(--win)" : "var(--loss)" }}>
                {asPct(proj.passProbability.value)}
              </span>
            </div>
            <p className="text-[10px] text-[var(--ink-3)] mt-1 num">
              P(pasar) banda {asPct(proj.passProbability.ciLow)}–{asPct(proj.passProbability.ciHigh)}
              {proj.expectedSessions && ` · ~${proj.expectedSessions.value.toFixed(0)} sesiones`}
            </p>
            <div className="flex items-center justify-between mt-1.5 text-[10.5px]">
              <span className="text-[var(--ink-3)]">P(violar DD primero) <span className="num" style={{ color: "var(--loss)" }}>{asPct(proj.violateDdFirstProbability.value)}</span></span>
              {proj.bottleneck !== "NONE" && (
                <span className="text-[var(--ink-3)]">cuello: <span className="font-semibold text-[var(--ink-2)]">{BOTTLENECK[proj.bottleneck]}</span></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

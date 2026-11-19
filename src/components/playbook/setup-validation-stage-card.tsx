"use client"

import { CheckCircle2, CircleAlert, CircleDashed, ImageIcon } from "lucide-react"
import type { StageEvidence } from "@/domains/analytics/setups/validation"
import type { PracticeValidationContext } from "@/server/services/setups/validation-service"
import { cn } from "@/lib/utils"

type Evidence = StageEvidence & { practiceContext?: PracticeValidationContext }

const CRITERIA: Record<string, string> = {
  market: "Mercado definido",
  direction: "Dirección definida",
  description: "Hipótesis descrita",
  expectancy: "Expectativa positiva",
  checklist: "Checklist definido",
  closedCount: "Tamaño de muestra",
  rCoverage: "Cobertura de R",
  checklistCoverage: "Checklist evaluado",
  checklistCompliance: "Disciplina de checklist",
  distinctWeeks: "Semanas con actividad",
}

const fmt = (value: number | null, suffix = "") => value == null ? "—" : `${value.toLocaleString("es-HN", { maximumFractionDigits: 2 })}${suffix}`

function criterionLabel(stage: StageEvidence["stage"], key: string) {
  if (stage === "HYPOTHESIS" && key === "expectancy") return "Expectativa definida"
  return CRITERIA[key] ?? key
}

export function SetupValidationStageCard({ evidence, status }: { evidence: Evidence; status: string }) {
  const practices = evidence.practiceContext
  const warningText = evidence.warnings.includes("EDGE_DECAY") && evidence.warnings.includes("DEFINITION_DRIFT")
    ? "El edge muestra deterioro y la ejecución se alejó de la definición."
    : evidence.warnings.includes("EDGE_DECAY")
      ? "El edge muestra deterioro."
      : "La ejecución se alejó de la definición."
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--panel-2)] p-4" aria-label={`Evidencia ${evidence.stage}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-eyebrow">Evidencia de la etapa</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{status}</p>
        </div>
        {evidence.mode && <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)]">{evidence.mode === "BACKTEST" ? "Backtesting" : evidence.mode === "DEMO" ? "Demo" : "Real"}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Muestra" value={`${evidence.closedCount} operaciones`} />
        <Metric label="Expectativa" value={fmt(evidence.expectancyR, "R")} />
        <Metric label="Drawdown máx." value={fmt(evidence.maxDrawdownR, "R")} />
        <Metric label="Disciplina" value={fmt(evidence.checklistCompliancePct, "%")} />
        <Metric label="R válido" value={fmt(evidence.rCoveragePct, "%")} />
        <Metric label="Promedio" value={fmt(evidence.averageR, "R")} />
        <Metric label="Semanas" value={String(evidence.distinctWeeks)} />
        <Metric label="R acumulado" value={fmt(evidence.cumulativeR, "R")} />
      </div>

      {practices && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--ink-3)]">
          <span>{practices.executedPractices} prácticas de ejecución</span>
          <span aria-hidden="true">·</span>
          <span>{practices.reviewPractices} revisiones</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1"><ImageIcon size={11} />{practices.captures} capturas</span>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        <p className="text-eyebrow">Criterios</p>
        {evidence.criteria.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--panel)] px-3 py-2 text-[11px]">
            <span className="flex items-center gap-2 text-[var(--ink-2)]">
              {item.met ? <CheckCircle2 size={13} className="text-[var(--win)]" /> : <CircleDashed size={13} className="text-[var(--ink-3)]" />}
              {criterionLabel(evidence.stage, item.key)}
            </span>
            <span className={cn("font-mono", item.met ? "text-[var(--win)]" : "text-[var(--ink-3)]")}>{item.actual ?? "—"} / {item.target}</span>
          </div>
        ))}
      </div>

      {evidence.warnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--loss-soft)] px-3 py-2 text-[11px] text-[var(--loss)]">
          <CircleAlert size={13} className="mt-0.5 shrink-0" />
          <span>{warningText}</span>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--panel)] p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-1 font-mono text-[12px] font-semibold text-[var(--ink)]">{value}</p>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, BookOpenCheck, Settings2, Sparkles } from "lucide-react"
import { SetupValidationDecisionDialog, type ValidationDecisionDraft } from "./setup-validation-decision-dialog"
import { SetupValidationStageCard } from "./setup-validation-stage-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { StageEvidence, ValidationAction, ValidationPolicy, ValidationStage } from "@/domains/analytics/setups/validation"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

type EvidenceView = StageEvidence & {
  signature: string
  practiceContext?: { executedPractices: number; reviewPractices: number; captures: number }
}

type Overview = {
  policy: ValidationPolicy
  hypothesis: StageEvidence & { signature: string }
  stages: Record<"BACKTEST" | "DEMO" | "REAL", EvidenceView>
  comparison: Array<{
    mode: "BACKTEST" | "DEMO" | "REAL"
    closedCount: number
    expectancyR: number | null
    averageR: number | null
    maxDrawdownR: number | null
    checklistCompliancePct: number | null
  }>
  state: { currentStage: ValidationStage; suspended: boolean }
  history: Array<{
    id: string
    action: ValidationAction
    fromStage: ValidationStage
    toStage: ValidationStage
    note: string
    exceptionReason: string | null
  }>
}

const STAGES: Array<{ value: ValidationStage; label: string }> = [
  { value: "HYPOTHESIS", label: "Hipótesis" },
  { value: "BACKTEST", label: "Backtesting" },
  { value: "DEMO", label: "Demo" },
  { value: "REAL", label: "Real" },
]

const MODE_LABELS = { BACKTEST: "Backtesting", DEMO: "Demo", REAL: "Real" } as const
const STAGE_LABELS: Record<ValidationStage, string> = { HYPOTHESIS: "Hipótesis", BACKTEST: "Backtesting", DEMO: "Demo", REAL: "Real" }
const ACTION_LABELS = {
  PROMOTE: "Promoción",
  KEEP_REVIEWING: "Revisión mantenida",
  SUSPEND: "Suspensión",
  RESUME: "Reanudación",
  RETURN_TO_REVIEW: "Retorno a revisión",
} as const

function practiceTemplate(criterion: string) {
  if (criterion === "closedCount") return "sample"
  if (criterion === "rCoverage") return "r_coverage"
  if (criterion === "checklistCoverage" || criterion === "checklistCompliance" || criterion === "checklist") return "checklist"
  if (criterion === "distinctWeeks") return "weeks"
  if (["market", "direction", "description", "expectancy"].includes(criterion)) return "definition"
  return "review"
}

function statusFor(stage: ValidationStage, overview: Overview) {
  const currentIndex = STAGES.findIndex((item) => item.value === overview.state.currentStage)
  const stageIndex = STAGES.findIndex((item) => item.value === stage)
  if (stage === overview.state.currentStage && overview.state.suspended) return "Suspendida"
  if (stageIndex < currentIndex) return "Promovida"
  if (stageIndex > currentIndex) return "Pendiente"
  if (stage === "REAL") return "Monitoreo continuo"
  const evidence = stage === "HYPOTHESIS" ? overview.hypothesis : overview.stages[stage]
  return evidence.verdict === "ELIGIBLE" ? "Elegible para avanzar" : "En evaluación"
}

function evidenceStatusFor(stage: ValidationStage, overview: Overview) {
  if (stage === overview.state.currentStage && overview.state.suspended) return "Suspendida"
  if (stage === "REAL") return "Monitoreo continuo"
  const evidence = stage === "HYPOTHESIS" ? overview.hypothesis : overview.stages[stage]
  return evidence.verdict === "ELIGIBLE" ? "Elegible para avanzar" : "En evaluación"
}

function fmt(value: number | null, suffix = "") {
  return value == null ? "—" : `${value.toLocaleString("es-HN", { maximumFractionDigits: 2 })}${suffix}`
}

export function SetupValidationRoute({ setupId, setupName }: { setupId: string; setupName: string }) {
  const utils = trpc.useUtils()
  const overviewQuery = trpc.playbook.validationOverview.useQuery({ setupId }, { staleTime: 30_000 })
  const overview = overviewQuery.data as Overview | undefined
  const [stageSelection, setStageSelection] = useState<{ setupId: string; stage: ValidationStage } | null>(null)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [explanation, setExplanation] = useState<{ stage: ValidationStage; text: string } | null>(null)
  const synchronizedSignatures = useRef(new Set<string>())

  const refresh = async () => {
    await Promise.all([
      utils.playbook.validationOverview.invalidate({ setupId }),
      utils.playbook.validationHistory.invalidate({ setupId }),
    ])
  }
  const decision = trpc.playbook.createValidationDecision.useMutation({
    onSuccess: async () => {
      setDecisionOpen(false)
      setStageSelection(null)
      await refresh()
    },
  })
  const updatePolicy = trpc.playbook.updateValidationPolicy.useMutation({
    onSuccess: async () => {
      setPolicyOpen(false)
      await refresh()
    },
  })
  const syncNotifications = trpc.playbook.syncValidationNotifications.useMutation()
  const explain = trpc.playbook.validationExplanation.useMutation({
    onSuccess: (result) => setExplanation({ stage: result.stage, text: result.text }),
  })
  const currentStageForSync = overview?.state.currentStage
  const currentSignature = currentStageForSync === "HYPOTHESIS"
    ? overview?.hypothesis.signature
    : currentStageForSync
      ? overview?.stages[currentStageForSync].signature
      : undefined
  useEffect(() => {
    if (!currentSignature) return
    const key = `${setupId}:${currentSignature}`
    if (synchronizedSignatures.current.has(key)) return
    synchronizedSignatures.current.add(key)
    syncNotifications.mutate({ setupId, evidenceSignature: currentSignature })
  }, [currentSignature, setupId, syncNotifications])

  if (overviewQuery.isLoading) {
    return <div role="status" className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--panel-2)] p-4 text-xs text-[var(--ink-3)]">Cargando ruta de validación…</div>
  }
  if (overviewQuery.isError || !overview) {
    return (
      <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--loss)]/30 bg-[var(--loss-soft)] p-4 text-xs text-[var(--loss)]">
        <p>No se pudo cargar la ruta de validación.</p>
        <Button type="button" size="xs" className="mt-3" onClick={() => void overviewQuery.refetch()}>Reintentar</Button>
      </div>
    )
  }

  const selectedStage = stageSelection?.setupId === setupId ? stageSelection.stage : overview.state.currentStage
  const evidence = selectedStage === "HYPOTHESIS" ? overview.hypothesis : overview.stages[selectedStage]
  const currentEvidence = overview.state.currentStage === "HYPOTHESIS"
    ? overview.hypothesis
    : overview.stages[overview.state.currentStage]
  const missingCriterion = evidence.criteria.find((criterion) => !criterion.met)
  const practiceHref = missingCriterion ? (() => {
    const params = new URLSearchParams({
      tab: "practicas",
      register: "1",
      validationSetup: setupId,
      validationStage: selectedStage,
      validationTemplate: practiceTemplate(missingCriterion.key),
    })
    if (selectedStage !== "HYPOTHESIS") params.set("mode", selectedStage)
    return `/aprendizaje?${params.toString()}`
  })() : null

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--panel)] p-4" aria-labelledby={`validation-route-${setupId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow">Validación de estrategia</p>
          <h3 id={`validation-route-${setupId}`} className="mt-1 text-sm font-semibold text-[var(--ink)]">Hipótesis → Backtesting → Demo → Real</h3>
          <p className="mt-1 text-[11px] text-[var(--ink-3)]">Cada modalidad conserva su propia evidencia; nunca se suman sus resultados.</p>
        </div>
        <Button type="button" size="xs" onClick={() => setPolicyOpen(true)}><Settings2 size={12} />Criterios</Button>
      </div>

      <div role="tablist" aria-label="Ruta de validación" className="mt-4 grid grid-cols-2 gap-1 rounded-[var(--radius-sm)] bg-[var(--panel-2)] p-1 sm:grid-cols-4">
        {STAGES.map((stage, index) => {
          const selected = selectedStage === stage.value
          const status = statusFor(stage.value, overview)
          return (
            <button
              key={stage.value}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`validation-panel-${setupId}`}
              onClick={() => setStageSelection({ setupId, stage: stage.value })}
              className={cn(
                "rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                selected ? "bg-[var(--panel)] shadow-[var(--shadow-xs)]" : "hover:bg-[var(--chip)]",
              )}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink)]">
                <span className="font-mono text-[9px] text-[var(--ink-3)]">0{index + 1}</span>{stage.label}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-[var(--ink-3)]">{status}</span>
            </button>
          )
        })}
      </div>

      <div id={`validation-panel-${setupId}`} role="tabpanel" className="mt-3">
        <SetupValidationStageCard evidence={evidence} status={evidenceStatusFor(selectedStage, overview)} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {practiceHref ? (
            <a
              href={practiceHref}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <BookOpenCheck size={13} />Crear práctica
            </a>
          ) : null}
          <Button
            type="button"
            size="sm"
            loading={explain.isPending}
            onClick={() => explain.mutate({ setupId, stage: selectedStage })}
          >
            <Sparkles size={13} />Explicar con IA
          </Button>
        </div>
        {explain.error ? <p role="alert" className="mt-2 text-xs text-[var(--loss)]">{explain.error.message}</p> : null}
        {explanation?.stage === selectedStage ? (
          <div className="mt-2 rounded-[var(--radius-sm)] border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Explicación orientativa</p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--ink-2)]">{explanation.text}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table aria-label="Comparación por modalidad" className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[11px]">
          <thead>
            <tr className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Modalidad</th>
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Operaciones</th>
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Expectativa</th>
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Promedio</th>
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Drawdown</th>
              <th className="border-b border-[var(--line)] px-2 py-2 font-semibold">Disciplina</th>
            </tr>
          </thead>
          <tbody>
            {overview.comparison.map((row) => (
              <tr key={row.mode} className="text-[var(--ink-2)]">
                <th className="border-b border-[var(--line)]/70 px-2 py-2.5 font-semibold text-[var(--ink)]">{MODE_LABELS[row.mode]}</th>
                <td className="border-b border-[var(--line)]/70 px-2 py-2.5 font-mono">{row.closedCount}</td>
                <td className="border-b border-[var(--line)]/70 px-2 py-2.5 font-mono">{fmt(row.expectancyR, "R")}</td>
                <td className="border-b border-[var(--line)]/70 px-2 py-2.5 font-mono">{fmt(row.averageR, "R")}</td>
                <td className="border-b border-[var(--line)]/70 px-2 py-2.5 font-mono">{fmt(row.maxDrawdownR, "R")}</td>
                <td className="border-b border-[var(--line)]/70 px-2 py-2.5 font-mono">{fmt(row.checklistCompliancePct, "%")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {overview.history.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-eyebrow">Historial de decisiones</h4>
          <ol className="mt-2 space-y-1.5">
            {[...overview.history].reverse().map((entry) => (
              <li key={entry.id} className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[var(--ink)]">
                    {STAGE_LABELS[entry.fromStage]} → {STAGE_LABELS[entry.toStage]}
                  </p>
                  <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-3)]">{ACTION_LABELS[entry.action]}</span>
                </div>
                {entry.note ? <p className="mt-1 text-[10px] text-[var(--ink-2)]">{entry.note}</p> : null}
                {entry.exceptionReason ? <p className="mt-1 text-[10px] text-[var(--be)]">Excepción: {entry.exceptionReason}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-[var(--ink-3)]">
          {overview.state.currentStage === "REAL" ? "Real permanece en monitoreo continuo." : "El avance siempre requiere una decisión explícita."}
        </p>
        <Button type="button" variant="primary" size="sm" onClick={() => setDecisionOpen(true)}>
          Revisar avance <ArrowRight size={13} />
        </Button>
      </div>

      {decisionOpen ? (
        <SetupValidationDecisionDialog
          open
          onOpenChange={setDecisionOpen}
          setupId={setupId}
          setupName={setupName}
          currentStage={overview.state.currentStage}
          verdict={currentEvidence.verdict}
          policyVersion={overview.policy.version}
          suspended={overview.state.suspended}
          pending={decision.isPending}
          error={decision.error?.message}
          onSubmit={(draft: ValidationDecisionDraft) => decision.mutate(draft)}
        />
      ) : null}
      {policyOpen ? (
        <ValidationPolicyDialog
          open
          onOpenChange={setPolicyOpen}
          setupId={setupId}
          policy={overview.policy}
          pending={updatePolicy.isPending}
          error={updatePolicy.error?.message}
          onSubmit={(input) => updatePolicy.mutate(input)}
        />
      ) : null}
    </section>
  )
}

type EditablePolicy = Omit<ValidationPolicy, "version">

function ValidationPolicyDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  setupId: string
  policy: ValidationPolicy
  pending: boolean
  error?: string | null
  onSubmit: (input: EditablePolicy & { setupId: string; expectedVersion: number }) => void
}) {
  const [form, setForm] = useState<EditablePolicy>(() => ({
    backtestMinClosed: props.policy.backtestMinClosed,
    backtestMinRCoveragePct: props.policy.backtestMinRCoveragePct,
    backtestMinChecklistCoveragePct: props.policy.backtestMinChecklistCoveragePct,
    backtestRequirePositiveExpectancy: props.policy.backtestRequirePositiveExpectancy,
    demoMinClosed: props.policy.demoMinClosed,
    demoMinDistinctWeeks: props.policy.demoMinDistinctWeeks,
    demoMinChecklistCompliancePct: props.policy.demoMinChecklistCompliancePct,
    demoRequirePositiveExpectancy: props.policy.demoRequirePositiveExpectancy,
    realMonitorMinClosed: props.policy.realMonitorMinClosed,
    realMonitorMinDistinctWeeks: props.policy.realMonitorMinDistinctWeeks,
  }))

  const numberField = (key: keyof EditablePolicy, label: string, max = 100_000, min = 1) => (
    <label className="text-[11px] font-medium text-[var(--ink-2)]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={String(form[key])}
        onChange={(event) => setForm((current) => ({ ...current, [key]: Number(event.target.value) }))}
        className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 font-mono text-xs text-[var(--ink)]"
      />
    </label>
  )

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[620px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criterios de validación</DialogTitle>
          <DialogDescription>Ajusta los mínimos sin mezclar la evidencia de Backtesting, Demo y Real.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PolicyGroup title="Backtesting">
            {numberField("backtestMinClosed", "Operaciones cerradas")}
            {numberField("backtestMinRCoveragePct", "Cobertura de R (%)", 100, 0)}
            {numberField("backtestMinChecklistCoveragePct", "Checklist evaluado (%)", 100, 0)}
            <BooleanField label="Exigir expectativa positiva" checked={form.backtestRequirePositiveExpectancy} onChange={(checked) => setForm((current) => ({ ...current, backtestRequirePositiveExpectancy: checked }))} />
          </PolicyGroup>
          <PolicyGroup title="Demo">
            {numberField("demoMinClosed", "Operaciones cerradas")}
            {numberField("demoMinDistinctWeeks", "Semanas distintas", 5_200)}
            {numberField("demoMinChecklistCompliancePct", "Disciplina de checklist (%)", 100, 0)}
            <BooleanField label="Exigir expectativa positiva" checked={form.demoRequirePositiveExpectancy} onChange={(checked) => setForm((current) => ({ ...current, demoRequirePositiveExpectancy: checked }))} />
          </PolicyGroup>
          <PolicyGroup title="Real · monitoreo">
            {numberField("realMonitorMinClosed", "Operaciones para revisión")}
            {numberField("realMonitorMinDistinctWeeks", "Semanas para revisión", 5_200)}
          </PolicyGroup>
        </div>
        {props.error && <p role="alert" className="text-xs text-[var(--loss)]">{props.error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button type="button" variant="primary" loading={props.pending} onClick={() => props.onSubmit({ setupId: props.setupId, expectedVersion: props.policy.version, ...form })}>Guardar criterios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PolicyGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3">
      <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function BooleanField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 self-end rounded-[var(--radius-sm)] bg-[var(--panel-2)] px-3 py-2 text-[11px] text-[var(--ink-2)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-[var(--accent)]" />
      {label}
    </label>
  )
}

"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ValidationAction, ValidationStage, ValidationVerdict } from "@/domains/analytics/setups/validation"

const ORDER: ValidationStage[] = ["HYPOTHESIS", "BACKTEST", "DEMO", "REAL"]

export type ValidationDecisionDraft = {
  setupId: string
  idempotencyKey: string
  action: ValidationAction
  targetStage: ValidationStage
  expectedPolicyVersion: number
  expectedCurrentStage: ValidationStage
  note: string
  exceptionReason?: string
}

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return "00000000-0000-4000-8000-000000000001"
}

export function SetupValidationDecisionDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  setupId: string
  setupName: string
  currentStage: ValidationStage
  verdict: ValidationVerdict
  policyVersion: number
  suspended: boolean
  pending: boolean
  error?: string | null
  onSubmit: (draft: ValidationDecisionDraft) => void
}) {
  const defaultAction: ValidationAction = props.suspended ? "RESUME" : props.currentStage === "REAL" ? "KEEP_REVIEWING" : "PROMOTE"
  const [decisionAction, setDecisionAction] = useState<ValidationAction>(defaultAction)
  const [note, setNote] = useState("")
  const [exceptionReason, setExceptionReason] = useState("")

  const targetStage = useMemo<ValidationStage>(() => {
    const current = ORDER.indexOf(props.currentStage)
    if (decisionAction === "PROMOTE") return ORDER[Math.min(current + 1, ORDER.length - 1)]
    if (decisionAction === "RETURN_TO_REVIEW") return ORDER[Math.max(current - 1, 0)]
    return props.currentStage
  }, [decisionAction, props.currentStage])
  const exceptional = decisionAction === "PROMOTE" && props.verdict !== "ELIGIBLE"
  const disabled = props.pending || (exceptional && exceptionReason.trim().length < 10)

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Decisión de validación · {props.setupName}</DialogTitle>
          <DialogDescription>La decisión conserva una fotografía de la evidencia. No mueve ni modifica operaciones.</DialogDescription>
        </DialogHeader>

        <label className="block text-xs font-medium text-[var(--ink-2)]">
          Decisión
          <select
            aria-label="Decisión"
            value={decisionAction}
            onChange={(event) => setDecisionAction(event.target.value as ValidationAction)}
            className="mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            {!props.suspended && props.currentStage !== "REAL" && <option value="PROMOTE">Promover a {targetStage === "BACKTEST" ? "Backtesting" : targetStage === "DEMO" ? "Demo" : "Real"}</option>}
            <option value="KEEP_REVIEWING">Continuar en revisión</option>
            {!props.suspended && <option value="SUSPEND">Suspender estrategia</option>}
            {props.suspended && <option value="RESUME">Reanudar estrategia</option>}
            {!props.suspended && props.currentStage !== "HYPOTHESIS" && <option value="RETURN_TO_REVIEW">Volver a la etapa anterior</option>}
          </select>
        </label>

        {exceptional && (
          <label className="mt-4 block text-xs font-medium text-[var(--ink-2)]">
            Motivo de excepción
            <textarea
              aria-label="Motivo de excepción"
              value={exceptionReason}
              onChange={(event) => setExceptionReason(event.target.value)}
              maxLength={1000}
              className="mt-1.5 min-h-24 w-full resize-y rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)]"
              placeholder="Explica por qué avanzarás con criterios pendientes."
            />
          </label>
        )}

        <label className="mt-4 block text-xs font-medium text-[var(--ink-2)]">
          Nota opcional
          <textarea
            aria-label="Nota opcional"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            className="mt-1.5 min-h-20 w-full resize-y rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)]"
          />
        </label>

        {props.error && <p role="alert" className="mt-3 text-xs text-[var(--loss)]">{props.error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            variant="primary"
            loading={props.pending}
            disabled={disabled}
            onClick={() => props.onSubmit({
              setupId: props.setupId,
              idempotencyKey: requestId(),
              action: decisionAction,
              targetStage,
              expectedPolicyVersion: props.policyVersion,
              expectedCurrentStage: props.currentStage,
              note: note.trim(),
              ...(exceptional ? { exceptionReason: exceptionReason.trim() } : {}),
            })}
          >Confirmar decisión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

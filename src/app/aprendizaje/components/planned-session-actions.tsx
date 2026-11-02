"use client"

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from '@/lib/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PlanSessionModal, type EditablePlan } from './plan-session-modal'

export function PlannedSessionActions({ plan }: { plan: EditablePlan }) {
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const utils = trpc.useUtils()
  const done = trpc.studySessions.completePlanned.useMutation({
    onSuccess: () => { void utils.studySessions.invalidate(); void utils.learningResources.invalidate(); toast.success('Sesión planificada completada') },
    onError: error => toast.error(error.message || 'No se pudo completar'),
  })
  const cancel = trpc.studySessions.cancelPlanned.useMutation({
    onSuccess: () => { setCancelling(false); void utils.studySessions.invalidate(); toast.success('Plan cancelado') },
    onError: error => toast.error(error.message || 'No se pudo cancelar el plan'),
  })
  return <div role="group" aria-label={`Plan: ${plan.title}`} className="flex flex-wrap items-center gap-2 text-[11px]">
    <button disabled={done.isPending || cancel.isPending || plan.plannedMin <= 0} onClick={() => done.mutate({ id: plan.id })} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-1 font-semibold text-[var(--accent)] disabled:opacity-50"><CheckCircle2 size={12}/>{plan.plannedMin > 0 ? `${plan.plannedMin}m · hecho` : "Sin duración"}</button>
    <button disabled={done.isPending || cancel.isPending} onClick={() => setEditing(true)} aria-label={`Reprogramar ${plan.title}`} className="text-[var(--accent)] hover:underline disabled:opacity-50">Reprogramar</button>
    <button disabled={done.isPending || cancel.isPending} onClick={() => setCancelling(true)} aria-label={`Cancelar plan ${plan.title}`} className="text-[var(--ink-3)] hover:text-[var(--loss)] disabled:opacity-50">Cancelar</button>
    <PlanSessionModal open={editing} onClose={() => setEditing(false)} editPlan={plan}/>
    <ConfirmDialog open={cancelling} onOpenChange={setCancelling} title="Cancelar plan" description={`Se quitará «${plan.title}» de tu agenda. Las sesiones ya realizadas se conservarán.`} confirmLabel="Cancelar plan" cancelLabel="Conservar plan" loading={cancel.isPending} onConfirm={() => cancel.mutate({ id: plan.id })}/>
  </div>
}

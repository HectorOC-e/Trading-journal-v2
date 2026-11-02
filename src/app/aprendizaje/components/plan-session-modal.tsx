"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarClock } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { localDateISO, safeTimeZone } from "@/lib/datetime/local"
import { toast } from "@/lib/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export interface EditablePlan { id: string; resourceId: string; title: string; date: string; plannedMin: number }

export function PlanSessionModal({ open, onClose, editPlan }: { open: boolean; onClose: () => void; editPlan?: EditablePlan | null }) {
  const { data: profile } = trpc.profile.get.useQuery()
  const today = localDateISO(new Date(), safeTimeZone(profile?.timezone))
  const { data: resources = [] } = trpc.learningResources.list.useQuery(undefined, { enabled: open })
  const utils = trpc.useUtils()
  const [resourceId, setResourceId] = useState("")
  const [date, setDate] = useState("")
  const [min, setMin] = useState(30)

  const initialized = useRef<string | null>(null)
  useEffect(() => {
    if (!open) { initialized.current = null; return }
    const key = editPlan?.id ?? "new"
    if (initialized.current === key) return
    initialized.current = key
    setResourceId(editPlan?.resourceId ?? ""); setDate(editPlan?.date ?? ""); setMin(editPlan?.plannedMin ?? 30)
  }, [open, editPlan])
  const options = useMemo(() => resources.filter(r => r.id === editPlan?.resourceId || (r.status !== "ABANDONED" && r.status !== "MASTERED")), [resources, editPlan?.resourceId])

  const plan = trpc.studySessions.plan.useMutation({
    onSuccess: () => { utils.studySessions.invalidate(); toast.success("Sesión planificada"); reset(); onClose() },
    onError: () => toast.error("No se pudo planificar"),
  })
  const reschedule = trpc.studySessions.reschedule.useMutation({
    onSuccess: () => { void utils.studySessions.invalidate(); toast.success("Plan reprogramado"); reset(); onClose() },
    onError: (error) => toast.error(error.message || "No se pudo reprogramar"),
  })
  const pending = plan.isPending || reschedule.isPending
  const valid = !!resourceId && (date || today) >= today && Number.isInteger(min) && min >= 5 && min <= 480
  function reset() { setResourceId(""); setDate(""); setMin(30) }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock size={16} /> {editPlan ? "Reprogramar sesión" : "Planificar sesión"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <label className="flex flex-col gap-1">
            <span className="input-label">Recurso</span>
            <select disabled={!!editPlan} value={resourceId} onChange={e => setResourceId(e.target.value)}
              className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
              <option value="">Selecciona un recurso…</option>
              {options.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="input-label">Día</span>
              <input type="date" value={date || today} min={today} onChange={e => setDate(e.target.value)}
                className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="input-label">Minutos</span>
              <input type="number" value={min} min={5} max={480} step={5} onChange={e => setMin(Number(e.target.value))}
                className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || pending}
            onClick={() => { if (!valid) return; if (editPlan) reschedule.mutate({ id: editPlan.id, date: date || today, plannedMin: min }); else plan.mutate({ resourceId, date: date || today, plannedMin: min }) }}>
            {pending ? "Guardando…" : editPlan ? "Guardar cambios" : "Planificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useMemo, useState } from "react"
import { CalendarClock } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

function todayISO() { return new Date().toISOString().slice(0, 10) }

export function PlanSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: resources = [] } = trpc.learningResources.list.useQuery(undefined, { enabled: open })
  const utils = trpc.useUtils()
  const [resourceId, setResourceId] = useState("")
  const [date, setDate] = useState(todayISO())
  const [min, setMin] = useState(30)

  const options = useMemo(() => resources.filter(r => r.status !== "ABANDONED" && r.status !== "MASTERED"), [resources])

  const plan = trpc.studySessions.plan.useMutation({
    onSuccess: () => { utils.studySessions.invalidate(); toast.success("Sesión planificada"); reset(); onClose() },
    onError: () => toast.error("No se pudo planificar"),
  })
  function reset() { setResourceId(""); setDate(todayISO()); setMin(30) }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock size={16} /> Planificar sesión</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <label className="flex flex-col gap-1">
            <span className="input-label">Recurso</span>
            <select value={resourceId} onChange={e => setResourceId(e.target.value)}
              className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
              <option value="">Selecciona un recurso…</option>
              {options.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="input-label">Día</span>
              <input type="date" value={date} min={todayISO()} onChange={e => setDate(e.target.value)}
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
          <Button variant="primary" disabled={!resourceId || plan.isPending}
            onClick={() => plan.mutate({ resourceId, date, plannedMin: min })}>
            {plan.isPending ? "Planificando…" : "Planificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

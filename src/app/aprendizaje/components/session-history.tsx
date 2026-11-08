"use client"

import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { safeTimeZone } from "@/lib/datetime/local"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type HistoryItem = {
  id: string; resourceTitle: string; resourceType: string; status: string; source?: string
  startedAt: string | null; endedAt: string | null; durationMin: number | null
  note: string | null; updatedAt: string; revisionCount: number
  canAdjustProgress: boolean; needsProgressConfirmation: boolean; progressLabel: string | null
}
const fieldClass = "rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-2 text-sm text-[var(--ink)]"

export function SessionHistory() {
  const { data: profile } = trpc.profile.get.useQuery()
  const zone = safeTimeZone(profile?.timezone)
  const history = trpc.studySessions.history.useInfiniteQuery({ limit: 20 }, { getNextPageParam: last => last.nextCursor ?? undefined })
  const utils = trpc.useUtils()
  const [selection, setSelection] = useState<{ item: HistoryItem; mode: "edit" | "void" } | null>(null)
  const [minutes, setMinutes] = useState("30")
  const [note, setNote] = useState("")
  const [adjustProgress, setAdjustProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const onSuccess = () => {
    void utils.studySessions.invalidate()
    void utils.learningResources.invalidate()
    setSelection(null)
    setError(null)
  }
  const onError = (cause: { message: string; data?: { code?: string } | null }) => {
    setError(cause.message || "No se pudo guardar. Reintenta la operación.")
    setConflict(cause.data?.code === "CONFLICT")
  }
  async function refreshAfterConflict() {
    setRefreshing(true)
    try {
      const result = await history.refetch()
      if (result.isError) throw new Error("refresh failed")
      setSelection(null)
      setError(null)
      setConflict(false)
    } catch {
      setError("No se pudo actualizar el historial. Tu borrador se conserva; vuelve a intentarlo.")
    } finally {
      setRefreshing(false)
    }
  }
  const revise = trpc.studySessions.reviseCompleted.useMutation({ onSuccess, onError })
  const voidSession = trpc.studySessions.voidCompleted.useMutation({ onSuccess, onError })
  const pending = revise.isPending || voidSession.isPending || refreshing
  function open(item: HistoryItem, mode: "edit" | "void") {
    setSelection({ item, mode }); setMinutes(String(item.durationMin ?? 0)); setNote(item.note ?? "")
    setAdjustProgress(item.canAdjustProgress && !item.needsProgressConfirmation); setError(null); setConflict(false)
  }
  const validMinutes = minutes.trim() !== "" && Number.isInteger(Number(minutes)) && Number(minutes) >= 0 && Number(minutes) <= 2147483647
  return (
    <section aria-labelledby="session-history-title" className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3">
      <h2 id="session-history-title" className="text-sm font-semibold">Historial de sesiones</h2>
      {history.isLoading && <p role="status" className="text-sm text-[var(--ink-3)]">Cargando historial…</p>}
      {history.isError && <div role="alert" className="text-sm"><p>No se pudo actualizar el historial.</p><Button variant="ghost" onClick={() => void history.refetch()}>Reintentar</Button></div>}
      {history.data && history.data.pages.every(page => page.items.length === 0) && <p className="text-sm text-[var(--ink-3)]">Todavía no tienes sesiones completadas.</p>}
      <ul className="space-y-3">
        {history.data?.pages.flatMap(page => page.items).map(item => {
          const date = item.endedAt ?? item.startedAt
          return <li key={item.id} className="border-t border-[var(--line)] pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm space-y-1">
              <p className="font-medium break-words">{item.resourceTitle}</p>
              <p className="text-xs text-[var(--ink-3)]">{date && <time dateTime={date}>{new Intl.DateTimeFormat("es-ES", { timeZone: zone, dateStyle: "medium", timeStyle: "short" }).format(new Date(date))}</time>} · {item.durationMin ?? 0} min · {item.status === "voided" ? "Anulada" : "Completada"}</p>
              {item.note && <p className="whitespace-pre-wrap break-words text-[var(--ink-3)]">{item.note}</p>}
              {item.revisionCount > 0 && <p className="text-xs text-[var(--ink-3)]">{item.revisionCount} {item.revisionCount === 1 ? "corrección" : "correcciones"}</p>}
            </div>
            {item.source === "practice" && <Link className="text-xs text-[var(--accent)] hover:underline" href="/aprendizaje?tab=practicas">Gestionar en Prácticas</Link>}
            {item.status === "completed" && item.source !== "practice" && <div className="flex gap-1"><Button variant="ghost" onClick={() => open(item, "edit")}>Editar</Button><Button variant="ghost" onClick={() => open(item, "void")}>Anular</Button></div>}
          </li>
        })}
      </ul>
      {history.hasNextPage && <Button variant="ghost" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? "Cargando…" : "Cargar más"}</Button>}
      <Dialog open={!!selection} onOpenChange={open => { if (!open && !pending) setSelection(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selection?.mode === "edit" ? "Editar sesión" : "Anular sesión"}</DialogTitle><DialogDescription>{selection?.item.resourceTitle}</DialogDescription></DialogHeader>
          {selection && <form onSubmit={event => {
            event.preventDefault()
            if (pending || conflict) return
            const shared = { id: selection.item.id, expectedUpdatedAt: selection.item.updatedAt, adjustProgress: selection.item.canAdjustProgress && adjustProgress }
            if (selection.mode === "void") voidSession.mutate(shared)
            else if (validMinutes) revise.mutate({ ...shared, durationMin: Number(minutes), note })
          }} className="space-y-3">
            {selection.mode === "edit" ? <>
              <label className="flex flex-col gap-1 text-sm">Minutos<input className={fieldClass} type="number" min={0} max={2147483647} step={1} required value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
              <label className="flex flex-col gap-1 text-sm">Nota<textarea className={fieldClass} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} /></label>
            </> : <p className="text-sm">La sesión quedará anulada y dejará de contar en tu tiempo y racha. Se conservará en el historial.</p>}
            {selection.item.canAdjustProgress ? <>
              {selection.item.needsProgressConfirmation && <p className="text-sm text-[var(--ink-3)]">Esta sesión antigua no tiene un registro del progreso aplicado. Ajusta el progreso solo si sabes que corresponde a esta sesión.</p>}
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={adjustProgress} onChange={e => setAdjustProgress(e.target.checked)} /><span>Ajustar también el progreso del recurso{selection.item.progressLabel ? ` (${selection.item.progressLabel})` : ""}</span></label>
              {selection.mode === "edit" && <p className="text-xs text-[var(--ink-3)]">Cambiar solo la nota no modifica el progreso.</p>}
            </> : <p className="text-sm text-[var(--ink-3)]">El progreso del recurso no se puede ajustar porque sus unidades ya no son compatibles con esta sesión.</p>}
            {error && <div role="alert" className="text-sm text-[var(--loss)]"><p>{error}</p>{conflict && <>
              <p className="mt-2 text-[var(--ink-3)]">Actualizar el historial cerrará este formulario y descartará el borrador solo si se carga la versión actual. Después podrás abrir la sesión de nuevo.</p>
              <Button variant="ghost" type="button" disabled={pending} onClick={() => void refreshAfterConflict()}>{refreshing ? "Actualizando…" : "Actualizar historial"}</Button>
            </>}</div>}
            <DialogFooter><Button variant="ghost" type="button" disabled={pending} onClick={() => setSelection(null)}>Cancelar</Button><Button variant="primary" type="submit" disabled={pending || conflict || (selection.mode === "edit" && !validMinutes)}>{pending ? "Guardando…" : selection.mode === "edit" ? "Guardar cambios" : "Confirmar anulación"}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </section>
  )
}

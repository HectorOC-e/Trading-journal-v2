"use client"

import { useState } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { cn } from "@/lib/utils"
import { MASTERY_LABELS, calcPreviewNextReview, fmtRelativeTime } from "../utils/review-helpers"

type SessionResource = { id: string; title: string; type: string; reviewInterval?: number | null }

export function SessionReviewModal({
  queue,
  open,
  onClose,
}: {
  queue:   SessionResource[]
  open:    boolean
  onClose: () => void
}) {
  const [index,        setIndex]       = useState(0)
  const [masteryLevel, setMastery]     = useState(3)
  const [quickNote,    setQuickNote]   = useState("")
  const [saved,        setSaved]       = useState(0)
  const [done,         setDone]        = useState(false)
  const utils = trpc.useUtils()

  const current = queue[index] ?? null

  const { data: resourceReviews = [] } = trpc.learningResources.listReviews.useQuery(
    current?.id ?? "",
    { enabled: open && !!current }
  )
  const mostRecent = resourceReviews[0] ?? null
  const [ctxExpanded, setCtxExpanded] = useState(true)

  const createReview = trpc.learningResources.createReview.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      utils.learningResources.stats.invalidate()
      advance(true)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  function advance(didSave: boolean) {
    if (didSave) setSaved((v) => v + 1)
    const next = index + 1
    if (next >= queue.length) {
      setDone(true)
    } else {
      setIndex(next)
      setMastery(3)
      setQuickNote("")
      setCtxExpanded(true)
    }
  }

  function handleSave() {
    if (!current) return
    createReview.mutate({
      resourceId:   current.id,
      learned:      quickNote.trim() || "(review rápido)",
      howToApply:   "",
      insights:     [],
      rating:       0,
      masteryLevel,
    })
  }

  function handleClose() {
    setIndex(0); setSaved(0); setDone(false); setMastery(3); setQuickNote("")
    onClose()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="text-4xl">🎉</span>
            <div>
              <DialogTitle className="text-lg font-bold text-[var(--ink)]">¡Sesión completada!</DialogTitle>
              <p className="text-sm text-[var(--ink-2)] mt-1">Guardaste {saved} de {queue.length} reviews.</p>
              <p className="text-xs text-[var(--ink-3)] mt-2">Buena racha. Vuelve mañana a revisar tu progreso.</p>
            </div>
            <Button variant="primary" onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base">{index + 1} de {queue.length}</DialogTitle>
                <span className="text-[10px] text-[var(--ink-3)]">Sesión de reviews</span>
              </div>
              <p className="font-semibold text-[var(--ink)] text-sm leading-snug mt-1">{current?.title}</p>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
              {mostRecent && (
                <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                    onClick={() => setCtxExpanded((v) => !v)}
                  >
                    <span>Último review · Maestría: {mostRecent.masteryLevel}/5</span>
                    {ctxExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {ctxExpanded && mostRecent.learned && (
                    <p className="px-3 pb-3 text-xs text-[var(--ink-2)] italic">
                      &ldquo;{mostRecent.learned.slice(0, 200)}{mostRecent.learned.length > 200 ? "…" : ""}&rdquo;
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                  💬 ¿Algo que añadir? (opcional)
                </label>
                <input
                  type="text"
                  autoFocus
                  className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Un insight clave, algo que recordar…"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-[var(--ink-3)]">🧩 Nivel de maestría</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setMastery(level)}
                      className={cn(
                        "flex-1 h-8 rounded-[var(--radius-sm)] text-xs font-medium transition-colors border",
                        masteryLevel === level
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "bg-[var(--panel-2)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--ink-3)] mt-1">
                  {MASTERY_LABELS[masteryLevel]} · Próximo review: {calcPreviewNextReview(current?.reviewInterval, masteryLevel)}
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => advance(false)} className="shrink-0">Saltar</Button>
              <Button variant="primary" onClick={handleSave} disabled={createReview.isPending} className="flex-1">
                <Check size={13} className="mr-1" />
                Guardar y siguiente →
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export type { SessionResource }
// Re-export for convenience
export { fmtRelativeTime }

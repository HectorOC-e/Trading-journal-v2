"use client"

import { useEffect, useRef, useState } from "react"
import { Check, CheckCircle2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { Button } from "@/components/ui/button"
import { queueReviewNotes, readReviewDraft, storeReviewDraft, clearReviewDraft, reviewDraftRevision } from "./notes-draft"
import { Card, Eyebrow } from "./primitives"
import { SendReviewEmailButton } from "./send-email-button"

type Period =
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }

function useSaveReview(period: Period, onSaved?: (r: { status: string; notes: string }) => void) {
  const onError = (e: unknown) => toast.error(formatErrorForUser(e as Parameters<typeof formatErrorForUser>[0]))
  const weekly  = trpc.weeklyReviews.saveReview.useMutation({ onSuccess: onSaved, onError })
  const monthly = trpc.monthlyReviews.saveReview.useMutation({ onSuccess: onSaved, onError })
  const save = (args: { notes?: string; status?: "draft" | "submitted" }) =>
    period.kind === "weekly"
      ? weekly.mutateAsync({ weekStart: period.weekStart, ...args })
      : monthly.mutateAsync({ year: period.year, month: period.month, ...args })
  return { save, pending: weekly.isPending || monthly.isPending }
}

/** Header lifecycle controls: status badge + Finalizar + Enviar por correo. */
export function ReviewActions({ period, initialStatus }: { period: Period; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)
  const { save, pending } = useSaveReview(period, (r) => { setStatus(r.status); toast.success("Review finalizada") })
  const finalized = status === "submitted"

  return (
    <div className="flex items-center gap-2 print:hidden">
      <span
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
        style={finalized
          ? { background: "var(--win-soft)", color: "var(--win)" }
          : { background: "var(--panel-2)", color: "var(--ink-3)" }}
      >
        {finalized ? <CheckCircle2 size={12} /> : null}
        {finalized ? "Finalizada" : "Borrador"}
      </span>
      {!finalized && (
        <button
          onClick={() => { void save({ status: "submitted" }).catch(() => undefined) }}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] disabled:opacity-60"
        >
          <Check size={14} /> {pending ? "Finalizando…" : "Finalizar"}
        </button>
      )}
      <SendReviewEmailButton period={period} />
    </div>
  )
}

/** Keying the editor prevents a period change from reusing an old draft or save closure. */
export function ReviewNotes({ period, initialNotes, userId }: { period: Period; initialNotes: string; userId: string }) {
  const key = `review-notes:${userId}:${period.kind === "weekly" ? `week:${period.weekStart}` : `month:${period.year}:${period.month}`}`
  return <NotesEditor key={key} draftKey={key} period={period} initialNotes={initialNotes} />
}

function NotesEditor({ period, initialNotes, draftKey }: { period: Period; initialNotes: string; draftKey: string }) {
  const [notes, setNotes] = useState(initialNotes)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const latest = useRef(initialNotes)
  const confirmed = useRef(initialNotes)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(false)
  const { save } = useSaveReview(period)
  const saveRef = useRef(save)
  const flush = useRef<() => void>(() => undefined)
  useEffect(() => {
    saveRef.current = save
    flush.current = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      const value = latest.current
      const revision = reviewDraftRevision(draftKey)
      if (!dirty.current) return
      dirty.current = false
      if (active.current) setState("saving")
      void queueReviewNotes(draftKey, () => saveRef.current({ notes: value })).then(() => {
        confirmed.current = value
        clearReviewDraft(draftKey, value, revision)
        if (active.current && latest.current === value && revision === reviewDraftRevision(draftKey)) setState("saved")
      }).catch(() => {
        if (latest.current === value && revision === reviewDraftRevision(draftKey)) {
          dirty.current = true
          if (active.current) setState("error")
        }
      })
    }
  }, [save, draftKey])

  useEffect(() => {
    active.current = true
    const recovered = readReviewDraft(draftKey)
    if (recovered !== null && recovered !== confirmed.current) {
      dirty.current = true
      latest.current = recovered
      setNotes(recovered)
      flush.current()
    }
    const leaving = () => {
      flush.current()
    }
    window.addEventListener("beforeunload", leaving)
    return () => {
      active.current = false
      window.removeEventListener("beforeunload", leaving)
      flush.current()
    }
  }, [draftKey])

  function change(value: string) {
    dirty.current = true
    latest.current = value
    setNotes(value)
    storeReviewDraft(draftKey, value)
    setState("saving")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush.current(), 800)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>Tus notas</Eyebrow>
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <span className="text-[10px] text-[var(--ink-3)]">
            {state === "saving" ? "Guardando…" : state === "saved" ? "Guardado ✓" : state === "error" ? "No se pudo guardar. Borrador conservado." : ""}
          </span>
          {state === "error" && <Button size="sm" variant="ghost" onClick={() => flush.current()}>Reintentar</Button>}
        </div>
      </div>
      <textarea
        aria-label="Tus notas"
        value={notes}
        onChange={(e) => change(e.target.value)}
        placeholder="Tu reflexión del periodo: lecciones, objetivos para el próximo, qué repetir o evitar…"
        rows={4}
        className="w-full text-sm p-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y"
      />
    </Card>
  )
}

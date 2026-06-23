"use client"

import { useEffect, useRef, useState } from "react"
import { Check, CheckCircle2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
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
      ? weekly.mutate({ weekStart: period.weekStart, ...args })
      : monthly.mutate({ year: period.year, month: period.month, ...args })
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
          onClick={() => save({ status: "submitted" })}
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

/** Bottom "Tus notas" section — autosaves (debounced) to the review row. */
export function ReviewNotes({ period, initialNotes }: { period: Period; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes)
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { save } = useSaveReview(period, () => setState("saved"))

  // Debounced autosave on change (skips the initial mount value).
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setState("saving")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save({ notes }), 800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>Tus notas</Eyebrow>
        <span className="text-[10px] text-[var(--ink-3)]">
          {state === "saving" ? "Guardando…" : state === "saved" ? "Guardado ✓" : ""}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Tu reflexión del periodo: lecciones, objetivos para el próximo, qué repetir o evitar…"
        rows={4}
        className="w-full text-sm p-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y"
      />
    </Card>
  )
}

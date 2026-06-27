"use client"

// InterventionOverlay (S7 · global layer S12d, C1 / DS §10.4) — the in-the-moment
// intervention. Mounted GLOBALLY in AppShell so an active intervention surfaces on
// any surface, not just where it was created. Direct + empathetic message · ONE
// protective action · exit with friction. The only permitted interruption (P4).

import { useEffect, useRef } from "react"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

export function InterventionOverlay() {
  const utils = trpc.useUtils()
  // Polled so it surfaces on any surface; refetchOnWindowFocus catches tab return.
  const { data: iv } = trpc.intervention.active.useQuery(undefined, {
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: 45_000,
  })

  const exitRef = useRef<HTMLButtonElement>(null)
  const acceptRef = useRef<HTMLButtonElement>(null)

  const respond = trpc.intervention.respond.useMutation({
    onSuccess: (r) => {
      if (r.ruleCreated) toast.success("Protección activada: regla creada para prevenirlo.")
      utils.intervention.active.invalidate()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  // DS §10.4: lock body scroll, focus the dialog, and Esc = "seguir" with friction
  // (draws focus to the explicit exit instead of closing on a stray keypress).
  useEffect(() => {
    if (!iv) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    ;(acceptRef.current ?? exitRef.current)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); exitRef.current?.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow }
  }, [iv])

  if (!iv) return null
  const critical = iv.severity === "critical"
  // The intervention is the single "alarm": critical → loss, else the amber
  // --intervene role (never decorative; paired with icon + heading).
  const accent = critical ? "var(--loss)" : "var(--intervene)"
  const accentSoft = critical ? "var(--loss-soft)" : "var(--intervene-soft)"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-md p-4 fade-in">
      <div
        className="w-full max-w-md rounded-[var(--radius)] border bg-[var(--panel)] p-5 flex flex-col gap-4"
        style={{ borderColor: accent, boxShadow: "var(--shadow-overlay)" }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="intervene-title"
        aria-describedby="intervene-msg"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] shrink-0" style={{ background: accentSoft }}>
            <ShieldAlert size={18} style={{ color: accent }} />
          </span>
          <p id="intervene-title" className="text-base font-bold text-[var(--ink)]">{critical ? "Para un momento" : "Atención"}</p>
        </div>

        <p id="intervene-msg" className="text-sm text-[var(--ink)] leading-relaxed">{iv.message}</p>

        <div className="flex flex-col gap-2 pt-1">
          {iv.actionKind !== "none" && (
            <button
              ref={acceptRef}
              type="button"
              onClick={() => respond.mutate({ interventionId: iv.id, response: "accepted" })}
              disabled={respond.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-[var(--accent-contrast)] font-semibold py-2.5 hover:opacity-90 disabled:opacity-50"
              style={{ background: accent }}
            >
              <ShieldCheck size={15} /> {iv.actionLabel}
            </button>
          )}
          <button
            ref={exitRef}
            type="button"
            onClick={() => respond.mutate({ interventionId: iv.id, response: "dismissed" })}
            disabled={respond.isPending}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] text-[var(--ink-3)] text-sm py-2 hover:text-[var(--ink)] hover:border-[var(--ink-3)] disabled:opacity-50"
          >
            Seguir, asumo el riesgo
          </button>
        </div>
      </div>
    </div>
  )
}

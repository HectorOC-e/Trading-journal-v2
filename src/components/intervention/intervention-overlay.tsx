"use client"

// InterventionOverlay (S7, C1 / DS §10.4) — the in-the-moment intervention. Shown
// when there is an active intervention (persisted by the fast-path on trade close).
// Direct + empathetic message · ONE protective action · exit with friction.

import { ShieldAlert, ShieldCheck } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

export function InterventionOverlay() {
  const utils = trpc.useUtils()
  const { data: iv } = trpc.intervention.active.useQuery(undefined, { staleTime: 5_000, refetchOnWindowFocus: true })

  const respond = trpc.intervention.respond.useMutation({
    onSuccess: (r) => {
      if (r.ruleCreated) toast.success("Protección activada: regla creada para prevenirlo.")
      utils.intervention.active.invalidate()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  if (!iv) return null
  const critical = iv.severity === "critical"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 fade-in">
      <div
        className="w-full max-w-md rounded-[var(--radius)] border bg-[var(--panel)] p-5 shadow-2xl flex flex-col gap-4"
        style={{ borderColor: critical ? "var(--loss)" : "var(--be)" }}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} style={{ color: critical ? "var(--loss)" : "var(--be)" }} />
          <p className="text-base font-bold text-[var(--ink)]">{critical ? "Para un momento" : "Atención"}</p>
        </div>

        <p className="text-sm text-[var(--ink)] leading-relaxed">{iv.message}</p>

        <div className="flex flex-col gap-2 pt-1">
          {iv.actionKind !== "none" && (
            <button
              type="button"
              onClick={() => respond.mutate({ interventionId: iv.id, response: "accepted" })}
              disabled={respond.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold py-2.5 hover:opacity-90 disabled:opacity-50"
            >
              <ShieldCheck size={15} /> {iv.actionLabel}
            </button>
          )}
          <button
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

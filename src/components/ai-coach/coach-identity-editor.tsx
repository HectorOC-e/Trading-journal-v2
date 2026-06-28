"use client"

// Identity memory editor (E15, v3.2) — the structured layer that calibrates the
// coach's tone/focus/style. User-owned (never LLM-written). Saved to memory_identity.

import { useState, useEffect } from "react"
import { UserCog, Check } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"

export function CoachIdentityEditor() {
  const utils = trpc.useUtils()
  const { data } = trpc.coach.identity.useQuery(undefined, { staleTime: 30_000 })
  const [tone, setTone] = useState("")
  const [focus, setFocus] = useState("")
  const [summary, setSummary] = useState("")

  useEffect(() => {
    if (data) { setTone(data.tone ?? ""); setFocus(data.focus ?? ""); setSummary(data.summary ?? "") }
  }, [data])

  const save = trpc.coach.setIdentity.useMutation({
    onSuccess: () => { toast.success("Identidad guardada"); utils.coach.identity.invalidate() },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const field = "w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <UserCog size={13} className="text-[var(--accent)]" />
        <p className="text-[12px] font-bold text-[var(--ink)]">Identidad</p>
        <span className="text-[10px] text-[var(--ink-3)]">— cómo quieres que el coach te hable</span>
      </div>
      <input className={field} placeholder="Tono (p. ej. directo, de apoyo, técnico)" value={tone} maxLength={120} onChange={(e) => setTone(e.target.value)} />
      <input className={field} placeholder="Foco actual (p. ej. reducir overtrading)" value={focus} maxLength={200} onChange={(e) => setFocus(e.target.value)} />
      <textarea className={field} rows={2} placeholder="Cómo te describes como trader" value={summary} maxLength={500} onChange={(e) => setSummary(e.target.value)} />
      <button
        type="button"
        onClick={() => save.mutate({ tone, focus, summary })}
        disabled={save.isPending}
        className="self-end inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] text-[11px] font-semibold px-2.5 py-1.5 hover:opacity-90 disabled:opacity-40"
      >
        <Check size={12} /> Guardar
      </button>
    </div>
  )
}

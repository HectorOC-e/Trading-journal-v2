"use client"

// Coach memory panel (S6) — visible / editable / deletable memory (ADR-003 §3).
// Candidate memories (LLM proposals, from S7) can be confirmed; the user can also
// add their own. Only confirmed memory is injected into the coach prompt.

import { useState } from "react"
import { Check, Trash2, Plus, BrainCircuit, Pencil, X } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { cn } from "@/lib/utils"
import { CoachIdentityEditor } from "@/components/ai-coach/coach-identity-editor"
import { CoachMemoryLayers } from "@/components/ai-coach/coach-memory-layers"

const KIND_LABEL: Record<string, string> = { fact: "Hecho", preference: "Preferencia", identity: "Identidad" }

export function CoachMemoryPanel() {
  const utils = trpc.useUtils()
  const { data: memory = [], isLoading } = trpc.coach.memory.useQuery(undefined, { staleTime: 15_000 })
  const [draft, setDraft] = useState("")
  // Edición inline: qué fila se está editando y su borrador. `null` = ninguna.
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null)
  const invalidate = () => utils.coach.memory.invalidate()
  const closeEdit = () => setEditing(null)

  const add = trpc.coach.addMemory.useMutation({ onSuccess: () => { setDraft(""); invalidate() }, onError: (err) => toast.error(formatErrorForUser(err)) })
  const confirm = trpc.coach.confirmMemory.useMutation({ onSuccess: invalidate, onError: (err) => toast.error(formatErrorForUser(err)) })
  const remove = trpc.coach.deleteMemory.useMutation({ onSuccess: invalidate, onError: (err) => toast.error(formatErrorForUser(err)) })
  // La mutación existía desde S6 y ningún componente la llamaba; el panel prometía
  // "edita" y no lo ofrecía. Editar marca `source: "user"` en el servidor.
  const edit = trpc.coach.editMemory.useMutation({ onSuccess: () => { closeEdit(); invalidate() }, onError: (err) => toast.error(formatErrorForUser(err)) })

  /** El servidor exige `min(1)`: enviar vacío sería un 400 mudo. */
  const saveEdit = () => {
    const content = editing?.content.trim()
    if (!editing || !content) return
    edit.mutate({ id: editing.id, content })
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 overflow-y-auto">
      <div className="flex items-center gap-2">
        <BrainCircuit size={14} className="text-[var(--accent)]" />
        <p className="text-sm font-bold text-[var(--ink)]">Memoria del coach</p>
      </div>
      <p className="text-[11px] text-[var(--ink-3)] leading-snug">
        Lo que el coach recuerda de ti. Solo lo <span className="text-[var(--win)]">confirmado</span> se usa en las
        respuestas. Tú decides: confirma, edita o borra.
      </p>

      {/* Identity layer (E15) */}
      <CoachIdentityEditor />

      {/* Add memory */}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) add.mutate({ kind: "fact", content: draft.trim() }) }}
          placeholder="Añadir un hecho que el coach deba recordar…"
          maxLength={500}
          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => draft.trim() && add.mutate({ kind: "fact", content: draft.trim() })}
          disabled={add.isPending || !draft.trim()}
          className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold px-2.5 py-2 hover:opacity-90 disabled:opacity-40"
        >
          <Plus size={12} /> Añadir
        </button>
      </div>

      {isLoading ? (
        <div className="h-16 rounded-[var(--radius-sm)] bg-[var(--panel-2)] animate-pulse" />
      ) : memory.length === 0 ? (
        <p className="text-[11px] text-[var(--ink-3)] py-4 text-center">Aún no hay memoria. Añade algo o convérsalo con el coach.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {memory.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{KIND_LABEL[m.kind] ?? m.kind}</span>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    m.status === "confirmed" ? "bg-[var(--win-soft)] text-[var(--win)]" : "bg-[var(--be-soft)] text-[var(--be)]")}>
                    {m.status === "confirmed" ? "confirmado" : "candidato"}
                  </span>
                </span>
                {editing?.id === m.id ? (
                  <input
                    aria-label="Editar memoria"
                    value={editing.content}
                    onChange={(e) => setEditing({ id: m.id, content: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") closeEdit() }}
                    maxLength={500}
                    autoFocus
                    className="w-full mt-0.5 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--panel)] px-2 py-1 text-[12px] text-[var(--ink)] focus:outline-none"
                  />
                ) : (
                  <span className="text-[12px] text-[var(--ink)] leading-snug block mt-0.5">{m.content}</span>
                )}
              </span>
              <span className="shrink-0 flex items-center gap-1">
                {editing?.id === m.id ? (
                  <>
                    <button type="button" title="Guardar" onClick={saveEdit} disabled={edit.isPending || !editing.content.trim()} className="text-[var(--win)] hover:opacity-80 disabled:opacity-40 p-1">
                      <Check size={13} />
                    </button>
                    <button type="button" title="Cancelar" onClick={closeEdit} className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1">
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    {m.status !== "confirmed" && (
                      <button type="button" title="Confirmar" onClick={() => confirm.mutate({ id: m.id })} className="text-[var(--win)] hover:opacity-80 p-1">
                        <Check size={13} />
                      </button>
                    )}
                    <button type="button" title="Editar" onClick={() => setEditing({ id: m.id, content: m.content })} className="text-[var(--ink-3)] hover:text-[var(--accent)] p-1">
                      <Pencil size={13} />
                    </button>
                    <button type="button" title="Borrar" onClick={() => remove.mutate({ id: m.id })} className="text-[var(--ink-3)] hover:text-[var(--loss)] p-1">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hierarchical memory layers (E13/E14) — read-only, visible */}
      <CoachMemoryLayers />
    </div>
  )
}

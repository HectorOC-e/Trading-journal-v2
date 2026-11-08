"use client"

import { useRecoverableDraft } from "@/hooks/useRecoverableDraft"
import { DraftRecovery } from "@/components/ui/draft-recovery"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { FieldError } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/server/trpc/root"
import {
  TYPE_EMOJIS, ALL_TYPES, PROGRESS_TYPES, PROGRESS_LABELS,
  type FormState, emptyForm,
} from "../utils/resource-form"

function resourcePayload(form: FormState) {
  const showProgress = PROGRESS_TYPES.includes(form.type)
  return {
    ...form,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    totalUnits: showProgress ? form.totalUnits : null,
    currentUnits: showProgress ? form.currentUnits : null,
  }
}

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

type ResourceEditorProps = Parameters<typeof ResourceEditor>[0]
export function AddEditResourceModal(props: Omit<ResourceEditorProps, "userId">) {
  const profile = trpc.profile?.get.useQuery()
  if (profile && !profile.data) return <Dialog open={props.open} onOpenChange={props.onOpenChange}><DialogContent><DialogTitle>Recurso</DialogTitle><p role={profile.error ? "alert" : "status"}>{profile.error ? "No se pudo cargar tu perfil." : "Cargando tu perfil…"}</p>{profile.error && <Button onClick={() => void profile.refetch()}>Reintentar perfil</Button>}<Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancelar</Button></DialogContent></Dialog>;
  return <ResourceEditor key={profile?.data?.id ?? "unresolved"} {...props} userId={profile?.data?.id} />
}
function ResourceEditor({
  userId,
  open,
  onOpenChange,
  editTarget,
}: {
  userId?: string
  open:         boolean
  onOpenChange: (v: boolean) => void
  editTarget:   ResourceFromDB | null
}) {
  const [form, setForm] = useState<FormState>(emptyForm())
  const [originalForm, setOriginalForm] = useState<FormState | null>(null)
  const [titleError, setTitleError] = useState("")
  const initializedTarget = useRef<string | null | undefined>(undefined)
  const draft = useRecoverableDraft(open ? userId : undefined, `resource:${editTarget?.id ?? "new"}`, (raw) => {
    if (!raw || typeof raw !== "object") return null
    const v = raw as Record<string, unknown>
    const value = {} as FormState
    for (const key of Object.keys(emptyForm()) as (keyof FormState)[]) {
      const item = v[key], baseline = emptyForm()[key]
      if (baseline === null ? item !== null && typeof item !== "number" : typeof item !== typeof baseline) return null
      Object.assign(value, { [key]: item })
    }
    return ALL_TYPES.includes(value.type) ? value : null
  })
  const saveToken = useRef<string | null>(null)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!open) {
      initializedTarget.current = undefined
      return
    }
    const targetId = editTarget?.id ?? null
    // Keep the draft and its baseline stable across background resource refreshes.
    if (initializedTarget.current === targetId) return
    initializedTarget.current = targetId
    if (editTarget) {
      const initialForm: FormState = {
        type:            editTarget.type as FormState["type"],
        title:           editTarget.title,
        author:          editTarget.author,
        source:          editTarget.source ?? "",
        date:            editTarget.date,
        notes:           editTarget.notes ?? "",
        tags:            editTarget.tags.join(", "),
        markedForReview: editTarget.markedForReview,
        totalUnits:      editTarget.totalUnits ?? null,
        currentUnits:    editTarget.currentUnits ?? null,
        reviewInterval:  editTarget.reviewInterval ?? 7,
      }
      setForm(initialForm)
      setOriginalForm(initialForm)
    } else {
      setForm(emptyForm())
      setOriginalForm(null)
    }
  }, [editTarget, open])

  const createResource = trpc.learningResources.create.useMutation({
    onSuccess: () => {
      draft.clearSaved(saveToken.current)
      void utils.learningResources.invalidate()
      void utils.studySessions.home.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const updateResource = trpc.learningResources.update.useMutation({
    onSuccess: () => {
      draft.clearSaved(saveToken.current)
      void utils.learningResources.invalidate()
      void utils.studySessions.home.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    draft.store(next)
  }

  const isEditMode   = editTarget !== null
  const showProgress = PROGRESS_TYPES.includes(form.type)

  function handleSave() {
    if (!form.title.trim()) { setTitleError("Ponle un título al recurso"); return }
    saveToken.current = draft.snapshot()
    const payload = resourcePayload(form)
    if (isEditMode) {
      if (!originalForm) return
      const originalPayload = resourcePayload(originalForm)
      const changes = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(originalPayload[key as keyof typeof originalPayload])
        )
      ) as Partial<typeof payload>
      updateResource.mutate({ id: editTarget.id, ...changes })
    } else {
      createResource.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm(emptyForm()); setTitleError("") } }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar recurso" : "Añadir recurso"}</DialogTitle>
        </DialogHeader>

        {draft.recovery && <DraftRecovery onRestore={() => { if (draft.recovery) setForm(draft.recovery.value); draft.dismiss() }} onDiscard={draft.discard} />}
        <fieldset disabled={!!draft.recovery} className="flex flex-col gap-5">
          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2 block">Tipo</label>
            <div className="grid grid-cols-7 gap-1.5">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setField("type", t)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-[var(--radius-sm)] border transition-colors",
                    form.type === t
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  )}
                  title={t}
                >
                  <span className="text-base leading-none">{TYPE_EMOJIS[t]}</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide leading-none">{t.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Título <span className="text-[var(--loss)]">*</span></label>
            <input
              aria-invalid={!!titleError || undefined}
              className={cn(
                "w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
                titleError ? "border-[var(--loss)]" : "border-[var(--line)]",
              )}
              placeholder="Ej. Trading in the Zone"
              value={form.title}
              onChange={(e) => { setField("title", e.target.value); if (titleError) setTitleError("") }}
            />
            <FieldError message={titleError} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Autor</label>
              <input
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Mark Douglas"
                value={form.author}
                onChange={(e) => setField("author", e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Fuente</label>
              <input
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Propio / Editorial / URL"
                value={form.source}
                onChange={(e) => setField("source", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Fecha</label>
            <input
              type="date"
              className="h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Notas</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
              placeholder="¿Qué aprendiste? ¿Cómo aplicarlo al trading?"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Tags</label>
            <input
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="futures, ICT, psicologia"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
            />
            <p className="text-[10px] text-[var(--ink-3)] mt-1">Separados por coma</p>
          </div>

          {showProgress && PROGRESS_LABELS[form.type] && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                  {PROGRESS_LABELS[form.type]!.current}
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="0"
                  value={form.currentUnits ?? ""}
                  onChange={(e) => setField("currentUnits", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                  {PROGRESS_LABELS[form.type]!.total}
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="—"
                  value={form.totalUnits ?? ""}
                  onChange={(e) => setField("totalUnits", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Revisar cada X días</label>
            <input
              type="number"
              min={1}
              max={365}
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              value={form.reviewInterval}
              onChange={(e) => setField("reviewInterval", Math.max(1, Number(e.target.value) || 7))}
            />
            <p className="text-[10px] text-[var(--ink-3)] mt-1">Intervalo base para el sistema de repaso espaciado (default: 7)</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Marcar para review</p>
              <p className="text-[11px] text-[var(--ink-3)]">Aparecerá en el panel de revisión</p>
            </div>
            <button
              role="switch"
              aria-checked={form.markedForReview}
              onClick={() => setField("markedForReview", !form.markedForReview)}
              className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0",
                form.markedForReview ? "bg-[var(--accent)]" : "bg-[var(--line)]"
              )}
            >
              <span className={cn(
                "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                form.markedForReview ? "translate-x-8" : "translate-x-1"
              )} />
            </button>
          </div>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!!draft.recovery || createResource.isPending || updateResource.isPending}
          >
            {(createResource.isPending || updateResource.isPending)
              ? "Guardando…"
              : isEditMode ? "Guardar cambios" : "Guardar recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/server/trpc/root"
import {
  TYPE_EMOJIS, ALL_TYPES, PROGRESS_TYPES, PROGRESS_LABELS,
  type FormState, emptyForm,
} from "../utils/resource-form"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

export function AddEditResourceModal({
  open,
  onOpenChange,
  editTarget,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  editTarget:   ResourceFromDB | null
}) {
  const [form, setForm] = useState<FormState>(emptyForm())
  const utils = trpc.useUtils()

  useEffect(() => {
    if (editTarget) {
      setForm({
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
      })
    } else {
      setForm(emptyForm())
    }
  }, [editTarget, open])

  const createResource = trpc.learningResources.create.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const updateResource = trpc.learningResources.update.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isEditMode   = editTarget !== null
  const showProgress = PROGRESS_TYPES.includes(form.type)

  function handleSave() {
    if (!form.title.trim()) return
    const payload = {
      title:           form.title,
      type:            form.type,
      author:          form.author,
      source:          form.source,
      date:            form.date,
      notes:           form.notes,
      tags:            form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      markedForReview: form.markedForReview,
      totalUnits:      showProgress ? form.totalUnits   : null,
      currentUnits:    showProgress ? form.currentUnits : null,
      reviewInterval:  form.reviewInterval,
    }
    if (isEditMode) {
      updateResource.mutate({ id: editTarget.id, ...payload })
    } else {
      createResource.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm(emptyForm()) }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar recurso" : "Añadir recurso"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
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
            <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">Título *</label>
            <input
              className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="Ej. Trading in the Zone"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
            />
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
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!form.title.trim() || createResource.isPending || updateResource.isPending}
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

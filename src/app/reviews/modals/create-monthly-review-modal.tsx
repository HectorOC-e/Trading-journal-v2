"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { RouterOutputs } from "@/server/trpc/root"

type MonthlyReview = RouterOutputs["monthlyReviews"]["list"][number]

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  year:         number
  month:        number
  editReview?:  MonthlyReview | null
}

interface TagInputProps {
  label:     string
  values:    string[]
  onChange:  (values: string[]) => void
  placeholder?: string
}

function TagInput({ label, values, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("")

  function addItem() {
    const v = draft.trim()
    if (!v || values.includes(v) || values.length >= 20) return
    onChange([...values, v])
    setDraft("")
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex gap-1.5 mb-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem() } }}
          placeholder={placeholder ?? `Añadir ${label.toLowerCase()}…`}
          className="flex-1 h-8 px-2.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <Button variant="ghost" onClick={addItem} className="h-8 px-3 text-xs">
          + Añadir
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--chip)] text-[var(--ink)] text-[11px]"
            >
              {v}
              <button
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-[var(--ink-3)] hover:text-[var(--ink)] leading-none"
                aria-label={`Eliminar ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function NuevaMensualModal({ open, onOpenChange, year, month, editReview }: Props) {
  const utils = trpc.useUtils()

  const [summary,   setSummary]   = useState("")
  const [keyThemes, setKeyThemes] = useState<string[]>([])
  const [goalsSet,  setGoalsSet]  = useState<string[]>([])
  const [goalsMet,  setGoalsMet]  = useState<string[]>([])
  const [score,     setScore]     = useState<number | "">("")

  const { data: prefill, isLoading: prefilling } = trpc.monthlyReviews.prefill.useQuery(
    { year, month },
    { enabled: open && !editReview },
  )

  useEffect(() => {
    if (!open) return
    if (editReview) {
      setSummary(editReview.summary)
      setKeyThemes(editReview.keyThemes)
      setGoalsSet(editReview.goalsSet)
      setGoalsMet(editReview.goalsMet)
      setScore(editReview.overallScore ?? "")
    } else if (prefill) {
      setScore(prefill.overallScore ?? "")
      setKeyThemes(prefill.keyThemes)
    }
  }, [open, editReview, prefill])

  function resetForm() {
    setSummary(""); setKeyThemes([]); setGoalsSet([]); setGoalsMet([]); setScore("")
  }

  const upsert = trpc.monthlyReviews.upsert.useMutation({
    onSuccess: () => {
      utils.monthlyReviews.list.invalidate()
      toast.success(`Review de ${MONTH_NAMES[month - 1]} ${year} guardada`)
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const updateMutation = trpc.monthlyReviews.update.useMutation({
    onSuccess: () => {
      utils.monthlyReviews.list.invalidate()
      toast.success("Review mensual actualizada")
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  function handleSubmit() {
    const payload = {
      summary,
      keyThemes,
      goalsSet,
      goalsMet,
      overallScore: score === "" ? null : Number(score),
      weeklyIds:    prefill?.weeklyIds ?? editReview?.weeklyIds ?? [],
    }

    if (editReview) {
      updateMutation.mutate({ id: editReview.id, ...payload })
    } else {
      upsert.mutate({ year, month, ...payload })
    }
  }

  const saving = upsert.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-review-title"
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle id="monthly-review-title">
            {editReview ? "Editar review" : "Review"} de {MONTH_NAMES[month - 1]} {year}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {!editReview && prefill && (
            <div className="rounded-[var(--radius-sm)] bg-[var(--chip)] px-3 py-2 text-[11px] text-[var(--ink-2)]">
              {prefill.tradeCount} trades · P&L ${prefill.netPnl >= 0 ? "+" : ""}{prefill.netPnl.toFixed(2)} · WR {prefill.winRate.toFixed(1)}%
              {prefill.weeklyIds.length > 0 && ` · ${prefill.weeklyIds.length} semanas`}
            </div>
          )}
          {prefilling && !editReview && (
            <p className="text-[11px] text-[var(--ink-3)]">Cargando datos del mes…</p>
          )}

          <div>
            <label htmlFor="monthly-summary" className="block text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
              Resumen ejecutivo
            </label>
            <Textarea
              id="monthly-summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="¿Cómo fue el mes en general? Patrones, fortalezas, áreas a mejorar…"
              rows={4}
            />
          </div>

          <TagInput
            label="Temas clave"
            values={keyThemes}
            onChange={setKeyThemes}
            placeholder="Ej: Sobredimensionamiento, Fomo en NY…"
          />

          <TagInput
            label="Objetivos para el próximo mes"
            values={goalsSet}
            onChange={setGoalsSet}
            placeholder="Ej: Reducir tamaño en trades off-plan…"
          />

          <TagInput
            label="Objetivos cumplidos del mes anterior"
            values={goalsMet}
            onChange={setGoalsMet}
            placeholder="Ej: Respeté el stop loss todos los días…"
          />

          <div>
            <label htmlFor="monthly-score" className="block text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
              Score de disciplina (0–100)
            </label>
            <input
              id="monthly-score"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={e => setScore(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              placeholder={prefill?.overallScore != null ? String(prefill.overallScore) : "Auto-calculado"}
              className="w-28 h-8 px-2.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onOpenChange(false); resetForm() }}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando…" : editReview ? "Guardar cambios" : "Guardar review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

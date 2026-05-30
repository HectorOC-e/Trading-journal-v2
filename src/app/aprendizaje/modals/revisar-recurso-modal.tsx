"use client"

import { useState } from "react"
import { Star, Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryChip } from "@/components/ui/category-chip"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import type { ResourceType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]
type ReviewFromDB   = RouterOutputs["weeklyReviews"]["list"][number]

const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}

export const MASTERY_LABELS: Record<number, string> = {
  1: "Confundido",
  2: "Parcial",
  3: "Entiendo",
  4: "Fluido",
  5: "Dominado",
}

export function calcPreviewNextReview(reviewInterval: number | null | undefined, masteryLevel: number): string {
  const interval = reviewInterval ?? 7
  let days: number
  if (masteryLevel <= 2) {
    days = Math.max(1, Math.ceil(interval / 2))
  } else if (masteryLevel >= 4) {
    days = Math.round(interval * 1.5)
  } else {
    days = interval
  }
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtRelativeTime(isoDate: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 7)  return `hace ${diffDays}d`
  const weeks = Math.floor(diffDays / 7)
  if (weeks < 5) return `hace ${weeks} sem`
  return `hace ${Math.floor(diffDays / 30)} mes`
}

interface RevisarState {
  learned:        string
  howToApply:     string
  insights:       string
  rating:         number
  markDone:       boolean
  linkedReviewId: string
  masteryLevel:   number
  quickNote:      string
}

function emptyRevisarState(): RevisarState {
  return { learned: "", howToApply: "", insights: "", rating: 0, markDone: false, linkedReviewId: "", masteryLevel: 3, quickNote: "" }
}

export function RevisarRecursoModal({
  resource,
  reviews,
  open,
  onOpenChange,
}: {
  resource: ResourceFromDB | null
  reviews:  ReviewFromDB[]
  open:     boolean
  onOpenChange: (v: boolean) => void
}) {
  const [form, setForm]                       = useState<RevisarState>(emptyRevisarState())
  const [contextExpanded, setContextExpanded] = useState(true)
  const [reviewMode, setReviewMode]           = useState<"quick" | "deep">(() => {
    if (typeof window === "undefined") return "quick"
    return (localStorage.getItem("review-mode") as "quick" | "deep") ?? "quick"
  })
  const utils = trpc.useUtils()

  function switchMode(mode: "quick" | "deep") {
    setReviewMode(mode)
    localStorage.setItem("review-mode", mode)
  }

  const { data: resourceReviews = [] } = trpc.learningResources.listReviews.useQuery(
    resource?.id ?? "",
    { enabled: open && !!resource }
  )
  const mostRecent = resourceReviews[0] ?? null

  const createReview = trpc.learningResources.createReview.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      onOpenChange(false)
      setForm(emptyRevisarState())
    },
  })

  if (!resource) return null

  const accentColor = TYPE_COLORS[resource.type as ResourceType] ?? "#4f6ef7"

  function setField<K extends keyof RevisarState>(key: K, value: RevisarState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!resource) return
    if (reviewMode === "quick") {
      createReview.mutate({
        resourceId:   resource.id,
        learned:      form.quickNote.trim() || "(review rápido)",
        howToApply:   "",
        insights:     [],
        rating:       0,
        masteryLevel: form.masteryLevel,
      })
    } else {
      createReview.mutate({
        resourceId:   resource.id,
        learned:      form.learned,
        howToApply:   form.howToApply,
        insights:     form.insights.split("\n").map(s => s.trim()).filter(Boolean),
        rating:       form.rating,
        masteryLevel: form.masteryLevel,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm(emptyRevisarState()) }}>
      <DialogContent className="max-w-[540px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Revisar recurso</DialogTitle>
            <div className="flex rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden shrink-0">
              {(["quick", "deep"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    reviewMode === mode
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--panel)] text-[var(--ink-2)] hover:bg-[var(--chip)]"
                  )}
                >
                  {mode === "quick" ? "⚡ Quick" : "📝 Deep"}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div
          className="flex gap-3 rounded-[var(--radius-sm)] p-3 border"
          style={{ background: "var(--panel-2)", borderColor: "var(--line)" }}
        >
          <div className="w-1 rounded-full shrink-0 self-stretch" style={{ background: accentColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <CategoryChip type={resource.type as ResourceType} />
            </div>
            <p className="font-semibold text-sm text-[var(--ink)] leading-snug mt-1">{resource.title}</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">{resource.author} · {resource.date}</p>
            {resource.progressPct != null && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${resource.progressPct}%`,
                      background: resource.progressPct >= 80 ? "var(--win)" : resource.progressPct >= 40 ? "#f59e0b" : "var(--loss)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
          {mostRecent && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                onClick={() => setContextExpanded((v) => !v)}
              >
                <span>Último review ({fmtRelativeTime(mostRecent.createdAt)} · Maestría: {mostRecent.masteryLevel}/5)</span>
                {contextExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {contextExpanded && (
                <div className="px-3 pb-3 flex flex-col gap-1.5 text-xs text-[var(--ink-2)]">
                  {mostRecent.learned && (
                    <p><span className="text-[var(--ink-3)]">Aprendiste:</span> &ldquo;{mostRecent.learned}&rdquo;</p>
                  )}
                  {mostRecent.howToApply && (
                    <p><span className="text-[var(--ink-3)]">Ibas a aplicar:</span> &ldquo;{mostRecent.howToApply}&rdquo;</p>
                  )}
                  {mostRecent.insights && mostRecent.insights.length > 0 && (
                    <div>
                      <span className="text-[var(--ink-3)]">Insights:</span>
                      <ul className="mt-0.5 pl-3 list-disc flex flex-col gap-0.5">
                        {mostRecent.insights.map((ins: string, i: number) => <li key={i}>{ins}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {reviewMode === "quick" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                💬 ¿Algo que añadir? (opcional)
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Un insight clave, algo que recordar..."
                value={form.quickNote}
                onChange={(e) => setField("quickNote", e.target.value)}
              />
            </div>
          )}

          {reviewMode === "deep" && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">🧠 ¿Qué aprendiste?</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder="Resume el concepto o lección más importante..."
                  value={form.learned}
                  onChange={(e) => setField("learned", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">🎯 ¿Cómo aplicarlo al trading?</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder="¿Qué cambiarías en tu trading? ¿Algún setup o regla que mejorar?"
                  value={form.howToApply}
                  onChange={(e) => setField("howToApply", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">💡 Insights clave (uno por línea)</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder={"• Insight 1\n• Insight 2\n• Insight 3"}
                  value={form.insights}
                  onChange={(e) => setField("insights", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-[var(--ink-3)]">⭐ Valoración</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setField("rating", star === form.rating ? 0 : star)} className="transition-transform hover:scale-110">
                      <Star size={22} fill={star <= form.rating ? "#f59e0b" : "none"} stroke={star <= form.rating ? "#f59e0b" : "var(--ink-3)"} />
                    </button>
                  ))}
                  {form.rating > 0 && (
                    <span className="self-center text-xs text-[var(--ink-3)] ml-1">
                      {["", "Pobre", "Regular", "Bueno", "Muy bueno", "Excelente"][form.rating]}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-[var(--ink-3)]">🧩 ¿Qué tan bien lo dominas?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setField("masteryLevel", level)}
                  className={cn(
                    "flex-1 h-8 rounded-[var(--radius-sm)] text-xs font-medium transition-colors border",
                    form.masteryLevel === level
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-[var(--panel-2)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]"
                  )}
                  title={MASTERY_LABELS[level]}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--ink-3)] mt-1">
              {MASTERY_LABELS[form.masteryLevel]} · Próximo review: {calcPreviewNextReview(resource.reviewInterval, form.masteryLevel)}
            </p>
          </div>

          {reviews.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">🔗 Vincular a review semanal (opcional)</label>
              <select
                value={form.linkedReviewId}
                onChange={(e) => setField("linkedReviewId", e.target.value)}
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="">— Sin vincular —</option>
                {reviews.map((r) => (
                  <option key={r.id} value={r.id}>{r.weekLabel} · {r.weekRange}</option>
                ))}
              </select>
            </div>
          )}

          <div
            className="flex items-center justify-between rounded-[var(--radius-sm)] p-3"
            style={{ background: form.markDone ? "var(--win-soft)" : "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Marcar como revisado</p>
              <p className="text-[11px] text-[var(--ink-3)]">Lo quitará de la lista de revisión pendiente</p>
            </div>
            <button
              role="switch"
              aria-checked={form.markDone}
              onClick={() => setField("markDone", !form.markDone)}
              className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0",
                form.markDone ? "bg-[var(--win)]" : "bg-[var(--line)]"
              )}
            >
              <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.markDone ? "translate-x-8" : "translate-x-1")} />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={(reviewMode === "deep" && !form.learned.trim()) || createReview.isPending}
          >
            <Check size={13} className="mr-1" />
            {reviewMode === "quick" ? "Guardar review" : "Guardar revisión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

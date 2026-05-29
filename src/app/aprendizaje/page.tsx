"use client"

import { useMemo, useState } from "react"
import { Plus, BookOpen, Video, FileText, BarChart2, Mic, Dumbbell, Wrench, Star, Check, ChevronDown, ChevronUp } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { ResourceDrawer } from "@/components/aprendizaje/resource-drawer"
import { CategoryChip } from "@/components/ui/category-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import type { LearningResource, ResourceType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]
type ReviewFromDB   = RouterOutputs["weeklyReviews"]["list"][number]

// ─── Type helpers ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  LIBRO:       <BookOpen size={20} />,
  VIDEO:       <Video size={20} />,
  NOTA:        <FileText size={20} />,
  BACKTEST:    <BarChart2 size={20} />,
  PODCAST:     <Mic size={20} />,
  DRILL:       <Dumbbell size={20} />,
  HERRAMIENTA: <Wrench size={20} />,
}

const TYPE_EMOJIS: Record<ResourceType, string> = {
  LIBRO:       "📚",
  VIDEO:       "🎬",
  NOTA:        "📝",
  BACKTEST:    "📊",
  PODCAST:     "🎙",
  DRILL:       "🏋",
  HERRAMIENTA: "🔧",
}

const ALL_TYPES: ResourceType[] = [
  "LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA",
]

const PROGRESS_TYPES: ResourceType[] = ["LIBRO", "VIDEO", "PODCAST", "DRILL", "BACKTEST"]

// ─── Empty form state ─────────────────────────────────────────────────────────

interface FormState {
  type:            ResourceType
  title:           string
  author:          string
  source:          string
  date:            string
  notes:           string
  tags:            string
  markedForReview: boolean
  totalUnits:      number | null
  currentUnits:    number | null
  reviewInterval:  number
}

function emptyForm(): FormState {
  return {
    type:            "LIBRO",
    title:           "",
    author:          "",
    source:          "",
    date:            new Date().toISOString().slice(0, 10),
    notes:           "",
    tags:            "",
    markedForReview: false,
    totalUnits:      null,
    currentUnits:    null,
    reviewInterval:  7,
  }
}

// ─── Revisar recurso modal ────────────────────────────────────────────────────

const MASTERY_LABELS: Record<number, string> = {
  1: "Confundido",
  2: "Parcial",
  3: "Entiendo",
  4: "Fluido",
  5: "Dominado",
}

function calcPreviewNextReview(reviewInterval: number | null | undefined, masteryLevel: number): string {
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

function fmtRelativeTime(isoDate: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 7)  return `hace ${diffDays}d`
  const weeks = Math.floor(diffDays / 7)
  if (weeks < 5) return `hace ${weeks} sem`
  return `hace ${Math.floor(diffDays / 30)} mes`
}

function RevisarRecursoModal({
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
            {/* Mode toggle */}
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

        {/* Resource header */}
        <div
          className="flex gap-3 rounded-[var(--radius-sm)] p-3 border"
          style={{ background: "var(--panel-2)", borderColor: "var(--line)" }}
        >
          <div
            className="w-1 rounded-full shrink-0 self-stretch"
            style={{ background: accentColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <CategoryChip type={resource.type as ResourceType} />
            </div>
            <p className="font-semibold text-sm text-[var(--ink)] leading-snug mt-1">
              {resource.title}
            </p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
              {resource.author} · {resource.date}
            </p>
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

          {/* Previous review context (collapsible) */}
          {mostRecent && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                onClick={() => setContextExpanded((v) => !v)}
              >
                <span>
                  Último review ({fmtRelativeTime(mostRecent.createdAt)} · Maestría: {mostRecent.masteryLevel}/5)
                </span>
                {contextExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {contextExpanded && (
                <div className="px-3 pb-3 flex flex-col gap-1.5 text-xs text-[var(--ink-2)]">
                  {mostRecent.learned && (
                    <p><span className="text-[var(--ink-3)]">Aprendiste:</span> "{mostRecent.learned}"</p>
                  )}
                  {mostRecent.howToApply && (
                    <p><span className="text-[var(--ink-3)]">Ibas a aplicar:</span> "{mostRecent.howToApply}"</p>
                  )}
                  {mostRecent.insights && mostRecent.insights.length > 0 && (
                    <div>
                      <span className="text-[var(--ink-3)]">Insights:</span>
                      <ul className="mt-0.5 pl-3 list-disc flex flex-col gap-0.5">
                        {mostRecent.insights.map((ins: string, i: number) => (
                          <li key={i}>{ins}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick mode: note only */}
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

          {/* Deep mode: full form */}
          {reviewMode === "deep" && (
            <>
              {/* ¿Qué aprendiste? */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                  🧠 ¿Qué aprendiste?
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder="Resume el concepto o lección más importante..."
                  value={form.learned}
                  onChange={(e) => setField("learned", e.target.value)}
                />
              </div>

              {/* ¿Cómo aplicarlo? */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                  🎯 ¿Cómo aplicarlo al trading?
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder="¿Qué cambiarías en tu trading? ¿Algún setup o regla que mejorar?"
                  value={form.howToApply}
                  onChange={(e) => setField("howToApply", e.target.value)}
                />
              </div>

              {/* Key insights */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                  💡 Insights clave (uno por línea)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  placeholder={"• Insight 1\n• Insight 2\n• Insight 3"}
                  value={form.insights}
                  onChange={(e) => setField("insights", e.target.value)}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-[var(--ink-3)]">
                  ⭐ Valoración
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setField("rating", star === form.rating ? 0 : star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={22}
                        fill={star <= form.rating ? "#f59e0b" : "none"}
                        stroke={star <= form.rating ? "#f59e0b" : "var(--ink-3)"}
                      />
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

          {/* Mastery level selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-[var(--ink-3)]">
              🧩 ¿Qué tan bien lo dominas?
            </label>
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

          {/* Link to review */}
          {reviews.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-[var(--ink-3)]">
                🔗 Vincular a review semanal (opcional)
              </label>
              <select
                value={form.linkedReviewId}
                onChange={(e) => setField("linkedReviewId", e.target.value)}
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="">— Sin vincular —</option>
                {reviews.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.weekLabel} · {r.weekRange}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mark as reviewed toggle */}
          <div
            className="flex items-center justify-between rounded-[var(--radius-sm)] p-3"
            style={{ background: form.markDone ? "var(--win-soft)" : "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Marcar como revisado</p>
              <p className="text-[11px] text-[var(--ink-3)]">
                Lo quitará de la lista de revisión pendiente
              </p>
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
              <span
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  form.markDone ? "translate-x-8" : "translate-x-1"
                )}
              />
            </button>
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
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

// ─── Setup Impact Modal ───────────────────────────────────────────────────────

function SetupImpactModal({
  resource,
  open,
  onOpenChange,
}: {
  resource: ResourceFromDB | null
  open:     boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: impact = [], isLoading } = trpc.learningResources.setupImpact.useQuery(
    resource?.id ?? "",
    { enabled: open && !!resource }
  )

  if (!resource) return null

  const noCompletedAt = !resource.completedAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>📊 Impacto en trading</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[var(--ink-3)] -mt-2 truncate">{resource.title}</p>

        {noCompletedAt ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">
              Completa este recurso para empezar a medir su impacto en los setups vinculados.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">Calculando…</p>
          </div>
        ) : impact.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--ink-3)]">
              Sin setups vinculados o sin trades para medir.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-[var(--ink-3)]">
              Desde{" "}
              {new Date(impact[0].completedAt).toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
            {impact.map((item) => (
              <div
                key={item.setupId}
                className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] px-3 py-2.5"
              >
                <span className="text-sm font-medium text-[var(--ink)]">{item.setupName}</span>
                <div className="text-right">
                  {item.totalTrades < 5 ? (
                    <div>
                      <p className="text-xs font-mono text-[var(--ink-2)]">
                        {item.totalTrades} trade{item.totalTrades !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[10px] text-[var(--ink-3)]">Pocos datos (≥5)</p>
                    </div>
                  ) : (
                    <div>
                      <p
                        className="text-sm font-mono font-bold"
                        style={{ color: (item.winRate ?? 0) >= 50 ? "var(--win)" : "var(--loss)" }}
                      >
                        {item.winRate}% WR
                      </p>
                      <p className="text-[10px] text-[var(--ink-3)]">
                        {item.wins}/{item.totalTrades} trades
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Link Setup Modal ─────────────────────────────────────────────────────────

function LinkSetupModal({
  resource,
  open,
  onOpenChange,
}: {
  resource: ResourceFromDB | null
  open:     boolean
  onOpenChange: (v: boolean) => void
}) {
  const utils = trpc.useUtils()
  const { data: setups = [] } = trpc.setups.list.useQuery(undefined, { enabled: open })

  const linkSetup = trpc.learningResources.linkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })
  const unlinkSetup = trpc.learningResources.unlinkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  if (!resource) return null
  const linkedIds = new Set(resource.linkedSetups?.map((s) => s.id) ?? [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular a setup</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[var(--ink-3)] -mt-2">
          {resource.title}
        </p>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {setups.length === 0 && (
            <p className="text-sm text-[var(--ink-3)] py-4 text-center">No tienes setups creados.</p>
          )}
          {setups.map((s) => {
            const linked = linkedIds.has(s.id)
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (linked) {
                    unlinkSetup.mutate({ resourceId: resource.id, setupId: s.id })
                  } else {
                    linkSetup.mutate({ resourceId: resource.id, setupId: s.id })
                  }
                }}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm text-left transition-colors border",
                  linked
                    ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-[var(--panel-2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]"
                )}
              >
                <span>{s.name}</span>
                {linked && <Check size={12} />}
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AprendizajePage() {
  const [modalOpen, setModalOpen]             = useState(false)
  const [form, setForm]                       = useState<FormState>(emptyForm())
  const [revisarResource, setRevisarResource]   = useState<ResourceFromDB | null>(null)
  const [editTarget, setEditTarget]             = useState<ResourceFromDB | null>(null)
  const [linkSetupTarget, setLinkSetupTarget]   = useState<ResourceFromDB | null>(null)
  const [impactTarget, setImpactTarget]         = useState<ResourceFromDB | null>(null)
  const [drawerResource, setDrawerResource]     = useState<ResourceFromDB | null>(null)
  const [goalEditing, setGoalEditing]           = useState(false)
  const [goalInput, setGoalInput]               = useState("")

  const { data: rawResources = [], isLoading } = trpc.learningResources.list.useQuery()
  const { data: reviews = [] }                 = trpc.weeklyReviews.list.useQuery()
  const { data: stats }                        = trpc.learningResources.stats.useQuery()
  const utils = trpc.useUtils()

  // Safe cast: router validates type against the same ResourceType enum values
  const resources = rawResources as unknown as LearningResource[]

  const createResource = trpc.learningResources.create.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      setModalOpen(false)
      setForm(emptyForm())
    },
  })

  const updateResource = trpc.learningResources.update.useMutation({
    onSuccess: () => {
      utils.learningResources.list.invalidate()
      setEditTarget(null)
      setModalOpen(false)
      setForm(emptyForm())
    },
  })

  const updateProgress = trpc.learningResources.updateProgress.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const deleteResource = trpc.learningResources.delete.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const updateStatus = trpc.learningResources.updateStatus.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const toggleFavorite = trpc.learningResources.toggleFavorite.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const unlinkSetup = trpc.learningResources.unlinkSetup.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const updateGoal = trpc.learningResources.updateGoal.useMutation({
    onSuccess: () => utils.learningResources.stats.invalidate(),
  })

  const reviewPending = useMemo(() => resources.filter((r) => r.markedForReview), [resources])
  const completed     = useMemo(() => resources.filter((r) => (r.progressPct ?? 0) >= 100), [resources])
  const inProgress    = useMemo(() => resources.filter((r) => r.progressPct != null && r.progressPct < 100), [resources])
  const noProgress    = useMemo(() => resources.filter((r) => r.progressPct == null), [resources])
  const overallPct    = useMemo(() =>
    resources.length
      ? Math.round(resources.reduce((sum, r) => sum + (r.progressPct ?? 0), 0) / resources.length)
      : 0,
    [resources]
  )

  const showProgress = PROGRESS_TYPES.includes(form.type)

  const PROGRESS_LABELS: Record<ResourceType, { current: string; total: string } | null> = {
    VIDEO:       { current: "Minutos vistos",        total: "Duración total (min)" },
    PODCAST:     { current: "Minutos escuchados",    total: "Duración total (min)" },
    LIBRO:       { current: "Página actual",         total: "Total páginas" },
    DRILL:       { current: "Sesiones completadas",  total: "Sesiones objetivo" },
    BACKTEST:    { current: "Sesiones completadas",  total: "Sesiones objetivo" },
    NOTA:        null,
    HERRAMIENTA: null,
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isEditMode = editTarget !== null && modalOpen

  function handleOpen() {
    setEditTarget(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function handleEditOpen(resource: ResourceFromDB) {
    setEditTarget(resource)
    setForm({
      type:            resource.type as ResourceType,
      title:           resource.title,
      author:          resource.author,
      source:          resource.source ?? "",
      date:            resource.date,
      notes:           resource.notes ?? "",
      tags:            resource.tags.join(", "),
      markedForReview: resource.markedForReview,
      totalUnits:      resource.totalUnits ?? null,
      currentUnits:    resource.currentUnits ?? null,
      reviewInterval:  resource.reviewInterval ?? 7,
    })
    setModalOpen(true)
  }

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
    <div
      className="flex"
      style={{ margin: "-28px -32px", minHeight: "100vh" }}
    >
      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto min-w-0"
        style={{ padding: "28px 32px" }}
      >
        {/* TopBar */}
        <TopBar
          title="Aprendizaje"
          subtitle={`${resources.length} recursos · ${reviewPending.length} marcados para review`}
          actions={[
            {
              label:   "Añadir recurso",
              variant: "primary",
              icon:    <Plus size={14} />,
              onClick: handleOpen,
            },
          ]}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-[var(--ink-3)]">Cargando recursos…</p>
          </div>
        ) : (
          <ResourceGrid
              resources={resources}
              onReview={(r) => setRevisarResource(r as unknown as ResourceFromDB)}
              onEdit={(r) => handleEditOpen(r as unknown as ResourceFromDB)}
              onDelete={(id) => deleteResource.mutate(id)}
              onUpdateStatus={(id, status, archiveReason) => updateStatus.mutate({ id, status, ...(archiveReason ? { archiveReason: archiveReason as "irrelevant" | "mastered" | "no_time" } : {}) })}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
              onUpdateProgress={(id, currentUnits) => updateProgress.mutate({ id, currentUnits })}
              onLinkSetup={(r) => setLinkSetupTarget(r as unknown as ResourceFromDB)}
              onUnlinkSetup={(resourceId, setupId) => unlinkSetup.mutate({ resourceId, setupId })}
              onViewImpact={(r) => setImpactTarget(r as unknown as ResourceFromDB)}
              onViewDetail={(r) => setDrawerResource(r as unknown as ResourceFromDB)}
            />
        )}
      </div>

      {/* ── Right rail ───────────────────────────────────────────────────── */}
      <aside
        className="rail-aside"
        style={{
          width:         340,
          flexShrink:    0,
          borderLeft:    "1px solid var(--line)",
          padding:       "24px 20px",
          display:       "flex",
          flexDirection: "column",
          gap:           24,
          overflowY:     "auto",
          background:    "var(--panel)",
          position:      "sticky",
          top:           0,
          height:        "100vh",
        }}
      >
        {/* 1. KPIs reales (stats procedure) */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            Resumen
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total",            value: stats?.totalResources    ?? resources.length },
              { label: "Completados mes",  value: stats?.completedThisMonth ?? completed.length },
              { label: "Horas esta semana",value: stats ? `${stats.estimatedHoursThisWeek}h` : "—" },
              { label: "Reviews urgentes", value: stats?.pendingReviewsCount ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3 text-center"
              >
                <p className="font-mono text-lg font-bold text-[var(--ink)]">{value}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 1b. Meta semanal — TASK-L014 (P16-E configurable) */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            Meta semanal
          </p>
          {(() => {
            const goal = stats?.weeklyGoalMinutes ?? 300
            const done = stats?.minutesThisWeek ?? 0
            const pct  = Math.min(100, Math.round((done / goal) * 100))
            const fmtMin = (m: number) => {
              const h = Math.floor(m / 60); const min = m % 60
              if (h === 0) return `${min}min`
              if (min === 0) return `${h}h`
              return `${h}h ${min}m`
            }
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ink-2)] font-medium">{fmtMin(done)}</span>
                  {goalEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={30}
                        max={10080}
                        autoFocus
                        className="w-16 h-6 px-1.5 text-xs rounded border border-[var(--accent)] bg-[var(--panel-2)] text-[var(--ink)] focus:outline-none"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = parseInt(goalInput, 10)
                            if (!isNaN(v) && v >= 30) updateGoal.mutate(v)
                            setGoalEditing(false); setGoalInput("")
                          }
                          if (e.key === "Escape") { setGoalEditing(false); setGoalInput("") }
                        }}
                      />
                      <span className="text-[10px] text-[var(--ink-3)]">min</span>
                      <button
                        className="text-[10px] text-[var(--accent)] hover:opacity-75"
                        onClick={() => {
                          const v = parseInt(goalInput, 10)
                          if (!isNaN(v) && v >= 30) updateGoal.mutate(v)
                          setGoalEditing(false); setGoalInput("")
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-[10px] text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => { setGoalInput(String(goal)); setGoalEditing(true) }}
                    >
                      Meta: {fmtMin(goal)}
                    </button>
                  )}
                </div>
                <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${pct}%`,
                      background: pct >= 100 ? "var(--win)" : pct >= 60 ? "#f59e0b" : "var(--accent)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-[var(--ink-3)]">
                  {pct >= 100 ? "🎉 ¡Meta alcanzada esta semana!" : `${pct}% completado · lunes a domingo`}
                </p>
              </div>
            )
          })()}
        </section>

        {/* 2. Foco del día */}
        {stats?.focusResource && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
              🎯 Foco del día
            </p>
            <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <CategoryChip type={stats.focusResource.type as ResourceType} />
              </div>
              <p className="text-[12px] font-semibold text-[var(--ink)] leading-snug mt-1 line-clamp-2">
                {stats.focusResource.title}
              </p>
              {stats.focusResource.nextReviewAt && (
                <p className="text-[10px] text-[#b45309] mt-1">
                  ⏰ Review: {new Date(stats.focusResource.nextReviewAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* 3. Reviews urgentes */}
        {stats && stats.urgentReviews.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
              ⚠️ Reviews vencidas
            </p>
            <div className="flex flex-col gap-2">
              {stats.urgentReviews.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0"
                >
                  <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                  <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">
                    {r.title}
                  </p>
                  <button
                    onClick={() => {
                      const match = rawResources.find((x) => x.id === r.id)
                      if (match) setRevisarResource(match as ResourceFromDB)
                    }}
                    className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline"
                  >
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Review pendiente (manual) */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            📚 Marcados para review
          </p>
          {reviewPending.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[11px] text-[var(--ink-3)]">
                Sin recursos marcados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reviewPending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0"
                >
                  <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                  <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">
                    {r.title}
                  </p>
                  <button
                    onClick={() => setRevisarResource(r as unknown as ResourceFromDB)}
                    className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline"
                  >
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. Por tipo */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            Por tipo
          </p>
          <div className="flex flex-col gap-2">
            {ALL_TYPES.map((type) => {
              const count = resources.filter((r) => r.type === type).length
              if (!count) return null
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--ink-3)] w-[84px] shrink-0">
                    {type}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width:      `${(count / resources.length) * 100}%`,
                        background: TYPE_COLORS[type],
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--ink-2)] w-3 text-right shrink-0">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 6. Racha de reviews (P15-E quality streak) */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            🔥 Racha de reviews
          </p>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center font-mono font-bold text-white text-lg shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {stats?.currentStreak ?? 0}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {stats?.currentStreak ?? 0} día{(stats?.currentStreak ?? 0) !== 1 ? "s" : ""} de review
              </p>
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
                Mejor racha: {stats?.bestStreak ?? 0} días
              </p>
            </div>
          </div>
        </section>
      </aside>

      {/* ── Añadir / Editar Recurso Modal ────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) { setEditTarget(null); setForm(emptyForm()) } }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar recurso" : "Añadir recurso"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5">

            {/* Type selector */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2 block">
                Tipo
              </label>
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
                    <span className="text-[8px] font-semibold uppercase tracking-wide leading-none">
                      {t.slice(0, 4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                Título *
              </label>
              <input
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="Ej. Trading in the Zone"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </div>

            {/* Author + Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                  Autor
                </label>
                <input
                  className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Mark Douglas"
                  value={form.author}
                  onChange={(e) => setField("author", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                  Fuente
                </label>
                <input
                  className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Propio / Editorial / URL"
                  value={form.source}
                  onChange={(e) => setField("source", e.target.value)}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                Fecha
              </label>
              <input
                type="date"
                className="h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                Notas
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                placeholder="¿Qué aprendiste? ¿Cómo aplicarlo al trading?"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                Tags
              </label>
              <input
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="futures, ICT, psicologia"
                value={form.tags}
                onChange={(e) => setField("tags", e.target.value)}
              />
              <p className="text-[10px] text-[var(--ink-3)] mt-1">Separados por coma</p>
            </div>

            {/* Contextual progress fields */}
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

            {/* Review interval */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5 block">
                Revisar cada X días
              </label>
              <input
                type="number"
                min={1}
                max={365}
                className="w-full h-9 px-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={form.reviewInterval}
                onChange={(e) => setField("reviewInterval", Math.max(1, Number(e.target.value) || 7))}
              />
              <p className="text-[10px] text-[var(--ink-3)] mt-1">
                Intervalo base para el sistema de repaso espaciado (default: 7)
              </p>
            </div>

            {/* Marcar para review toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Marcar para review</p>
                <p className="text-[11px] text-[var(--ink-3)]">
                  Aparecerá en el panel de revisión
                </p>
              </div>
              <button
                role="switch"
                aria-checked={form.markedForReview}
                onClick={() => setField("markedForReview", !form.markedForReview)}
                className={cn(
                  "relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0",
                  form.markedForReview
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--line)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    form.markedForReview ? "translate-x-8" : "translate-x-1"
                  )}
                />
              </button>
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!form.title.trim() || createResource.isPending || updateResource.isPending}
            >
              {(createResource.isPending || updateResource.isPending) ? "Guardando…" : isEditMode ? "Guardar cambios" : "Guardar recurso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── "Revisar Recurso" Modal ───────────────────────────────────────── */}
      <RevisarRecursoModal
        resource={revisarResource}
        reviews={reviews}
        open={revisarResource !== null}
        onOpenChange={(v) => { if (!v) setRevisarResource(null) }}
      />

      {/* ── "Vincular Setup" Modal ────────────────────────────────────────── */}
      <LinkSetupModal
        resource={linkSetupTarget}
        open={linkSetupTarget !== null}
        onOpenChange={(v) => { if (!v) setLinkSetupTarget(null) }}
      />

      {/* ── "Impacto en Trading" Modal ────────────────────────────────────── */}
      <SetupImpactModal
        resource={impactTarget}
        open={impactTarget !== null}
        onOpenChange={(v) => { if (!v) setImpactTarget(null) }}
      />

      {/* ── Resource Drawer (L023) ───────────────────────────────────────── */}
      <ResourceDrawer
        resource={drawerResource as unknown as LearningResource | null}
        open={drawerResource !== null}
        onClose={() => setDrawerResource(null)}
        onReview={(r) => {
          setDrawerResource(null)
          setRevisarResource(r as unknown as ResourceFromDB)
        }}
        onEdit={(r) => {
          setDrawerResource(null)
          handleEditOpen(r as unknown as ResourceFromDB)
        }}
      />
    </div>
  )
}

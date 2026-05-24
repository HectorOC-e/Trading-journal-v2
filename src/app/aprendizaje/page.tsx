"use client"

import { useMemo, useState } from "react"
import { Plus, BookOpen, Video, FileText, BarChart2, Mic, Dumbbell, Wrench, Star, Check } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
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

const PROGRESS_TYPES: ResourceType[] = ["LIBRO", "VIDEO", "PODCAST", "DRILL"]

// ─── Empty form state ─────────────────────────────────────────────────────────

interface FormState {
  type:          ResourceType
  title:         string
  author:        string
  source:        string
  date:          string
  notes:         string
  tags:          string
  progressPct:   number
  markedForReview: boolean
}

function emptyForm(): FormState {
  return {
    type:           "LIBRO",
    title:          "",
    author:         "",
    source:         "",
    date:           new Date().toISOString().slice(0, 10),
    notes:          "",
    tags:           "",
    progressPct:    0,
    markedForReview: false,
  }
}

// ─── Revisar recurso modal ────────────────────────────────────────────────────

interface RevisarState {
  learned:    string
  howToApply: string
  insights:   string
  rating:     number
  markDone:   boolean
  linkedReviewId: string
}

function emptyRevisarState(): RevisarState {
  return { learned: "", howToApply: "", insights: "", rating: 0, markDone: false, linkedReviewId: "" }
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
  const [form, setForm] = useState<RevisarState>(emptyRevisarState())
  const utils = trpc.useUtils()

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
    createReview.mutate({
      resourceId:   resource.id,
      learned:      form.learned,
      howToApply:   form.howToApply,
      insights:     form.insights.split("\n").map(s => s.trim()).filter(Boolean),
      rating:       form.rating,
      masteryLevel: 3, // TASK-L010 will add the mastery selector
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm(emptyRevisarState()) }}>
      <DialogContent className="max-w-[540px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar recurso</DialogTitle>
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
            disabled={!form.learned.trim() || createReview.isPending}
          >
            <Check size={13} className="mr-1" />
            Guardar revisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AprendizajePage() {
  const [modalOpen, setModalOpen]             = useState(false)
  const [form, setForm]                       = useState<FormState>(emptyForm())
  const [revisarResource, setRevisarResource] = useState<ResourceFromDB | null>(null)
  const [editTarget, setEditTarget]           = useState<ResourceFromDB | null>(null)

  const { data: rawResources = [], isLoading } = trpc.learningResources.list.useQuery()
  const { data: reviews = [] }                 = trpc.weeklyReviews.list.useQuery()
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

  const deleteResource = trpc.learningResources.delete.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const updateStatus = trpc.learningResources.updateStatus.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
  })

  const toggleFavorite = trpc.learningResources.toggleFavorite.useMutation({
    onSuccess: () => utils.learningResources.list.invalidate(),
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
      progressPct:     resource.progressPct ?? 0,
      markedForReview: resource.markedForReview,
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
      progressPct:     showProgress ? form.progressPct : undefined,
      markedForReview: form.markedForReview,
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
              onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
              onToggleFavorite={(id) => toggleFavorite.mutate(id)}
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
        {/* 1. Progreso general */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            Progreso general
          </p>

          {/* Overall bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--ink-2)]">
                {completed.length} / {resources.length} completados
              </span>
              <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">
                {overallPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:      `${overallPct}%`,
                  background: overallPct >= 80
                    ? "var(--win)"
                    : overallPct >= 40
                      ? "#f59e0b"
                      : "var(--loss)",
                }}
              />
            </div>
          </div>

          {/* 2×2 stat chips */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total",        value: resources.length },
              { label: "Completados",  value: completed.length },
              { label: "En progreso",  value: inProgress.length },
              { label: "Sin progreso", value: noProgress.length },
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

        {/* 2. Review pendiente */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            📚 Review pendiente
          </p>
          {reviewPending.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[11px] text-[var(--ink-3)]">
                Sin recursos pendientes de review.
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

        {/* 3. Por tipo */}
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

        {/* 4. Racha de aprendizaje — kept as informational placeholder */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">
            Racha de aprendizaje
          </p>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center font-mono font-bold text-white text-lg shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {resources.length}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {resources.length} recursos añadidos
              </p>
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
                Sigue aprendiendo cada día.
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

            {/* Progress slider — only for eligible types */}
            {showProgress && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                    Progreso
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">
                    {form.progressPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progressPct}
                  onChange={(e) => setField("progressPct", Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${form.progressPct}%`,
                      background: form.progressPct >= 80
                        ? "var(--win)"
                        : form.progressPct >= 40
                          ? "#f59e0b"
                          : "var(--loss)",
                    }}
                  />
                </div>
              </div>
            )}

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
    </div>
  )
}

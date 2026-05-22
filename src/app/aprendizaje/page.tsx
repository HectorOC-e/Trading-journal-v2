"use client"

import { useState } from "react"
import { Plus, BookOpen, Video, FileText, BarChart2, Mic, Dumbbell, Wrench } from "lucide-react"
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
import { mockResources } from "@/mock-data"
import { cn } from "@/lib/utils"
import type { ResourceType } from "@/types"

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

// ─── Streak mock data ─────────────────────────────────────────────────────────

const STREAK_DAYS = 7
const LAST_14: boolean[] = [
  false, true, false, true, true, false, true,
  true,  true, false, true, true, true,  true,
]

// ─── Stats derived from mock data ─────────────────────────────────────────────

const reviewPending = mockResources.filter((r) => r.markedForReview)
const completed     = mockResources.filter((r) => (r.progressPct ?? 0) >= 100)
const inProgress    = mockResources.filter(
  (r) => r.progressPct !== undefined && r.progressPct < 100
)
const noProgress    = mockResources.filter(
  (r) => r.progressPct === undefined
)
const overallPct = mockResources.length
  ? Math.round(
      mockResources.reduce((sum, r) => sum + (r.progressPct ?? 0), 0) /
        mockResources.length
    )
  : 0

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AprendizajePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<FormState>(emptyForm())

  const showProgress = PROGRESS_TYPES.includes(form.type)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleOpen() {
    setForm(emptyForm())
    setModalOpen(true)
  }

  function handleSave() {
    // In a real app: persist form data
    setModalOpen(false)
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
          subtitle={`${mockResources.length} recursos · ${reviewPending.length} marcados para review`}
          actions={[
            {
              label:   "Añadir recurso",
              variant: "primary",
              icon:    <Plus size={14} />,
              onClick: handleOpen,
            },
          ]}
        />

        {/* Resource grid */}
        <ResourceGrid resources={mockResources} />
      </div>

      {/* ── Right rail ───────────────────────────────────────────────────── */}
      <aside
        style={{
          width:       340,
          flexShrink:  0,
          borderLeft:  "1px solid var(--line)",
          padding:     "24px 20px",
          display:     "flex",
          flexDirection: "column",
          gap:         24,
          overflowY:   "auto",
          background:  "var(--panel)",
          position:    "sticky",
          top:         0,
          height:      "100vh",
        }}
      >
        {/* 1. Progreso general */}
        <section>
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3"
          >
            Progreso general
          </p>

          {/* Overall bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--ink-2)]">
                {completed.length} / {mockResources.length} completados
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
              { label: "Total",        value: mockResources.length },
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
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3"
          >
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
                  <CategoryChip type={r.type} className="shrink-0" />
                  <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">
                    {r.title}
                  </p>
                  <button className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline">
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Por tipo — horizontal bar chart */}
        <section>
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3"
          >
            Por tipo
          </p>
          <div className="flex flex-col gap-2">
            {ALL_TYPES.map((type) => {
              const count = mockResources.filter((r) => r.type === type).length
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
                        width:      `${(count / mockResources.length) * 100}%`,
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

        {/* 4. Racha de aprendizaje */}
        <section>
          <p
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3"
          >
            Racha de aprendizaje
          </p>

          {/* Streak badge */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center font-mono font-bold text-white text-lg shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {STREAK_DAYS}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {STREAK_DAYS} días de racha
              </p>
              <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
                ¡Sigue así!
              </p>
            </div>
          </div>

          {/* Calendar dots — last 14 days */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {LAST_14.map((active, i) => (
              <div
                key={i}
                title={active ? "Activo" : "Sin actividad"}
                className="h-5 w-full rounded-sm transition-colors"
                style={{
                  background: active ? "var(--accent)" : "var(--line)",
                  opacity:    active ? 1 : 0.5,
                }}
              />
            ))}
          </div>

          <p className="text-[11px] text-[var(--ink-3)]">
            Mantén la racha añadiendo un recurso hoy.
          </p>
        </section>
      </aside>

      {/* ── "Añadir Recurso" Modal ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Añadir recurso</DialogTitle>
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
              disabled={!form.title.trim()}
            >
              Guardar recurso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

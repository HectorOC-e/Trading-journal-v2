"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, LayoutGrid, List } from "lucide-react"
import { FilterBar } from "@/components/ui/filter-bar"
import { ResourceCard } from "@/components/aprendizaje/resource-card"
import { ResourceListRow } from "@/components/aprendizaje/resource-list-row"
import { Stagger, StaggerItem } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import type { LearningResource, ResourceStatus, ResourceType } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "TODOS",       label: "Todos" },
  { value: "LIBRO",       label: "Libro" },
  { value: "VIDEO",       label: "Video" },
  { value: "NOTA",        label: "Nota" },
  { value: "BACKTEST",    label: "Backtest" },
  { value: "PODCAST",     label: "Podcast" },
  { value: "DRILL",       label: "Drill" },
  { value: "HERRAMIENTA", label: "Herramienta" },
]

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: "PENDING",     label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED",   label: "Completado" },
  { value: "IN_REVIEW",   label: "Revisar" },
  { value: "MASTERED",    label: "Dominado" },
]

type SortKey = "recent" | "progress" | "type"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent",   label: "Más reciente" },
  { value: "progress", label: "Progreso" },
  { value: "type",     label: "Tipo" },
]

function sortResources(resources: LearningResource[], key: SortKey): LearningResource[] {
  const copy = [...resources]
  if (key === "recent") {
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  if (key === "progress") {
    return copy.sort((a, b) => (b.progressPct ?? -1) - (a.progressPct ?? -1))
  }
  if (key === "type") {
    return copy.sort((a, b) => a.type.localeCompare(b.type))
  }
  return copy
}

interface ResourceGridProps {
  resources:          LearningResource[]
  className?:         string
  onReview?:          (resource: LearningResource) => void
  onEdit?:            (resource: LearningResource) => void
  onDelete?:          (id: string) => void
  onUpdateStatus?:    (id: string, status: ResourceStatus, archiveReason?: string) => void
  onToggleFavorite?:  (id: string) => void
  onUpdateProgress?:  (id: string, currentUnits: number) => void
  onLinkSetup?:       (resource: LearningResource) => void
  onUnlinkSetup?:     (resourceId: string, setupId: string) => void
  onViewImpact?:      (resource: LearningResource) => void
  onViewDetail?:      (resource: LearningResource) => void
}

export function ResourceGrid({
  resources,
  className,
  onReview,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleFavorite,
  onUpdateProgress,
  onLinkSetup,
  onUnlinkSetup,
  onViewImpact,
  onViewDetail,
}: ResourceGridProps) {
  // View mode — persisted in localStorage (TASK-L032)
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid"
    return (localStorage.getItem("resource-view-mode") as "grid" | "list") ?? "grid"
  })

  function switchView(mode: "grid" | "list") {
    setViewMode(mode)
    localStorage.setItem("resource-view-mode", mode)
  }

  // Basic filters
  const [search, setSearch]             = useState("")
  const [category, setCategory]         = useState("TODOS")
  const [onlyReview, setOnlyReview]     = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sort, setSort]                 = useState<SortKey>("recent")

  // Advanced filters
  const [advancedOpen, setAdvancedOpen]       = useState(false)
  const [statusFilter, setStatusFilter]       = useState<ResourceStatus[]>([])
  const [tagFilter, setTagFilter]             = useState<string[]>([])
  const [onlyFavorites, setOnlyFavorites]     = useState(false)
  const [onlyNoReviews, setOnlyNoReviews]     = useState(false)

  const allTags = useMemo(
    () => Array.from(new Set(resources.flatMap(r => r.tags))).sort(),
    [resources]
  )

  const hasAdvancedFilter = statusFilter.length > 0 || tagFilter.length > 0 || onlyFavorites || onlyNoReviews

  function toggleStatus(s: ResourceStatus) {
    setStatusFilter(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  function toggleTag(t: string) {
    setTagFilter(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  function clearAdvanced() {
    setStatusFilter([])
    setTagFilter([])
    setOnlyFavorites(false)
    setOnlyNoReviews(false)
  }

  const filtered = sortResources(
    resources.filter((r) => {
      // Archived view: only ABANDONED; normal view: exclude ABANDONED
      if (showArchived) return r.status === "ABANDONED"
      if (r.status === "ABANDONED") return false

      const q = search.toLowerCase()
      const matchSearch =
        q === "" ||
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      const matchCategory  = category === "TODOS" || r.type === (category as ResourceType)
      const matchReview    = !onlyReview || r.markedForReview
      const matchStatus    = statusFilter.length === 0 || statusFilter.includes(r.status as ResourceStatus)
      const matchTag       = tagFilter.length === 0 || tagFilter.every(t => r.tags.includes(t))
      const matchFavorites = !onlyFavorites || r.isFavorite
      const matchNoReviews = !onlyNoReviews || !r.lastReviewAt

      return matchSearch && matchCategory && matchReview && matchStatus && matchTag && matchFavorites && matchNoReviews
    }),
    sort
  )

  const isFiltered = category !== "TODOS" || onlyReview || search !== "" || hasAdvancedFilter

  return (
    <div className={cn("flex flex-col gap-4", className)}>

      {/* Row 1: Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none"
        />
        <input
          className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          placeholder="Buscar por título, autor, notas o tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Row 2: FilterBar + toggles + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterBar options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />

        <button
          onClick={() => setOnlyReview((v) => !v)}
          className={cn(
            "h-7 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
            onlyReview
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)]"
          )}
        >
          Solo review
        </button>

        <button
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            "h-7 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
            showArchived
              ? "bg-[var(--ink-3)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)]"
          )}
        >
          Archivados
        </button>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className={cn(
            "h-7 px-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap",
            hasAdvancedFilter
              ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)]"
          )}
        >
          <SlidersHorizontal size={10} />
          Más filtros
          {hasAdvancedFilter && <span className="bg-[var(--accent)] text-white text-[9px] px-1 rounded-full leading-none py-0.5">{statusFilter.length + tagFilter.length + (onlyFavorites ? 1 : 0) + (onlyNoReviews ? 1 : 0)}</span>}
          {advancedOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {/* View mode toggle */}
        <div className="flex rounded-[var(--radius-sm)] border border-[var(--line)] overflow-hidden shrink-0">
          {(["grid", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => switchView(mode)}
              title={mode === "grid" ? "Vista grid" : "Vista lista"}
              className={cn(
                "h-7 w-7 flex items-center justify-center transition-colors",
                viewMode === mode
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
              )}
            >
              {mode === "grid" ? <LayoutGrid size={12} /> : <List size={12} />}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none h-7 pl-3 pr-7 rounded-[var(--radius-sm)] text-xs bg-[var(--chip)] border border-[var(--line)] text-[var(--ink-2)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none"
          />
        </div>
      </div>

      {/* Advanced filters panel */}
      {advancedOpen && (
        <div className="flex flex-col gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)]">

          {/* Status filter */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-1.5">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleStatus(s.value)}
                  className={cn(
                    "h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                    statusFilter.includes(s.value)
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-[var(--chip)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setOnlyFavorites((v) => !v)}
              className={cn(
                "h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                onlyFavorites
                  ? "bg-[#f59e0b] text-white border-[#f59e0b]"
                  : "bg-[var(--chip)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]"
              )}
            >
              Favoritos
            </button>
            <button
              onClick={() => setOnlyNoReviews((v) => !v)}
              className={cn(
                "h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                onlyNoReviews
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "bg-[var(--chip)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]"
              )}
            >
              Sin reviews
            </button>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "h-6 px-2 rounded text-[10px] transition-colors border",
                      tagFilter.includes(t)
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "bg-[var(--chip)] text-[var(--ink-3)] border-[var(--line)] hover:border-[var(--accent)]"
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear button */}
          {hasAdvancedFilter && (
            <button
              onClick={clearAdvanced}
              className="self-start text-[10px] text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors underline"
            >
              Limpiar filtros avanzados
            </button>
          )}
        </div>
      )}

      {/* Resource count */}
      <p className="text-[11px] text-[var(--ink-3)]">
        {filtered.length} {filtered.length === 1 ? "recurso" : "recursos"}
        {isFiltered ? " (filtrado)" : ""}
      </p>

      {/* Resource display */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--ink-3)]">
          No hay recursos con estos filtros.
        </div>
      ) : viewMode === "list" ? (
        /* List view — compact 36px rows (TASK-L032) */
        <div className="flex flex-col">
          {/* Header row */}
          <div className="flex items-center gap-2 h-7 px-3 mb-1">
            <span className="w-[52px] shrink-0" />
            <span className="flex-1 text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)]">Título</span>
            <span className="w-14 shrink-0" />
            <span className="w-[64px] text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)] text-right">Estado</span>
            <span className="w-[52px] text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)] text-right">Review</span>
          </div>
          <Stagger className="flex flex-col">
            {filtered.map((r) => (
              <StaggerItem key={r.id}>
                <ResourceListRow resource={r} onClick={() => onViewDetail?.(r)} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      ) : (
        /* Grid view — 1-col mobile, 2-col md+ */
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <StaggerItem key={r.id}>
              <ResourceCard
                resource={r}
                onReview={onReview}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateStatus={onUpdateStatus}
                onToggleFavorite={onToggleFavorite}
                onUpdateProgress={onUpdateProgress}
                onLinkSetup={onLinkSetup}
                onUnlinkSetup={onUnlinkSetup}
                onViewImpact={onViewImpact}
                onViewDetail={onViewDetail}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

    </div>
  )
}

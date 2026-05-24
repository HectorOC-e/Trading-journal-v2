"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import { FilterBar } from "@/components/ui/filter-bar"
import { ResourceCard } from "@/components/aprendizaje/resource-card"
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
  onUpdateStatus?:    (id: string, status: ResourceStatus) => void
  onToggleFavorite?:  (id: string) => void
  onUpdateProgress?:  (id: string, currentUnits: number) => void
  onLinkSetup?:       (resource: LearningResource) => void
  onUnlinkSetup?:     (resourceId: string, setupId: string) => void
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
}: ResourceGridProps) {
  const [search, setSearch]         = useState("")
  const [category, setCategory]     = useState("TODOS")
  const [onlyReview, setOnlyReview] = useState(false)
  const [sort, setSort]             = useState<SortKey>("recent")

  const filtered = sortResources(
    resources.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch =
        q === "" ||
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      const matchCategory = category === "TODOS" || r.type === (category as ResourceType)
      const matchReview   = !onlyReview || r.markedForReview
      return matchSearch && matchCategory && matchReview
    }),
    sort
  )

  const isFiltered = category !== "TODOS" || onlyReview || search !== ""

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

      {/* Row 2: FilterBar + review toggle + sort */}
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

      {/* Resource count */}
      <p className="text-[11px] text-[var(--ink-3)]">
        {filtered.length} {filtered.length === 1 ? "recurso" : "recursos"}
        {isFiltered ? " (filtrado)" : ""}
      </p>

      {/* Grid: single col on mobile, 2-col on md+ */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--ink-3)]">
          No hay recursos con estos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <ResourceCard
                key={r.id}
                resource={r}
                onReview={onReview}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateStatus={onUpdateStatus}
                onToggleFavorite={onToggleFavorite}
                onUpdateProgress={onUpdateProgress}
                onLinkSetup={onLinkSetup}
                onUnlinkSetup={onUnlinkSetup}
              />
          ))}
        </div>
      )}

    </div>
  )
}

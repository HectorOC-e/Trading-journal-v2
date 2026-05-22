// ResourceGrid organism — spec: Aprendizaje screen
// Composes: search input + FilterBar (category) + 2-col ResourceCard grid

"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { FilterBar } from "@/components/ui/filter-bar"
import { ResourceCard } from "@/components/aprendizaje/resource-card"
import { cn } from "@/lib/utils"
import type { LearningResource, ResourceType } from "@/types"

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

interface ResourceGridProps {
  resources: LearningResource[]
  className?: string
}

export function ResourceGrid({ resources, className }: ResourceGridProps) {
  const [search, setSearch]         = useState("")
  const [category, setCategory]     = useState("TODOS")
  const [onlyReview, setOnlyReview] = useState(false)

  const filtered = resources.filter((r) => {
    const matchSearch = search === "" ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.author.toLowerCase().includes(search.toLowerCase()) ||
      r.notes.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = category === "TODOS" || r.type === (category as ResourceType)
    const matchReview   = !onlyReview || r.markedForReview
    return matchSearch && matchCategory && matchReview
  })

  return (
    <div className={cn("flex flex-col gap-4", className)}>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-sm)] text-sm bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            placeholder="Buscar por título, autor, notas o tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterBar options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        <button
          onClick={() => setOnlyReview((v) => !v)}
          className={cn(
            "h-7 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
            onlyReview
              ? "bg-[var(--be)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
          )}
        >
          Solo marcadas para review
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--ink-3)]">
          No hay recursos con estos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

    </div>
  )
}

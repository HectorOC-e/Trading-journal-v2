// Aprendizaje screen — spec: design-spec/aprendizaje.html
// Shell: Sidebar (layout) + main (ResourceGrid) + right rail (stats)

import { Plus } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { ResourceGrid } from "@/components/aprendizaje/resource-grid"
import { mockResources } from "@/mock-data"

const reviewPending = mockResources.filter((r) => r.markedForReview)
const completed     = mockResources.filter((r) => (r.progressPct ?? 0) >= 100)
const inProgress    = mockResources.filter((r) => r.progressPct !== undefined && (r.progressPct ?? 0) < 100)

export default function AprendizajePage() {
  return (
    <div className="flex h-full">
      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <TopBar
          title="Aprendizaje"
          subtitle={`${mockResources.length} entradas · ${reviewPending.length} marcadas para review`}
          actions={[{ label: "Añadir recurso", variant: "primary" as const, icon: <Plus size={14} /> }]}
        />
        <ResourceGrid resources={mockResources} />
      </div>

      {/* Right rail — stats */}
      <aside className="w-72 shrink-0 border-l border-[var(--line)] p-4 flex flex-col gap-5 overflow-y-auto bg-[var(--panel)]">

        {/* Progreso general */}
        <div>
          <p className="text-eyebrow mb-3">Progreso General</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total",       value: mockResources.length },
              { label: "Completados", value: completed.length },
              { label: "En progreso", value: inProgress.length },
              { label: "Sin progreso",value: mockResources.length - completed.length - inProgress.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3 text-center">
                <p className="font-mono text-lg font-bold text-[var(--ink)]">{value}</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Review pendiente */}
        {reviewPending.length > 0 && (
          <div>
            <p className="text-eyebrow mb-3">Review Pendiente</p>
            <div className="flex flex-col gap-2">
              {reviewPending.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--line)] last:border-0">
                  <p className="text-xs text-[var(--ink)] leading-snug flex-1">{r.title}</p>
                  <button className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline">
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Por categoría */}
        <div>
          <p className="text-eyebrow mb-3">Por Categoría</p>
          <div className="flex flex-col gap-1.5">
            {(["LIBRO","VIDEO","NOTA","BACKTEST","PODCAST","DRILL","HERRAMIENTA"] as const).map((type) => {
              const count = mockResources.filter((r) => r.type === type).length
              if (!count) return null
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--ink-3)] w-20 shrink-0">{type}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(count / mockResources.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--ink-2)] w-3">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

      </aside>
    </div>
  )
}

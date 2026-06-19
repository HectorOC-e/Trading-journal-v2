"use client"

import { Play } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { CategoryChip } from "@/components/ui/category-chip"
import { useStudySessionStore } from "@/lib/study-session-store"
import { FadeIn } from "@/components/ui/motion"
import type { LearningResource, ResourceType } from "@/types"
import type { RouterOutputs } from "@/server/trpc/root"

type ResourceFromDB = RouterOutputs["learningResources"]["list"][number]

const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}
const ALL_TYPES: ResourceType[] = ["LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA"]

const Card = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4">
    <div className="mb-3">{typeof title === "string" ? <p className="text-eyebrow">{title}</p> : title}</div>
    {children}
  </div>
)

/**
 * The genuinely-unique pieces of the old "Progreso" tab, laid out as a
 * full-width grid and merged into the "Hoy" tab. Duplicates of Hoy (Racha de
 * reviews, Meta semanal, Resumen) were dropped. The reviews block reuses the
 * single session launcher (`openPicker`) — no separate "Iniciar sesión".
 */
export function ProgresoSections({
  resources,
  reviewPending,
  rawResources,
  onRevisarResource,
}: {
  resources:         LearningResource[]
  reviewPending:     LearningResource[]
  rawResources:      ResourceFromDB[]
  onRevisarResource: (r: ResourceFromDB) => void
}) {
  const { openPicker } = useStudySessionStore()
  const { data: stats }              = trpc.learningResources.stats.useQuery()
  const { data: dailyInsight }       = trpc.learningResources.dailyInsight.useQuery()
  const { data: impactRanking = [] } = trpc.learningResources.resourceImpactRanking.useQuery()

  const urgent = stats?.urgentReviews ?? []
  const totalResources = resources.length || 1

  return (
    <FadeIn>
      <section className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow">Progreso</p>
        </div>

        {/* Decay notice */}
        {stats && stats.decayedCount > 0 && (
          <div className="rounded-[var(--radius-sm)] border border-[#f59e0b] bg-[#fef3c7] px-3 py-2">
            <p className="text-[11px] font-medium text-[#92400e] leading-snug">
              ⚠️ {stats.decayedCount} recurso{stats.decayedCount !== 1 ? "s" : ""} marcado{stats.decayedCount !== 1 ? "s" : ""} como <strong>Dominado</strong> volvieron a <strong>Revisar</strong> por inactividad.
            </p>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Reviews vencidas — unified session launcher */}
          {urgent.length > 0 && (
            <Card title={
              <div className="flex items-center justify-between">
                <p className="text-eyebrow text-[var(--loss)]">⚠️ Reviews vencidas · {urgent.length}</p>
                <button onClick={openPicker}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-colors active:scale-95">
                  <Play size={11} className="fill-current" /> Iniciar sesión
                </button>
              </div>
            }>
              <div className="flex flex-col">
                {urgent.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0">
                    <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                    <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">{r.title}</p>
                    <button
                      onClick={() => { const m = rawResources.find((x) => x.id === r.id); if (m) onRevisarResource(m) }}
                      className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline active:scale-95 transition">
                      Revisar
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Marcados para review */}
          <Card title="📚 Marcados para review">
            {reviewPending.length === 0 ? (
              <p className="text-[11px] text-[var(--ink-3)] py-2">Sin recursos marcados.</p>
            ) : (
              <div className="flex flex-col">
                {reviewPending.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0">
                    <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                    <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">{r.title}</p>
                    <button
                      onClick={() => onRevisarResource(r as unknown as ResourceFromDB)}
                      className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline active:scale-95 transition">
                      Revisar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Impacto en trading */}
          {impactRanking.length > 0 && (
            <Card title="Impacto en trading">
              <div className="flex flex-col gap-1.5">
                {impactRanking.slice(0, 5).map((row) => (
                  <div key={`${row.resourceId}-${row.setupId}`}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] px-2.5 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[var(--ink)] truncate leading-snug">{row.resourceTitle}</p>
                      <p className="text-[9px] text-[var(--ink-3)] truncate">{row.setupName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {row.lowConfidence ? (
                        <div><p className="text-[10px] font-mono text-[var(--ink-2)]">{row.postWinRate}% WR</p><p className="text-[9px] text-[var(--ink-3)]">pocos datos</p></div>
                      ) : row.delta !== null ? (
                        <p className="text-xs font-mono font-bold" style={{ color: row.delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                          {row.delta >= 0 ? "+" : ""}{row.delta}% {row.delta >= 0 ? "↑" : "↓"}
                          <span className="block text-[9px] font-normal text-[var(--ink-3)]">n={row.postTrades}</span>
                        </p>
                      ) : (
                        <div><p className="text-[10px] font-mono text-[var(--ink-2)]">{row.postWinRate}% WR</p><p className="text-[9px] text-[var(--ink-3)]">sin datos previos</p></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Por tipo */}
          <Card title="Por tipo">
            <div className="flex flex-col gap-2">
              {ALL_TYPES.map((type) => {
                const count = resources.filter((r) => r.type === type).length
                if (!count) return null
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--ink-3)] w-[84px] shrink-0">{type}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                      <div className="h-full rounded-full transition-[width]" style={{ width: `${(count / totalResources) * 100}%`, background: TYPE_COLORS[type] }} />
                    </div>
                    <span className="text-[10px] font-mono text-[var(--ink-2)] w-3 text-right shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Insight del día */}
          {dailyInsight && (
            <Card title="Insight del día">
              <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
                <p className="text-sm text-[var(--ink)] leading-relaxed italic">&ldquo;{dailyInsight.text}&rdquo;</p>
                <p className="text-[10px] text-[var(--ink-3)] mt-2 text-right">— {dailyInsight.resourceTitle}</p>
              </div>
            </Card>
          )}

          {/* Foco del día */}
          {stats?.focusResource && (
            <Card title="Foco del día">
              <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
                <CategoryChip type={stats.focusResource.type as ResourceType} />
                <p className="text-[12px] font-semibold text-[var(--ink)] leading-snug mt-1.5 line-clamp-2">{stats.focusResource.title}</p>
                {stats.focusResource.nextReviewAt && (
                  <p className="text-[10px] text-[#b45309] mt-1">⏰ Review: {new Date(stats.focusResource.nextReviewAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </section>
    </FadeIn>
  )
}

"use client"

import { useState } from "react"
import { CategoryChip } from "@/components/ui/category-chip"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
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

const ALL_TYPES: ResourceType[] = [
  "LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA",
]

function fmtMin(m: number): string {
  const h = Math.floor(m / 60); const min = m % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h ${min}m`
}

export function ResourceRightRail({
  resources,
  rawResources,
  reviewPending,
  completed,
  onStartSession,
  onRevisarResource,
}: {
  resources:        LearningResource[]
  rawResources:     ResourceFromDB[]
  reviewPending:    LearningResource[]
  completed:        LearningResource[]
  onStartSession:   () => void
  onRevisarResource: (r: ResourceFromDB) => void
}) {
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalInput,   setGoalInput]   = useState("")

  const { data: stats }         = trpc.learningResources.stats.useQuery()
  const { data: dailyInsight }  = trpc.learningResources.dailyInsight.useQuery()
  const { data: impactRanking = [] } = trpc.learningResources.resourceImpactRanking.useQuery()
  const utils = trpc.useUtils()

  const updateGoal = trpc.learningResources.updateGoal.useMutation({
    onSuccess: () => utils.learningResources.stats.invalidate(),
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  return (
    <aside
      style={{
        width: "100%",
        padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 24,
        background: "var(--panel)",
      }}
    >
      {/* Resumen */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Resumen</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total",            value: stats?.totalResources    ?? resources.length },
            { label: "Completados mes",  value: stats?.completedThisMonth ?? completed.length },
            { label: "Horas esta semana",value: stats ? `${stats.estimatedHoursThisWeek}h` : "—" },
            { label: "Reviews urgentes", value: stats?.pendingReviewsCount ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3 text-center">
              <p className="font-mono text-lg font-bold text-[var(--ink)]">{value}</p>
              <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Meta semanal */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Meta semanal</p>
        {(() => {
          const goal = stats?.weeklyGoalMinutes ?? 300
          const done = stats?.minutesThisWeek   ?? 0
          const pct  = Math.min(100, Math.round((done / goal) * 100))
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--ink-2)] font-medium">{fmtMin(done)}</span>
                {goalEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={30} max={10080} autoFocus
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
                    >✓</button>
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
                  style={{ width: `${pct}%`, background: pct >= 100 ? "var(--win)" : pct >= 60 ? "#f59e0b" : "var(--accent)" }}
                />
              </div>
              <p className="text-[10px] text-[var(--ink-3)]">
                {pct >= 100 ? "🎉 ¡Meta alcanzada esta semana!" : `${pct}% completado · lunes a domingo`}
              </p>
            </div>
          )
        })()}
      </section>

      {/* Insight del día */}
      {dailyInsight && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Insight del día</p>
          <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
            <p className="text-sm text-[var(--ink)] leading-relaxed italic">&ldquo;{dailyInsight.text}&rdquo;</p>
            <p className="text-[10px] text-[var(--ink-3)] mt-2 text-right">— {dailyInsight.resourceTitle}</p>
          </div>
        </section>
      )}

      {/* Impacto en trading */}
      {impactRanking.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Impacto en trading</p>
          <div className="flex flex-col gap-1.5">
            {impactRanking.slice(0, 5).map((row) => (
              <div
                key={`${row.resourceId}-${row.setupId}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] px-2.5 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-[var(--ink)] truncate leading-snug">{row.resourceTitle}</p>
                  <p className="text-[9px] text-[var(--ink-3)] truncate">{row.setupName}</p>
                </div>
                <div className="text-right shrink-0">
                  {row.lowConfidence ? (
                    <div>
                      <p className="text-[10px] font-mono text-[var(--ink-2)]">{row.postWinRate}% WR</p>
                      <p className="text-[9px] text-[var(--ink-3)]">pocos datos</p>
                    </div>
                  ) : row.delta !== null ? (
                    <p className="text-xs font-mono font-bold" style={{ color: row.delta >= 0 ? "var(--win)" : "var(--loss)" }}>
                      {row.delta >= 0 ? "+" : ""}{row.delta}% {row.delta >= 0 ? "↑" : "↓"}
                      <span className="block text-[9px] font-normal text-[var(--ink-3)]">n={row.postTrades}</span>
                    </p>
                  ) : (
                    <div>
                      <p className="text-[10px] font-mono text-[var(--ink-2)]">{row.postWinRate}% WR</p>
                      <p className="text-[9px] text-[var(--ink-3)]">sin datos previos</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Foco del día */}
      {stats?.focusResource && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Foco del día</p>
          <div className="rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <CategoryChip type={stats.focusResource.type as ResourceType} />
            </div>
            <p className="text-[12px] font-semibold text-[var(--ink)] leading-snug mt-1 line-clamp-2">{stats.focusResource.title}</p>
            {stats.focusResource.nextReviewAt && (
              <p className="text-[10px] text-[#b45309] mt-1">
                ⏰ Review: {new Date(stats.focusResource.nextReviewAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Decay notification */}
      {stats && stats.decayedCount > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[#f59e0b] bg-[#fef3c7] px-3 py-2">
          <p className="text-[11px] font-medium text-[#92400e] leading-snug">
            ⚠️ {stats.decayedCount} recurso{stats.decayedCount !== 1 ? "s" : ""} marcado{stats.decayedCount !== 1 ? "s" : ""} como <strong>Dominado</strong> volvieron a <strong>Revisar</strong> por inactividad.
          </p>
        </div>
      )}

      {/* Reviews urgentes */}
      {stats && stats.urgentReviews.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)]">⚠️ Reviews vencidas</p>
            {stats.urgentReviews.length >= 2 && (
              <button
                onClick={onStartSession}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                ▶ Iniciar sesión
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {stats.urgentReviews.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0">
                <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">{r.title}</p>
                <button
                  onClick={() => {
                    const match = rawResources.find((x) => x.id === r.id)
                    if (match) onRevisarResource(match)
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

      {/* Marcados para review */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">📚 Marcados para review</p>
        {reviewPending.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[11px] text-[var(--ink-3)]">Sin recursos marcados.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reviewPending.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-2 border-b border-[var(--line)] last:border-0">
                <CategoryChip type={r.type as ResourceType} className="shrink-0" />
                <p className="text-[11px] text-[var(--ink)] leading-snug flex-1 truncate">{r.title}</p>
                <button
                  onClick={() => onRevisarResource(r as unknown as ResourceFromDB)}
                  className="text-[11px] font-medium text-[var(--accent)] shrink-0 hover:underline"
                >
                  Revisar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Por tipo */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Por tipo</p>
        <div className="flex flex-col gap-2">
          {ALL_TYPES.map((type) => {
            const count = resources.filter((r) => r.type === type).length
            if (!count) return null
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--ink-3)] w-[84px] shrink-0">{type}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(count / resources.length) * 100}%`, background: TYPE_COLORS[type] }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--ink-2)] w-3 text-right shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Racha de reviews */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] mb-3">Racha de reviews</p>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full flex items-center justify-center font-mono font-bold text-white text-lg shrink-0" style={{ background: "var(--accent)" }}>
            {stats?.currentStreak ?? 0}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">{stats?.currentStreak ?? 0} día{(stats?.currentStreak ?? 0) !== 1 ? "s" : ""} de review</p>
            <p className="text-[11px] text-[var(--ink-3)] mt-0.5">Mejor racha: {stats?.bestStreak ?? 0} días</p>
          </div>
        </div>
      </section>
    </aside>
  )
}

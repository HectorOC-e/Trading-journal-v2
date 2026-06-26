"use client"

// Behavior Engine loop panel (S4) — makes the loop visible and actionable:
// actionable insights offer "Comprometerme" (only where a verifier exists, FREEZE-D7)
// and active/closed commitments show their verified result. The rich HOY/Reviews
// surfaces own this later (S12/S13); this is the first usable home.

import { Target, CheckCircle2, AlertTriangle, Circle, BookOpen, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { cn } from "@/lib/utils"

const STATUS_META: Record<string, { label: string; color: string; soft: string; icon: typeof CheckCircle2 }> = {
  active:  { label: "Activo",  color: "var(--accent)", soft: "var(--accent-soft)", icon: Circle },
  kept:    { label: "Cumplido", color: "var(--win)",   soft: "var(--win-soft)",   icon: CheckCircle2 },
  partial: { label: "Parcial", color: "var(--be)",     soft: "var(--be-soft)",    icon: AlertTriangle },
  broken:  { label: "Roto",    color: "var(--loss)",   soft: "var(--loss-soft)",  icon: AlertTriangle },
  expired: { label: "Expirado", color: "var(--ink-3)", soft: "var(--chip)",       icon: Circle },
}

export function BehaviorLoopPanel() {
  const utils = trpc.useUtils()
  const { data: insights = [], isLoading: insLoading } = trpc.behavior.openInsights.useQuery(undefined, { staleTime: 30_000 })
  const { data: commitments = [], isLoading: comLoading } = trpc.behavior.commitments.useQuery(undefined, { staleTime: 30_000 })

  const invalidate = () => {
    utils.behavior.openInsights.invalidate()
    utils.behavior.commitments.invalidate()
  }

  const create = trpc.behavior.createFromInsight.useMutation({
    onSuccess: () => { toast.success("Compromiso creado — lo verificaré al cierre de la ventana."); invalidate() },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })
  const evaluate = trpc.behavior.evaluate.useMutation({
    onSuccess: (r) => { toast.success(`Verificado: ${r.status}`); invalidate() },
    onError: (err) => toast.error(formatErrorForUser(err)),
  })
  const archive = trpc.behavior.archive.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(formatErrorForUser(err)),
  })

  const committable = insights.filter((i) => i.canCommit)
  const studyOnly = insights.filter((i) => !i.canCommit)

  if (insLoading || comLoading) {
    return <div className="h-24 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] animate-pulse" />
  }
  if (insights.length === 0 && commitments.length === 0) return null

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--ink)]">Loop de mejora</h3>
        <span className="text-[10px] text-[var(--ink-3)]">insight → compromiso → verificación</span>
      </div>

      {/* Active / recent commitments */}
      {commitments.length > 0 && (
        <div className="flex flex-col gap-2">
          {commitments.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.active
            const Icon = meta.icon
            return (
              <div key={c.id} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-start gap-2 min-w-0">
                    <Icon size={14} className="shrink-0 mt-0.5" style={{ color: meta.color }} />
                    <span className="text-[13px] text-[var(--ink)] leading-snug">{c.text}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.soft }}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--ink-3)]">
                  <span>ventana: {c.window}</span>
                  {c.latestCheck && (
                    <span>medido: {c.latestCheck.observedValue} (objetivo {c.comparator} {c.target})</span>
                  )}
                  {c.keptCount > 0 && <span className="text-[var(--win)]">{c.keptCount}× cumplido</span>}
                  <span className="flex-1" />
                  {c.status === "active" && (
                    <button
                      type="button"
                      onClick={() => evaluate.mutate({ commitmentId: c.id })}
                      disabled={evaluate.isPending}
                      className="text-[var(--accent)] hover:underline disabled:opacity-50"
                    >
                      Verificar ahora
                    </button>
                  )}
                  <button type="button" onClick={() => archive.mutate({ commitmentId: c.id })} className="text-[var(--ink-3)] hover:text-[var(--loss)]">
                    Archivar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actionable insights → commit */}
      {committable.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow">Insights accionables</p>
          {committable.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-3">
              <span className="min-w-0">
                <span className="text-[13px] font-semibold text-[var(--ink)] block truncate">{i.title}</span>
                {i.confidence != null && (
                  <span className="text-[10px] text-[var(--ink-3)]">confianza {Math.round(i.confidence * 100)}% · n={i.sampleSize}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => create.mutate({ insightId: i.id })}
                disabled={create.isPending}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                Comprometerme
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Non-verifiable insights → study/note (no fabricated commitment) */}
      {studyOnly.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-eyebrow">Para estudiar</p>
          {studyOnly.map((i) => (
            <div key={i.id} className={cn("flex items-center gap-2 text-[12px] text-[var(--ink-2)] px-1")}>
              <BookOpen size={12} className="text-[var(--ink-3)] shrink-0" />
              <span className="truncate">{i.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

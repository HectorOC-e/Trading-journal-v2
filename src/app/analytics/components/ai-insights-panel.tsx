"use client"

import { useState } from "react"
import { Sparkles, Loader2, AlertTriangle, TrendingUp, Activity, ShieldAlert, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import type { Insight } from "@/domains/analytics/services/insights-engine"

const CAT_ICON = {
  pattern: Activity, correlation: TrendingUp, anomaly: AlertTriangle, risk: ShieldAlert, opportunity: Lightbulb,
} as const

function sevStyle(s: Insight["severity"]): { bg: string; fg: string; bd: string } {
  switch (s) {
    case "critical": return { bg: "var(--loss-soft)", fg: "var(--loss)", bd: "var(--loss)" }
    case "warning":  return { bg: "var(--be-soft)",   fg: "var(--be)",   bd: "var(--be)" }
    case "positive": return { bg: "var(--win-soft)",  fg: "var(--win)",  bd: "var(--win)" }
    default:         return { bg: "var(--accent-soft)", fg: "var(--accent)", bd: "var(--accent)" }
  }
}

/**
 * AI Analytics layer (WHY + WHAT NEXT). Deterministic insights from the engine,
 * plus an on-demand LLM narrative streamed from /api/analytics-ai.
 */
export function AiInsightsPanel({ period }: { period: string }) {
  const { data: insights = [], isLoading } = trpc.analytics.insights.useQuery({ period: period as never }, { staleTime: 30_000 })
  const [narrative, setNarrative] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function generate() {
    setStreaming(true); setNarrative(""); setErr(null)
    try {
      const res = await fetch("/api/analytics-ai", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }),
      })
      const ct = res.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const j = await res.json() as { error?: string }
        setErr(j.error === "NO_API_KEY" ? "Configura tu API key en Perfil → Configuración de IA." : "No se pudo generar el análisis.")
        setStreaming(false); return
      }
      const reader = res.body?.getReader(); const dec = new TextDecoder()
      if (!reader) { setStreaming(false); return }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        setNarrative((p) => p + dec.decode(value, { stream: true }))
      }
    } catch { setErr("Error de red al generar el análisis.") }
    finally { setStreaming(false) }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--line)] overflow-hidden" style={{ background: "var(--panel)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]"
        style={{ background: "linear-gradient(90deg, var(--accent-soft), transparent)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">Inteligencia IA</p>
            <p className="text-[11px] text-[var(--ink-3)] leading-tight">Por qué ocurre · qué hacer después</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={streaming}
          className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-h)] transition-colors disabled:opacity-50 shrink-0"
        >
          {streaming ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {streaming ? "Analizando…" : "Generar análisis"}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Deterministic insights */}
        {isLoading ? (
          <p className="text-[12px] text-[var(--ink-3)]">Calculando señales…</p>
        ) : insights.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-3)]">Sin señales fuertes en este periodo. Registra más trades para detectar patrones.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {insights.map((i) => {
              const st = sevStyle(i.severity); const Icon = CAT_ICON[i.category]
              return (
                <div key={i.id} className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.fg }}>
                      <Icon size={13} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: st.fg }}>{i.category}</span>
                  </div>
                  <p className="text-[12.5px] font-semibold text-[var(--ink)] leading-snug">{i.title}</p>
                  <p className="text-[11px] text-[var(--ink-2)] leading-snug mt-1">{i.detail}</p>
                  {i.recommendation && (
                    <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--accent)" }}>→ {i.recommendation}</p>
                  )}
                  <p className="text-[9.5px] text-[var(--ink-3)] mt-1.5">{i.evidence}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* LLM narrative */}
        {(narrative || streaming || err) && (
          <div className="mt-1 rounded-[var(--radius)] border border-[var(--line)] p-3" style={{ background: "var(--panel-2)" }}>
            {err ? (
              <p className="text-[12px] text-[var(--loss)]">{err}</p>
            ) : (
              <div className={cn("text-[12.5px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed")}>
                {narrative || <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

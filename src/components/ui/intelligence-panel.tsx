"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"
import { InsightCards } from "@/components/ui/insight-cards"
import type { Insight } from "@/domains/analytics/services/insights-engine"

/**
 * Reusable AI intelligence panel (Analytics & Psychology).
 * Presentational: receives deterministic insights from the parent; streams the
 * LLM narrative from `endpoint`. Renders the narrative with the Markdown renderer.
 */
export function IntelligencePanel({
  insights, isLoading, endpoint, period, title, subtitle, emptyHint,
}: {
  insights: Insight[]
  isLoading: boolean
  endpoint: string
  period: string
  title: string
  subtitle: string
  emptyHint?: string
}) {
  const [narrative, setNarrative] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function generate() {
    setStreaming(true); setNarrative(""); setErr(null)
    let got = false
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }),
      })
      const ct = res.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const j = await res.json() as { error?: string }
        setErr(j.error === "NO_API_KEY" ? "Configura tu API key en Perfil → Configuración de IA." : "No se pudo generar el análisis (IA).")
        setStreaming(false); return
      }
      if (!res.ok) { setErr("El servidor no pudo generar el análisis. Intenta de nuevo."); setStreaming(false); return }
      const reader = res.body?.getReader(); const dec = new TextDecoder()
      if (!reader) { setStreaming(false); return }
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          got = true
          setNarrative((p) => p + dec.decode(value, { stream: true }))
        }
      } catch {
        // Stream cut mid-way (timeout/provider). Keep partial output; only error if nothing arrived.
        if (!got) setErr("La conexión con la IA se interrumpió. Vuelve a intentarlo.")
      }
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e intenta de nuevo.")
    }
    finally { setStreaming(false) }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--line)] overflow-hidden" style={{ background: "var(--panel)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]"
        style={{ background: "linear-gradient(90deg, var(--accent-soft), transparent)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">{title}</p>
            <p className="text-[11px] text-[var(--ink-3)] leading-tight">{subtitle}</p>
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
        {isLoading ? (
          <p className="text-[12px] text-[var(--ink-3)]">Calculando señales…</p>
        ) : insights.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-3)]">{emptyHint ?? "Sin señales fuertes en este periodo. Registra más datos para detectar patrones."}</p>
        ) : (
          <InsightCards insights={insights} />
        )}

        {(narrative || streaming || err) && (
          <div className="mt-1 rounded-[var(--radius)] border border-[var(--line)] p-3" style={{ background: "var(--panel-2)" }}>
            {err ? <p className="text-[12px] text-[var(--loss)]">{err}</p>
              : narrative ? <Markdown content={narrative} />
              : <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
          </div>
        )}
      </div>
    </section>
  )
}

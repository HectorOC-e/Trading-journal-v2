"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"
import { InsightCards } from "@/components/ui/insight-cards"
import { useOperationalMode } from "@/lib/operational-mode-store"
import { MODE_LABELS, type OperationalMode } from "@/domains/trading/operational-mode"
import type { Insight } from "@/domains/analytics/services/insights-engine"

/**
 * Reusable AI intelligence panel (Analytics & Psychology).
 * Presentational: receives deterministic insights from the parent; streams the
 * LLM narrative from `endpoint`. Renders the narrative with the Markdown renderer.
 */
type IntelligencePanelProps = {
  insights: Insight[]
  isLoading: boolean
  endpoint: string
  period: string
  mode?: OperationalMode
  title: string
  subtitle: string
  emptyHint?: string
}

export function IntelligencePanel(props: IntelligencePanelProps) {
  const selectedMode = useOperationalMode(state => state.mode)
  const mode = props.mode ?? selectedMode
  // Remount at the provenance boundary, so no old narrative survives even the
  // first render with the new label. Cleanup aborts its outstanding stream.
  return <ScopedIntelligencePanel key={`${props.endpoint}:${mode}:${props.period}`} {...props} mode={mode} />
}

function ScopedIntelligencePanel({ insights, isLoading, endpoint, period, mode, title, subtitle, emptyHint }: IntelligencePanelProps & { mode: OperationalMode }) {
  const [narrative, setNarrative] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  async function generate() {
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    const current = () => !controller.signal.aborted
    setStreaming(true); setNarrative(""); setErr(null)
    let got = false
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period, mode }), signal: controller.signal,
      })
      if (!current()) return
      const ct = res.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const j = await res.json() as { error?: string }
        if (!current()) return
        setErr(j.error === "NO_API_KEY" ? "Configura tu API key en Perfil → Configuración de IA." : "No se pudo generar el análisis (IA).")
        setStreaming(false); return
      }
      if (!res.ok) { setErr("El servidor no pudo generar el análisis. Intenta de nuevo."); setStreaming(false); return }
      const reader = res.body?.getReader(); const dec = new TextDecoder()
      if (!reader) { setStreaming(false); return }
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (!current()) { void reader.cancel(); return }
          if (done) break
          got = true
          setNarrative((p) => p + dec.decode(value, { stream: true }))
        }
      } catch {
        // Stream cut mid-way (timeout/provider). Keep partial output; only error if nothing arrived.
        if (current() && !got) setErr("La conexión con la IA se interrumpió. Vuelve a intentarlo.")
      }
    } catch {
      if (current()) setErr("No se pudo conectar. Revisa tu conexión e intenta de nuevo.")
    }
    finally { if (current()) setStreaming(false) }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--line)] overflow-hidden" style={{ background: "var(--panel)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]"
        style={{ background: "linear-gradient(90deg, var(--accent-soft), transparent)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)] leading-tight">{title}</p>
            <p className="text-[11px] text-[var(--ink-3)] leading-tight">{subtitle} · {MODE_LABELS[mode]}</p>
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

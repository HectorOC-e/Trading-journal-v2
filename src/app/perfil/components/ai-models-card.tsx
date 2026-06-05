"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "@/lib/use-toast"
import { formatErrorForUser } from "@/lib/error-formatter"
import { AI_FEATURES, type AiFeature } from "@/lib/ai/feature-models"

const PROVIDERS = ["openrouter", "anthropic", "openai"] as const
type Provider = typeof PROVIDERS[number]

const PROVIDER_LABEL: Record<Provider, string> = {
  openrouter: "OpenRouter",
  anthropic:  "Anthropic",
  openai:     "OpenAI",
}

const FEATURE_LABEL: Record<AiFeature, string> = {
  trade_analysis:     "Análisis de trades",
  review_generation:  "Generación de reviews",
  psychology_analysis:"Análisis psicológico",
  learning_insights:  "Insights de aprendizaje",
  weekly_reviews:     "Reviews semanales",
  ai_chat:            "Chat / Coach IA",
  embeddings:         "Embeddings (búsqueda)",
}

const COST_OPTIONS = [
  { id: "quality", label: "Calidad", hint: "Mejor modelo aunque sea más lento/caro" },
  { id: "speed",   label: "Velocidad", hint: "Modelos de baja latencia" },
  { id: "cost",    label: "Costo", hint: "El más económico aceptable" },
] as const

const inputStyle: React.CSSProperties = {
  height: 36, padding: "0 10px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)", background: "var(--panel-2)",
  color: "var(--ink)", fontSize: 13, outline: "none", width: "100%",
}

function ProviderSelect({ value, onChange }: { value: Provider; onChange: (v: Provider) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as Provider)} style={{ ...inputStyle, cursor: "pointer" }}>
      {PROVIDERS.map(p => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
    </select>
  )
}

export function AiModelsCard() {
  const utils = trpc.useUtils()
  const { data: settings } = trpc.aiSettings.get.useQuery()
  const updateMut = trpc.aiSettings.update.useMutation({
    onSuccess: () => { utils.aiSettings.get.invalidate(); toast.success("Configuración de modelos guardada") },
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })

  const [defaultProvider,  setDefaultProvider]  = useState<Provider>("anthropic")
  const [defaultModel,     setDefaultModel]     = useState("claude-sonnet-4-6")
  const [fallbackProvider, setFallbackProvider] = useState<Provider>("openrouter")
  const [fallbackModel,    setFallbackModel]    = useState("")
  const [costPriority,     setCostPriority]     = useState<"quality" | "speed" | "cost">("quality")
  const [features,         setFeatures]         = useState<Partial<Record<AiFeature, { provider: Provider; model: string }>>>({})
  const [showFeatures,     setShowFeatures]     = useState(false)
  const [initialized,      setInitialized]      = useState(false)

  useEffect(() => {
    if (!settings || initialized) return
    setDefaultProvider(settings.defaultProvider as Provider)
    setDefaultModel(settings.defaultModel)
    setFallbackProvider((settings.fallbackProvider as Provider) ?? "openrouter")
    setFallbackModel(settings.fallbackModel ?? "")
    setCostPriority(settings.costPriority)
    setFeatures((settings.featureModels ?? {}) as typeof features)
    setInitialized(true)
  }, [settings, initialized])

  function save() {
    updateMut.mutate({
      defaultProvider,
      defaultModel:     defaultModel.trim(),
      fallbackProvider: fallbackModel.trim() ? fallbackProvider : null,
      fallbackModel:    fallbackModel.trim() || null,
      costPriority,
      featureModels: Object.fromEntries(
        AI_FEATURES.map(f => [f, features[f]?.model?.trim()
          ? { provider: features[f]!.provider, model: features[f]!.model.trim() }
          : null]),
      ),
    })
  }

  function setFeature(f: AiFeature, patch: Partial<{ provider: Provider; model: string }>) {
    setFeatures(prev => ({
      ...prev,
      [f]: { provider: patch.provider ?? prev[f]?.provider ?? defaultProvider, model: patch.model ?? prev[f]?.model ?? "" },
    }))
  }

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 24, marginTop: 20 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Modelos de IA</p>
      <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 18 }}>
        Modelo global por defecto + fallback. Opcionalmente un modelo distinto por funcionalidad.
        Escribe <code style={{ background: "var(--panel-2)", padding: "1px 4px", borderRadius: 3 }}>auto</code> en cualquier modelo para que se elija según tu <b>prioridad</b>.
      </p>

      {/* Global default */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Proveedor por defecto</label>
          <ProviderSelect value={defaultProvider} onChange={setDefaultProvider} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Modelo por defecto</label>
          <input style={inputStyle} value={defaultModel} onChange={e => setDefaultModel(e.target.value)} placeholder="claude-sonnet-4-6" />
        </div>
      </div>

      {/* Global fallback */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Proveedor fallback</label>
          <ProviderSelect value={fallbackProvider} onChange={setFallbackProvider} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Modelo fallback (opcional)</label>
          <input style={inputStyle} value={fallbackModel} onChange={e => setFallbackModel(e.target.value)} placeholder="anthropic/claude-haiku-4-5" />
        </div>
      </div>

      {/* Cost priority */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", display: "block", marginBottom: 8 }}>Prioridad</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COST_OPTIONS.map(o => (
            <button key={o.id} type="button" onClick={() => setCostPriority(o.id)}
              title={o.hint}
              style={{
                padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${costPriority === o.id ? "var(--accent)" : "var(--line)"}`,
                background: costPriority === o.id ? "var(--accent-soft)" : "var(--panel-2)",
                color: costPriority === o.id ? "var(--accent)" : "var(--ink-2)",
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-feature overrides */}
      <button type="button" onClick={() => setShowFeatures(v => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 600, padding: 0, marginBottom: showFeatures ? 12 : 0 }}>
        {showFeatures ? "▲" : "▼"} Modelos por funcionalidad (opcional)
      </button>
      {showFeatures && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {AI_FEATURES.map(f => (
            <div key={f} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.4fr", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{FEATURE_LABEL[f]}</span>
              <ProviderSelect value={features[f]?.provider ?? defaultProvider} onChange={p => setFeature(f, { provider: p })} />
              <input style={inputStyle} value={features[f]?.model ?? ""} onChange={e => setFeature(f, { model: e.target.value })} placeholder="usar por defecto" />
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={save} disabled={updateMut.isPending || !defaultModel.trim()}
        style={{
          marginTop: 8, height: 38, padding: "0 18px", borderRadius: "var(--radius-sm)",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600,
          border: "none", cursor: "pointer", opacity: updateMut.isPending || !defaultModel.trim() ? 0.5 : 1,
        }}>
        {updateMut.isPending ? "Guardando…" : "Guardar modelos"}
      </button>
    </div>
  )
}

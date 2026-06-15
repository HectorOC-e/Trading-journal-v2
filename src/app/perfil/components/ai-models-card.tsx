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
  analytics_insights: "Inteligencia Analytics",
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

// Curated models that support tool/function calling — required for the Coach to
// query your live data (cuentas, setups, trades). Surfaced as autocomplete.
const TOOL_CAPABLE_MODELS: Record<Provider, string[]> = {
  anthropic:  ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  openrouter: ["anthropic/claude-sonnet-4-6", "anthropic/claude-opus-4-8", "openai/gpt-4o", "openai/gpt-4o-mini", "google/gemini-2.5-pro"],
  openai:     ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
}
const ALL_TOOL_MODELS = Array.from(new Set(Object.values(TOOL_CAPABLE_MODELS).flat()))

// Heuristic for models that are known NOT to support tools (the Coach would lose
// live-data access and fall back to a static answer). Advisory only.
function looksToolIncapable(model: string): boolean {
  const m = model.trim().toLowerCase()
  if (!m || m === "auto") return false
  return /gpt-oss|-base\b|:free|deepseek-r1|-instruct\b/.test(m)
}

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

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  user: { label: "Clave de usuario", color: "var(--win, #16a34a)" },
  env:  { label: "Variable de entorno", color: "var(--be, #b45309)" },
  none: { label: "No configurada", color: "var(--loss, #dc2626)" },
}

export function AiModelsCard() {
  const utils = trpc.useUtils()
  const { data: settings } = trpc.aiSettings.get.useQuery()
  const { data: diag } = trpc.aiConfig.diagnostics.useQuery()
  const updateMut = trpc.aiSettings.update.useMutation({
    onSuccess: () => { utils.aiSettings.get.invalidate(); utils.aiConfig.diagnostics.invalidate(); toast.success("Configuración de modelos guardada") },
    onError:   (err) => toast.error(formatErrorForUser(err)),
  })
  const healthMut = trpc.aiConfig.healthCheck.useMutation({
    onSuccess: (r) => {
      if (r.ok) toast.success(`IA OK · ${r.provider} · ${r.model}${r.detectedModels ? ` · ${r.detectedModels} modelos` : ""}`)
      else      toast.error(`Configuración IA inválida: ${r.error ?? "error desconocido"}`)
      utils.aiConfig.diagnostics.invalidate()
    },
    onError: (err) => toast.error(formatErrorForUser(err)),
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
          <input style={inputStyle} list="tool-capable-models" value={defaultModel} onChange={e => setDefaultModel(e.target.value)} placeholder="claude-sonnet-4-6" />
          {looksToolIncapable(defaultModel) ? (
            <p style={{ fontSize: 10.5, color: "var(--be, #b45309)", lineHeight: 1.4 }}>
              ⚠ Este modelo podría no soportar <b>tools</b>. El Coach no podría consultar tus datos en vivo (cuentas, setups, trades) y respondería solo con el resumen. Elige uno tool-capable de la lista.
            </p>
          ) : (
            <p style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.4 }}>
              Para el Coach, usa un modelo con soporte de <b>tools</b> (function calling). Empieza a escribir para ver sugerencias.
            </p>
          )}
        </div>
      </div>

      {/* Shared autocomplete of tool-capable models for every model field */}
      <datalist id="tool-capable-models">
        {(TOOL_CAPABLE_MODELS[defaultProvider] ?? []).map(m => <option key={m} value={m} />)}
        {ALL_TOOL_MODELS.map(m => <option key={`all-${m}`} value={m} />)}
      </datalist>

      {/* Global fallback */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Proveedor fallback</label>
          <ProviderSelect value={fallbackProvider} onChange={setFallbackProvider} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Modelo fallback (opcional)</label>
          <input style={inputStyle} list="tool-capable-models" value={fallbackModel} onChange={e => setFallbackModel(e.target.value)} placeholder="anthropic/claude-haiku-4-5" />
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
              <input style={{ ...inputStyle, ...(f === "ai_chat" && looksToolIncapable(features[f]?.model ?? "") ? { borderColor: "var(--be, #b45309)" } : {}) }}
                list="tool-capable-models" value={features[f]?.model ?? ""} onChange={e => setFeature(f, { model: e.target.value })} placeholder="usar por defecto" />
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

      {/* ── Diagnóstico IA ── */}
      <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Diagnóstico IA</p>
          <button type="button" onClick={() => healthMut.mutate()} disabled={healthMut.isPending}
            style={{
              height: 32, padding: "0 14px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: healthMut.isPending ? 0.6 : 1,
            }}>
            {healthMut.isPending ? "Verificando…" : "Verificar configuración IA"}
          </button>
        </div>

        {diag && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Efectivo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div><span style={{ color: "var(--ink-3)" }}>Proveedor efectivo: </span><b style={{ color: "var(--ink)" }}>{PROVIDER_LABEL[diag.defaultProvider as Provider] ?? diag.defaultProvider}</b></div>
              <div><span style={{ color: "var(--ink-3)" }}>Modelo efectivo: </span><b style={{ color: "var(--ink)" }}>{diag.defaultModel}</b></div>
              <div><span style={{ color: "var(--ink-3)" }}>Fallback: </span><b style={{ color: "var(--ink)" }}>{diag.fallbackProvider ? `${PROVIDER_LABEL[diag.fallbackProvider as Provider] ?? diag.fallbackProvider} · ${diag.fallbackModel}` : "—"}</b></div>
              <div><span style={{ color: "var(--ink-3)" }}>Prioridad: </span><b style={{ color: "var(--ink)" }}>{diag.costPriority}</b></div>
            </div>

            {/* Estado de API Keys */}
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 6 }}>Estado de API Keys</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {diag.keys.map(k => {
                  const s = SOURCE_LABEL[k.source]
                  return (
                    <span key={k.provider} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999, border: `1px solid ${s.color}`, color: s.color, background: "var(--panel-2)" }}>
                      {PROVIDER_LABEL[k.provider as Provider] ?? k.provider}: {s.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Feature resolution (solo features activas) */}
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 6 }}>Resolución por funcionalidad (activas)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {diag.features.filter(f => f.active).map(f => (
                  <div key={f.feature} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 0.9fr", gap: 8, fontSize: 11.5, alignItems: "center" }}>
                    <span style={{ color: "var(--ink-2)" }}>{FEATURE_LABEL[f.feature as AiFeature] ?? f.feature}</span>
                    <span style={{ color: "var(--ink)" }}>{PROVIDER_LABEL[f.provider as Provider] ?? f.provider}</span>
                    <span style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono',monospace" }}>{f.model}</span>
                    <span style={{ color: SOURCE_LABEL[f.source].color }}>{SOURCE_LABEL[f.source].label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 6 }}>
                Las demás funcionalidades del configurador aún no consumen IA en vivo (solo Chat, Reviews y Embeddings).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

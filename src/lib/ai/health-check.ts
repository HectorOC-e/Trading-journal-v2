// Lightweight provider connectivity check — validates that an API key actually
// authenticates against the provider, and surfaces the REAL error otherwise.
// Used by the "Verificar configuración IA" health check.

import type { AiProvider } from "./config"

export type ConnectivityResult = {
  valid: boolean
  error?: string
  detectedModels?: number
}

export async function testProviderConnectivity(
  provider: AiProvider,
  apiKey:   string,
): Promise<ConnectivityResult> {
  if (!apiKey) return { valid: false, error: "No hay API key para este proveedor." }
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      })
      if (res.ok) {
        const body = await res.json().catch(() => ({})) as { data?: unknown[] }
        return { valid: true, detectedModels: body?.data?.length }
      }
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return { valid: false, error: body?.error?.message ?? `HTTP ${res.status}` }
    }

    // OpenRouter and OpenAI share the OpenAI-compatible /models endpoint + Bearer auth.
    const baseUrl = provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1"
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const body = await res.json().catch(() => ({})) as { data?: unknown[] }
      return { valid: true, detectedModels: body?.data?.length }
    }
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return { valid: false, error: body?.error?.message ?? `HTTP ${res.status}` }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Error de red" }
  }
}

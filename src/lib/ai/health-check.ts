import type { AiProvider } from "./config";

export type ConnectivityResult = {
  valid: boolean;
  error?: string;
  detectedModels?: number;
  failure?: "credentials" | "upstream";
};

/** Read-only authentication probe. Never returns upstream bodies or exception text. */
export async function testProviderConnectivity(
  provider: AiProvider,
  apiKey: string,
  signal: AbortSignal = AbortSignal.timeout(10000),
): Promise<ConnectivityResult> {
  if (!apiKey)
    return {
      valid: false,
      error: "No hay API key para este proveedor.",
      failure: "credentials",
    };
  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/auth/key"
      : provider === "anthropic"
        ? "https://api.anthropic.com/v1/models"
        : "https://api.openai.com/v1/models";
  const headers: Record<string, string> =
    provider === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { Authorization: `Bearer ${apiKey}` };
  try {
    const res = await fetch(url, { headers, signal, cache: "no-store" });
    if (!res.ok) {
      const credentials = res.status === 401 || res.status === 403;
      return {
        valid: false,
        failure: credentials ? "credentials" : "upstream",
        error: credentials
          ? "El proveedor rechazó las credenciales. Revisa su clave."
          : "No se pudo verificar el proveedor. Reintenta más tarde.",
      };
    }
    if (provider === "openrouter") return { valid: true };
    const body = (await res.json().catch(() => ({}))) as { data?: unknown[] };
    return {
      valid: true,
      detectedModels: Array.isArray(body.data) ? body.data.length : undefined,
    };
  } catch {
    return {
      valid: false,
      error: "No se pudo conectar con el proveedor. Reintenta más tarde.",
      failure: "upstream",
    };
  }
}

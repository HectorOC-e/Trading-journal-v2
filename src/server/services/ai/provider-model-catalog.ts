import { TRPCError } from "@trpc/server";
import { testProviderConnectivity } from "@/lib/ai/health-check";
import type { AiProvider } from "@/lib/ai/config";

export type ModelPurpose = "chat" | "embeddings";
export interface ProviderModel {
  id: string;
  name: string;
  contextLength: number | null;
  supportsTools: boolean | null;
  supportsVision: boolean | null;
  free: boolean;
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function model(
  value: unknown,
  provider: AiProvider,
  purpose: ModelPurpose,
): ProviderModel | null {
  const row = object(value);
  if (typeof row.id !== "string" || !row.id.trim() || row.id.length > 100)
    return null;
  const id = row.id.trim();
  const architecture = object(row.architecture);
  const outputs = architecture.output_modalities;
  if (
    Array.isArray(outputs) &&
    !outputs.includes(purpose === "chat" ? "text" : "embeddings")
  )
    return null;
  if (provider === "openai") {
    const embedding = /embed/i.test(id);
    if ((purpose === "embeddings") !== embedding) return null;
    if (
      purpose === "chat" &&
      /^(?:tts|whisper|dall-e|sora|gpt-image|.*moderation)|realtime/i.test(id)
    )
      return null;
  }
  const params = row.supported_parameters;
  const inputs = architecture.input_modalities;
  const pricing = object(row.pricing);
  const zero = (v: unknown) =>
    ((typeof v === "string" && v.trim() !== "") || typeof v === "number") &&
    Number(v) === 0;
  const title =
    typeof row.name === "string"
      ? row.name
      : typeof row.display_name === "string"
        ? row.display_name
        : id;
  return {
    id,
    name: title.slice(0, 160),
    contextLength:
      typeof row.context_length === "number" &&
      Number.isFinite(row.context_length) &&
      row.context_length > 0
        ? row.context_length
        : null,
    supportsTools: Array.isArray(params) ? params.includes("tools") : null,
    supportsVision: Array.isArray(inputs) ? inputs.includes("image") : null,
    free:
      zero(pricing.prompt) &&
      (purpose === "embeddings" || zero(pricing.completion)),
  };
}

/** Fixed upstream URLs and an explicit metadata allowlist; keys never leave server code. */
export async function fetchProviderModels(
  provider: AiProvider,
  apiKey: string,
  purpose: ModelPurpose,
): Promise<ProviderModel[]> {
  if (provider === "anthropic" && purpose === "embeddings") return [];
  if (provider !== "openrouter" && !apiKey)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Configura la clave de este proveedor para consultar su catálogo.",
    });
  const signal = AbortSignal.timeout(10000);
  if (provider === "openrouter" && apiKey) {
    const authentication = await testProviderConnectivity(
      provider,
      apiKey,
      signal,
    );
    if (!authentication.valid)
      throw new TRPCError({
        code:
          authentication.failure === "credentials"
            ? "PRECONDITION_FAILED"
            : "BAD_GATEWAY",
        message: authentication.error,
      });
  }
  const url = new URL(
    provider === "openrouter"
      ? `https://openrouter.ai/api/v1/models${apiKey ? "/user" : ""}`
      : provider === "anthropic"
        ? "https://api.anthropic.com/v1/models"
        : "https://api.openai.com/v1/models",
  );
  if (provider === "openrouter")
    url.searchParams.set(
      "output_modalities",
      purpose === "chat" ? "text" : "embeddings",
    );
  if (provider === "anthropic") url.searchParams.set("limit", "100");
  const headers: Record<string, string> = {};
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const models = new Map<string, ProviderModel>();
  const cursors = new Set<string>();
  for (let page = 0; page < 10; page++) {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers,
        cache: "no-store",
        signal,
      });
    } catch {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message:
          "No se pudo conectar con el catálogo. Reintenta o introduce el ID manualmente.",
      });
    }
    if (!response.ok)
      throw new TRPCError({
        code:
          response.status === 401 || response.status === 403
            ? "PRECONDITION_FAILED"
            : "BAD_GATEWAY",
        message:
          response.status === 401 || response.status === 403
            ? "El proveedor rechazó las credenciales del catálogo. Revisa su clave."
            : "El catálogo no está disponible. Reintenta o introduce el ID manualmente.",
      });
    const body = object(await response.json().catch(() => null));
    if (!Array.isArray(body.data) || body.data.length > 3000)
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "El catálogo devolvió una respuesta no válida.",
      });
    for (const row of body.data) {
      const entry = model(row, provider, purpose);
      if (
        entry &&
        !(apiKey && (entry.id.includes(apiKey) || entry.name.includes(apiKey)))
      )
        models.set(entry.id, entry);
    }
    if (models.size > 3000)
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "El catálogo supera el límite de modelos. Usa un ID manual.",
      });
    if (provider === "openrouter") {
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const next = object(body.links).next;
      const more =
        (typeof body.total_count === "number" &&
          Number.isFinite(body.total_count) &&
          body.total_count > offset + body.data.length) ||
        (typeof next === "string" && next.length > 0);
      if (more) {
        if (!body.data.length) break;
        // Use numeric offsets on our fixed endpoint; never follow response URLs with credentials.
        url.searchParams.set("offset", String(offset + body.data.length));
        continue;
      }
    }
    if (provider === "anthropic" && body.has_more === true) {
      if (
        typeof body.last_id !== "string" ||
        !body.last_id ||
        cursors.has(body.last_id)
      )
        break;
      cursors.add(body.last_id);
      url.searchParams.set("after_id", body.last_id);
      continue;
    }
    return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message:
      "No se pudo completar el catálogo. Reintenta o introduce el ID manualmente.",
  });
}

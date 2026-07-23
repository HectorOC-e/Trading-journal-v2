import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { encryptApiKey, decryptApiKey, maskApiKey, EncryptionConfigError } from "@/lib/ai/key-encryption"
import { buildAiDiagnostics, resolveAiCall } from "@/lib/ai/resolve-provider"
import { testProviderConnectivity } from "@/lib/ai/health-check"
import { indexStatus, reindex } from "@/server/services/retrieval/pipeline"
import { CORPUS_KEYS } from "@/server/services/retrieval/types"

const PROVIDERS = ["anthropic", "openrouter", "openai"] as const
type Provider = typeof PROVIDERS[number]

const UpsertAiConfigInput = z.object({
  provider: z.enum(PROVIDERS),
  apiKey:   z.string().min(20).max(200),
  model:    z.string().max(100).optional().nullable(),
})

/**
 * Per-provider key-format validation. Returns a clear message or null.
 * - Anthropic: sk-ant-...
 * - OpenAI:    sk-... (incl. sk-proj-...)
 * - OpenRouter: sk-or-... (incl. sk-or-v1-...). NOT a 64-char hex string —
 *   that requirement only applies to the SERVER encryption secret, never user keys.
 */
function validateKeyFormat(provider: Provider, apiKey: string): string | null {
  if (provider === "anthropic"  && !apiKey.startsWith("sk-ant-")) return "Invalid Anthropic API Key — debe empezar con 'sk-ant-'"
  if (provider === "openrouter" && !apiKey.startsWith("sk-or-"))  return "Invalid OpenRouter API Key — debe empezar con 'sk-or-' (p. ej. sk-or-v1-…)"
  // OpenAI last so an 'sk-or-'/'sk-ant-' typo on the wrong provider is caught above.
  if (provider === "openai"     && !apiKey.startsWith("sk-"))     return "Invalid OpenAI API Key — debe empezar con 'sk-'"
  return null
}

export const aiConfigRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const configs = await ctx.prisma.userAiConfig.findMany({
        where:   { userId: ctx.userId },
        orderBy: { provider: "asc" },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (configs as any[]).map((c: { id: string; provider: string; apiKeyEnc: string; model: string | null; isActive: boolean; lastTested: Date | null; errorLog: string | null; createdAt: Date; updatedAt: Date }) => ({
        id:         c.id,
        provider:   c.provider,
        maskedKey:  (() => { try { return maskApiKey(decryptApiKey(c.apiKeyEnc)) } catch { return "***" } })(),
        model:      c.model,
        isActive:   c.isActive,
        lastTested: c.lastTested?.toISOString() ?? null,
        errorLog:   c.errorLog,
        createdAt:  c.createdAt.toISOString(),
        updatedAt:  c.updatedAt.toISOString(),
      }))
    }),

  upsert: protectedProcedure
    .input(UpsertAiConfigInput)
    .mutation(async ({ ctx, input }) => {
      const { TRPCError } = await import("@trpc/server")
      // Trim accidental whitespace from pasted keys before any validation.
      const apiKey = input.apiKey.trim()

      const formatError = validateKeyFormat(input.provider as Provider, apiKey)
      if (formatError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: formatError })
      }

      // HALLAZGO 4 — the encryption layer throws when the SERVER secret
      // (AI_KEY_ENCRYPTION_SECRET) is missing/misconfigured. That is a server
      // problem, NOT the user's API key. Surface a clear, non-blaming message
      // instead of leaking "must be a 64-character hex string" to the user.
      let apiKeyEnc: string
      try {
        apiKeyEnc = encryptApiKey(apiKey)
      } catch (e) {
        if (e instanceof EncryptionConfigError) {
          // Server misconfiguration — NOT the user's key. Clear, actionable message.
          throw new TRPCError({
            code:    "INTERNAL_SERVER_ERROR",
            message: "Missing encryption secret — el servidor no tiene AI_KEY_ENCRYPTION_SECRET configurado. Tu clave es válida; contacta al administrador.",
          })
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar la clave. Intenta de nuevo." })
      }
      const result = await ctx.prisma.userAiConfig.upsert({
        where:  { userId_provider: { userId: ctx.userId, provider: input.provider } },
        create: {
          userId:    ctx.userId,
          provider:  input.provider,
          apiKeyEnc,
          model:     input.model ?? null,
          isActive:  true,
        },
        update: {
          apiKeyEnc,
          model:    input.model ?? null,
          isActive: true,
          errorLog: null,
        },
      })
      return {
        id:        result.id,
        provider:  result.provider,
        maskedKey: maskApiKey(input.apiKey),
        model:     result.model,
        isActive:  result.isActive,
        updatedAt: result.updatedAt.toISOString(),
      }
    }),

  delete: protectedProcedure
    .input(z.object({ provider: z.enum(PROVIDERS) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userAiConfig.deleteMany({
        where: { userId: ctx.userId, provider: input.provider },
      })
      return { deleted: true }
    }),

  /**
   * AI Diagnostics — the EFFECTIVE configuration the app will actually use:
   * default/fallback provider+model, per-feature resolution, and key status per
   * provider (persisted "user" key, "env" key, or "none"). Never returns keys.
   */
  diagnostics: protectedProcedure.query(async ({ ctx }) => {
    return buildAiDiagnostics(ctx.prisma, ctx.userId)
  }),

  /**
   * AI Health Check — resolves the user's effective chat provider+model+key and
   * pings the provider to validate connectivity, returning the REAL result.
   */
  healthCheck: protectedProcedure.mutation(async ({ ctx }) => {
    const call = await resolveAiCall(ctx.prisma, ctx.userId, "ai_chat")
    const { primary } = call
    if (primary.source === "none") {
      return {
        ok:             false,
        provider:       primary.provider,
        model:          primary.model,
        source:         primary.source,
        detectedModels: null as number | null,
        error:          "No hay API key configurada para el proveedor efectivo. Añádela en Configuración de IA." as string | null,
      }
    }
    const result = await testProviderConnectivity(primary.provider, primary.apiKey)
    // Persist last-tested/error on the matching saved config (best-effort).
    if (primary.source === "user") {
      await ctx.prisma.userAiConfig.updateMany({
        where: { userId: ctx.userId, provider: primary.provider },
        data:  { lastTested: new Date(), errorLog: result.valid ? null : (result.error ?? "Unknown error") },
      }).catch(() => {})
    }
    return {
      ok:             result.valid,
      provider:       primary.provider,
      model:          primary.model,
      source:         primary.source,
      detectedModels: result.detectedModels ?? null,
      error:          result.valid ? null : (result.error ?? "Error desconocido"),
    }
  }),

  /**
   * Estado real de indexación por corpus. El diagnóstico de arriba comprueba que
   * hay clave y que el proveedor responde; esto comprueba la otra dimensión: si
   * existe algún vector. Sin ella la feature figura activa sin estarlo — que es
   * exactamente cómo `search_learning_resources` estuvo muda sin que nada lo dijera.
   */
  indexStatus: protectedProcedure
    .query(({ ctx }) => indexStatus(ctx.prisma, ctx.userId)),

  reindex: protectedProcedure
    .input(z.object({
      corpus: z.enum(CORPUS_KEYS).optional(),
      limit:  z.number().int().min(1).max(500).default(200),
    }).optional())
    .mutation(({ ctx, input }) => reindex(ctx.prisma, ctx.userId, input)),
})

/**
 * Server-side helper for internal API routes that need a user's decrypted key.
 * NOT exposed via tRPC — import directly from server-only code.
 */
export async function getDecryptedApiKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  userId: string,
  provider: Provider,
): Promise<string | null> {
  const config = await prisma.userAiConfig.findUnique({
    where: { userId_provider: { userId, provider } },
  })
  if (!config) return null
  return decryptApiKey(config.apiKeyEnc)
}

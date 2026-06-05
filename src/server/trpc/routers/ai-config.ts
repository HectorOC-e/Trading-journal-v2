import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { encryptApiKey, decryptApiKey, maskApiKey, EncryptionConfigError } from "@/lib/ai/key-encryption"

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

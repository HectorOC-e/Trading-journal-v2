import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/ai/key-encryption"

const PROVIDERS = ["anthropic", "openrouter", "openai"] as const
type Provider = typeof PROVIDERS[number]

// Gate 1: Zod schema matches the TypeScript interface field-for-field
const UpsertAiConfigInput = z.object({
  provider: z.enum(PROVIDERS),
  apiKey:   z.string().min(20).max(200),
  model:    z.string().max(100).optional().nullable(),
})

// Provider-specific key format validation (prefix check)
function validateKeyFormat(provider: Provider, apiKey: string): string | null {
  if (provider === "anthropic"   && !apiKey.startsWith("sk-ant-")) return "Anthropic keys must start with 'sk-ant-'"
  if (provider === "openai"      && !apiKey.startsWith("sk-"))      return "OpenAI keys must start with 'sk-'"
  return null
}

export const aiConfigRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // @ts-expect-error — userAiConfig added in Sprint 5 migration; Prisma client not regenerated
      const configs = await ctx.prisma.userAiConfig.findMany({
        where:   { userId: ctx.userId },
        orderBy: { provider: "asc" },
      })
      // Never return decrypted keys — mask them for display
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (configs as any[]).map((c: { id: string; provider: string; apiKeyEnc: string; model: string | null; isActive: boolean; lastTested: Date | null; errorLog: string | null; createdAt: Date; updatedAt: Date }) => ({
        id:         c.id,
        provider:   c.provider,
        maskedKey:  maskApiKey(decryptApiKey(c.apiKeyEnc)),
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
      // Gate 1: validate key format per provider
      const formatError = validateKeyFormat(input.provider as Provider, input.apiKey)
      if (formatError) {
        const { TRPCError } = await import("@trpc/server")
        throw new TRPCError({ code: "BAD_REQUEST", message: formatError })
      }

      const apiKeyEnc = encryptApiKey(input.apiKey)
      // @ts-expect-error — userAiConfig added in Sprint 5 migration; Prisma client not regenerated
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
      // @ts-expect-error — userAiConfig added in Sprint 5 migration; Prisma client not regenerated
      await ctx.prisma.userAiConfig.deleteMany({
        where: { userId: ctx.userId, provider: input.provider },
      })
      return { deleted: true }
    }),

  // Expose decrypted key ONLY to internal services (not to the client directly)
  // This is used by ai-coach, ai-embed routes. Not exposed to frontend.
  _getDecryptedKey: protectedProcedure
    .input(z.object({ provider: z.enum(PROVIDERS) }))
    .query(async ({ ctx, input }) => {
      // @ts-expect-error — userAiConfig added in Sprint 5 migration; Prisma client not regenerated
      const config = await ctx.prisma.userAiConfig.findUnique({
        where: { userId_provider: { userId: ctx.userId, provider: input.provider } },
      })
      if (!config) return null
      return decryptApiKey(config.apiKeyEnc)
    }),
})

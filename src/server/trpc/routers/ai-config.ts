import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/ai/key-encryption"

const PROVIDERS = ["anthropic", "openrouter", "openai"] as const
type Provider = typeof PROVIDERS[number]

const UpsertAiConfigInput = z.object({
  provider: z.enum(PROVIDERS),
  apiKey:   z.string().min(20).max(200),
  model:    z.string().max(100).optional().nullable(),
})

function validateKeyFormat(provider: Provider, apiKey: string): string | null {
  if (provider === "anthropic"   && !apiKey.startsWith("sk-ant-")) return "Las claves de Anthropic deben empezar con 'sk-ant-'"
  if (provider === "openai"      && !apiKey.startsWith("sk-"))      return "Las claves de OpenAI deben empezar con 'sk-'"
  if (provider === "openrouter"  && !apiKey.startsWith("sk-or-"))   return "Las claves de OpenRouter deben empezar con 'sk-or-'"
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
      const formatError = validateKeyFormat(input.provider as Provider, input.apiKey)
      if (formatError) {
        const { TRPCError } = await import("@trpc/server")
        throw new TRPCError({ code: "BAD_REQUEST", message: formatError })
      }

      const apiKeyEnc = encryptApiKey(input.apiKey)
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

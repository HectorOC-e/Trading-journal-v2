// One-shot (non-streaming) LLM completion — consumes streamChat to a string using
// the user's resolved provider/key/model (resolve-provider.ts). Needed for jobs
// that want a full answer rather than a UI stream (e.g. thread summarization /
// memory extraction, S6). Returns null when the user has no usable key (callers
// treat memory extraction as best-effort).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { streamChat, type ChatMessage, type SystemBlock } from "./chat"
import { resolveAiCall, usableCandidates } from "./resolve-provider"
import type { AiFeature } from "./feature-models"

export async function completeText(
  prisma: PrismaClient,
  userId: string,
  feature: AiFeature,
  messages: ChatMessage[],
  system?: string | SystemBlock[],
): Promise<string | null> {
  const resolved = await resolveAiCall(prisma, userId, feature)
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) return null

  let lastErr: unknown
  for (const c of candidates) {
    try {
      const stream = await streamChat({ provider: c.provider, apiKey: c.apiKey, model: c.model, messages, system })
      const reader = stream.getReader()
      const dec = new TextDecoder()
      let out = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        out += dec.decode(value, { stream: true })
      }
      return out.trim()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

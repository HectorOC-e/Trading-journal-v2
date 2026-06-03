import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { decryptApiKey } from "@/lib/ai/key-encryption"

type Provider = "anthropic" | "openrouter" | "openai"

// In-memory rate limiter: 5 tests per 60 s per user
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX    = 5
const RATE_LIMIT_WINDOW = 60_000 // ms

function checkRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now   = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now })
    return { allowed: true, retryAfter: 0 }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.windowStart)) / 1000)
    return { allowed: false, retryAfter }
  }
  entry.count++
  return { allowed: true, retryAfter: 0 }
}

async function testAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    })
    if (res.ok) return { valid: true }
    const body = await res.json().catch(() => ({}))
    return { valid: false, error: body?.error?.message ?? `HTTP ${res.status}` }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Network error" }
  }
}

async function testOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { valid: true }
    const body = await res.json().catch(() => ({}))
    return { valid: false, error: body?.error?.message ?? `HTTP ${res.status}` }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Network error" }
  }
}

async function testOpenRouterKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { valid: true }
    const body = await res.json().catch(() => ({}))
    return { valid: false, error: body?.error?.message ?? `HTTP ${res.status}` }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Network error" }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 })
  }

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) {
    return NextResponse.json(
      { valid: false, error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    )
  }

  let body: { provider?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid JSON" }, { status: 400 })
  }

  const provider = body?.provider as Provider | undefined
  if (!provider || !["anthropic", "openrouter", "openai"].includes(provider)) {
    return NextResponse.json({ valid: false, error: "Invalid provider" }, { status: 400 })
  }

  const rawConfig = await prisma.userAiConfig.findUnique({
    where: { userId_provider: { userId: user.id, provider } },
  })

  if (!rawConfig) {
    return NextResponse.json({ valid: false, error: "No API key configured for this provider" }, { status: 404 })
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(rawConfig.apiKeyEnc)
  } catch {
    return NextResponse.json({ valid: false, error: "Failed to decrypt API key" }, { status: 500 })
  }

  let result: { valid: boolean; error?: string }
  if (provider === "anthropic")   result = await testAnthropicKey(apiKey)
  else if (provider === "openai") result = await testOpenAIKey(apiKey)
  else                            result = await testOpenRouterKey(apiKey)

  // Update lastTested and errorLog
  await prisma.userAiConfig.update({
    where: { userId_provider: { userId: user.id, provider } },
    data:  {
      lastTested: new Date(),
      errorLog:   result.valid ? null : (result.error ?? "Unknown error"),
    },
  })

  return NextResponse.json(result)
}

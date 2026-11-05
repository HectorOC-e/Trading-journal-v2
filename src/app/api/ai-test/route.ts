import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/ai/key-encryption";
import { testProviderConnectivity } from "@/lib/ai/health-check";
import { createRateLimiter } from "@/lib/rate-limiter";

type Provider = "anthropic" | "openrouter" | "openai";

const rateLimiter = createRateLimiter();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { valid: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rl = await rateLimiter.check(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        valid: false,
        error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const provider = body?.provider as Provider | undefined;
  if (!provider || !["anthropic", "openrouter", "openai"].includes(provider)) {
    return NextResponse.json(
      { valid: false, error: "Invalid provider" },
      { status: 400 },
    );
  }

  const rawConfig = await prisma.userAiConfig.findUnique({
    where: { userId_provider: { userId: user.id, provider } },
  });

  if (!rawConfig) {
    return NextResponse.json(
      { valid: false, error: "No API key configured for this provider" },
      { status: 404 },
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(rawConfig.apiKeyEnc);
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to decrypt API key" },
      { status: 500 },
    );
  }

  const { valid, error } = await testProviderConnectivity(provider, apiKey);
  const result = { valid, ...(error ? { error } : {}) };

  await prisma.userAiConfig.update({
    where: { userId_provider: { userId: user.id, provider } },
    data: {
      lastTested: new Date(),
      errorLog: result.valid ? null : (result.error ?? "Unknown error"),
    },
  });

  return NextResponse.json(result);
}

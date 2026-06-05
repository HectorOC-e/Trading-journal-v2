# AI Architecture — Trading Journal v2

> **Last Updated: 2026-05-31**  
> Merges the existing ai-architecture-recommendations.md with audit findings. Covers current state, proposed per-user configuration, encryption, cost tracking, privacy, and known issues.

---

## 1. Current AI Architecture Assessment

### Provider Abstraction Layer (`src/lib/ai/`)

| File | Responsibility | Quality |
|---|---|---|
| `config.ts` | Provider detection, key resolution, model defaults | Good — clean priority chain |
| `chat.ts` | Unified streaming chat (Anthropic SDK + OpenAI-compatible) | Good — ReadableStream abstraction |
| `embeddings.ts` | Unified embedding API (OpenAI-compatible only) | Good |

**Provider priority chain:** OpenRouter → Anthropic → OpenAI  
**Graceful degradation:** `isAnyKeyConfigured()` returns false → AI features disabled cleanly with `NO_API_KEY` error

### AI Features Inventory

| Feature | File | Provider | Model Function | Current Default |
|---|---|---|---|---|
| AI Coach (streaming chat) | `api/ai-coach/route.ts` | Any configured | `getCoachModel()` | `claude-sonnet-4-5` (stale) |
| Weekly Review AI Summary | `routers/weekly-reviews.ts:generateSummary` | Any configured | `getWeeklySummaryModel()` | `claude-haiku-4-5-20251001` (suspicious) |
| Trade Note Embeddings | `api/ai-embed/route.ts` | OpenAI / OpenRouter | `getEmbeddingModel()` | `openai/text-embedding-3-small` |
| Trader Context Builder | `domains/analytics/ai-context.ts` | N/A | N/A | Data aggregation only |
| Pattern Detector | `domains/analytics/services/pattern-detector.ts` | N/A | N/A | Rule-based, no LLM |
| Weekly Learning Email | `supabase/functions/weekly-learning-summary/` | Any configured | Coach model | Deno edge runtime |

### Strengths
- Clean provider abstraction; single call site for all AI interaction
- Separate models per feature (coach, embedding, summary)
- Fire-and-forget embedding with best-effort semantics
- `isAnyKeyConfigured()` enables clean feature gating

### Known Issues

| Issue | Location | Severity | Task |
|---|---|---|---|
| Stale coach model ID (`claude-sonnet-4-5`) | `config.ts:~45` | Medium | TASK-032 |
| Suspicious summary model ID (`claude-haiku-4-5-20251001`) | `config.ts:~59` | Medium | TASK-032 |
| Sharpe Ratio re-implemented with population std dev | `ai-context.ts:185–191` | Medium | TASK-027 |
| All keys are server-wide env vars | `config.ts:getProviderKey()` | High | TASK-033 |
| No per-user cost tracking | — | Medium | TASK-033 |
| No connectivity test UI or endpoint | — | Medium | TASK-033 |
| Trader context rebuilt on every request | `ai-context.ts` | Low | Future |
| No retry logic or circuit breaker | `chat.ts` | Low | Future |
| Fire-and-forget embedding may fail in serverless | `routers/trades.ts:scheduleEmbedding()` | Medium | TD-020 |

---

## 2. Per-User API Key Storage — Recommended Architecture

### Architecture Decision

**Recommended:** Per-user encrypted key storage with env-var fallback.

```
User request → AI route handler
  → Try: UserAiConfig (per-user key if configured)
  → Fallback: process.env (global key)
  → Final fallback: return NO_API_KEY error
```

This enables:
- **SaaS multi-tenant:** users bring their own keys (BYOK)
- **Single-tenant self-hosted:** env vars only (current mode)
- **Hybrid:** admin provides default key; power users override

### Proposed Database Schema

Add to `schema.prisma`:

```prisma
// ── USER AI CONFIGURATION ────────────────────────────────────────────────────
// Per-user AI provider preferences and encrypted API keys.
// Keys are encrypted at rest using AES-256-GCM with a server-side key.
// model overrides: empty string = use system default.
// ─────────────────────────────────────────────────────────────────────────────
model UserAiConfig {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @unique @map("user_id") @db.Uuid

  // Provider preference
  preferredProvider   String   @default("system") @map("preferred_provider")
  // "system" | "anthropic" | "openrouter" | "openai"

  // Encrypted API keys (null = use system default)
  anthropicKeyEnc     String?  @map("anthropic_key_enc")
  openrouterKeyEnc    String?  @map("openrouter_key_enc")
  openaiKeyEnc        String?  @map("openai_key_enc")

  // Model overrides (empty string = use system default)
  coachModel          String   @default("") @map("coach_model")
  embeddingModel      String   @default("") @map("embedding_model")
  summaryModel        String   @default("") @map("summary_model")

  // Feature toggles
  aiCoachEnabled      Boolean  @default(true)  @map("ai_coach_enabled")
  embeddingsEnabled   Boolean  @default(false) @map("embeddings_enabled")

  // Usage tracking (aggregate)
  totalTokensUsed     Int      @default(0) @map("total_tokens_used")
  lastUsedAt          DateTime? @map("last_used_at")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_ai_configs")
}
```

Add relation to `User` model: `aiConfig UserAiConfig?`

---

## 3. Key Encryption Implementation

```typescript
// src/lib/ai/key-encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_HEX   = process.env.AI_KEY_ENCRYPTION_KEY ?? ""  // 32-byte hex env var

export function encryptApiKey(plaintext: string): string {
  const key = Buffer.from(KEY_HEX, "hex")
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":")
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":")
  const key = Buffer.from(KEY_HEX, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8")
}
```

### Updated Provider Key Resolution

```typescript
// src/lib/ai/config.ts — new getProviderKeyForUser()
export async function getProviderKeyForUser(
  provider: AiProvider,
  userId: string,
  prisma: PrismaClient,
): Promise<string> {
  const userConfig = await prisma.userAiConfig.findUnique({
    where: { userId },
    select: { anthropicKeyEnc: true, openrouterKeyEnc: true, openaiKeyEnc: true },
  })

  const encKey = {
    anthropic:  userConfig?.anthropicKeyEnc,
    openrouter: userConfig?.openrouterKeyEnc,
    openai:     userConfig?.openaiKeyEnc,
  }[provider]

  if (encKey) return decryptApiKey(encKey)   // user's own key
  return getProviderKey(provider)            // system fallback
}
```

---

## 4. Per-User Model Configuration

### Model Resolution Hierarchy

```
1. User's explicit model override (UserAiConfig.coachModel if non-empty)
2. System env var (AI_COACH_MODEL)
3. Provider-default model (claude-sonnet-4-6)
```

### Model Catalog

```typescript
// src/lib/ai/models.ts

export const COACH_MODELS = [
  {
    id:              "claude-opus-4-5",
    label:           "Claude Opus (Máxima calidad)",
    provider:        "anthropic",
    tier:            "premium",
    costPer1kTokens: 0.015,
  },
  {
    id:              "claude-sonnet-4-6",        // current recommended
    label:           "Claude Sonnet (Recomendado)",
    provider:        "anthropic",
    tier:            "standard",
    costPer1kTokens: 0.003,
  },
  {
    id:              "claude-haiku-4-5",
    label:           "Claude Haiku (Rápido y económico)",
    provider:        "anthropic",
    tier:            "fast",
    costPer1kTokens: 0.00025,
  },
  {
    id:              "openai/gpt-4o",
    label:           "GPT-4o (via OpenRouter)",
    provider:        "openrouter",
    tier:            "standard",
    costPer1kTokens: 0.005,
  },
]

export const SUMMARY_MODELS = [
  { id: "claude-haiku-4-5",   label: "Claude Haiku (recomendado)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
]
```

---

## 5. AI Configuration UI Spec (Profile Page Section)

### Section: "Inteligencia Artificial"

```
┌──────────────────────────────────────────────────────────────────────┐
│  INTELIGENCIA ARTIFICIAL                                              │
│                                                                       │
│  ┌─ Estado de la conexión ─────────────────────────────────────────┐ │
│  │  ● Conectado via OpenRouter            [Probar conexión]        │ │
│  │  Modelo: Claude Sonnet 4.6 · Latencia: 340ms                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  API Key                                                              │
│  ─────────────────────────────────────────────────────────────────── │
│  Proveedor preferido: [ OpenRouter ▼ ]  [ Anthropic ]  [ OpenAI ]    │
│                                                                       │
│  OpenRouter API Key:  [••••••••••••••••••••••••]  [Actualizar]      │
│  Anthropic API Key:   [   (usando clave del sistema)   ]            │
│  OpenAI API Key:      [   (no configurada)             ]            │
│                                                                       │
│  Nota: Si configuras tu propia clave, se usará solo para ti.        │
│  Los costos corren por tu cuenta. Las claves se almacenan cifradas. │
│                                                                       │
│  Modelo del Coach                                                     │
│  ─────────────────────────────────────────────────────────────────── │
│  [ Claude Sonnet 4.6 (Recomendado) ▼ ]                               │
│    • Alta calidad · ~$0.003/1k tokens                                │
│                                                                       │
│  Modelo de resúmenes semanales                                       │
│  [ Claude Haiku 4.5 (Rápido) ▼ ]                                    │
│    • Muy económico · ~$0.00025/1k tokens                            │
│                                                                       │
│  Funciones                                                            │
│  ─────────────────────────────────────────────────────────────────── │
│  [▣] AI Coach habilitado                                              │
│  [□] Embeddings semánticos (requiere key OpenAI)                     │
│                                                                       │
│  Uso estimado                                                         │
│  ─────────────────────────────────────────────────────────────────── │
│  Este mes: 12,450 tokens · aprox. $0.037                            │
│  Histórico: 48,200 tokens · aprox. $0.14                            │
│                                                                       │
│  [Guardar configuración]                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### tRPC Procedures Needed

```typescript
// src/server/trpc/routers/ai-config.ts

aiConfig: router({
  get: protectedProcedure.query(...)
  // Returns: config with keys MASKED (last 4 chars only shown)

  update: protectedProcedure.input(z.object({
    preferredProvider: z.enum(["system", "anthropic", "openrouter", "openai"]).optional(),
    anthropicKey:  z.string().optional(),   // will be encrypted before storage
    openrouterKey: z.string().optional(),
    openaiKey:     z.string().optional(),
    coachModel:    z.string().optional(),
    summaryModel:  z.string().optional(),
    aiCoachEnabled:     z.boolean().optional(),
    embeddingsEnabled:  z.boolean().optional(),
  })).mutation(...)

  testConnection: protectedProcedure.query(...)
  // Sends "Responde solo 'OK'" with maxTokens: 5, returns { status, provider, latencyMs }

  getUsage: protectedProcedure.query(...)
  // Returns monthly and all-time token counts from AiUsageLog
})
```

---

## 6. Connectivity Test Endpoint

```typescript
// src/app/api/ai-test/route.ts

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const start = Date.now()
  try {
    const stream = await streamChat({
      model:     getCoachModel(),
      messages:  [{ role: "user", content: "Responde solo 'OK'" }],
      maxTokens: 5,
    })

    // Drain stream
    const reader = stream.getReader()
    let output = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      output += new TextDecoder().decode(value)
    }

    return NextResponse.json({
      status:    "connected",
      provider:  detectProvider(getCoachModel()),
      model:     getCoachModel(),
      latencyMs: Date.now() - start,
      response:  output.trim(),
    })
  } catch (err) {
    return NextResponse.json({
      status:    "error",
      provider:  detectProvider(getCoachModel()),
      model:     getCoachModel(),
      error:     err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    }, { status: 200 })  // Always 200; client reads status field
  }
}
```

---

## 7. Cost Tracking Per User

### Token Usage Tracking

```typescript
// Updated streamChat signature:
export async function streamChat(
  opts: StreamChatOptions,
  onUsage?: (tokens: { input: number; output: number }) => void,
): Promise<ReadableStream<Uint8Array>>

// For Anthropic: final_message contains usage.input_tokens + usage.output_tokens
// For OpenAI/OpenRouter: usage.prompt_tokens + usage.completion_tokens in last SSE chunk
```

### Cost Tracking Schema

```prisma
model AiUsageLog {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  feature      String   // "coach" | "summary" | "embedding"
  provider     String   // "anthropic" | "openrouter" | "openai"
  model        String
  inputTokens  Int      @map("input_tokens")
  outputTokens Int      @map("output_tokens")
  costUsdMicro Int      @map("cost_usd_micro")  // stored as millionths of $1
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("ai_usage_logs")
}
```

**Display:** Monthly and all-time token counts + estimated cost in the AI Config UI. Optional soft alert if estimated cost > $5/month.

---

## 8. Rate Limiting Design

```typescript
// src/lib/ai/rate-limit.ts

const LIMITS = {
  coachMessagesPerHour:     20,
  summaryGenerationsPerDay: 10,
  embeddingsPerDay:         100,
}
```

**Implementation options:**
1. Redis/Upstash counter (preferred for low latency)
2. `AiUsageLog` table query with time-window (simpler, already needed for cost tracking)

Rate limit exceeded → throw `TRPCError({ code: "TOO_MANY_REQUESTS" })` with retry-after header.

---

## 9. Privacy and Security Considerations

### API Key Security

| Risk | Mitigation |
|---|---|
| Keys stored in plaintext | Encrypt with AES-256-GCM; server-side `AI_KEY_ENCRYPTION_KEY` env var |
| Server-side key compromise | Rotate `AI_KEY_ENCRYPTION_KEY`; re-encrypt all stored keys |
| Keys exposed in client bundle | Never return decrypted keys; return only masked preview (last 4 chars) |
| Keys in server logs | Ensure no logging of request bodies in AI routes |
| Keys in error messages | Catch and sanitize errors before returning to client |

### Trader Data Sent to AI

The `buildTraderContext()` function in `ai-context.ts` sends:
- Aggregate stats: total trades, win rate, avg R, P&L
- Last 5 trade records: symbol, direction, P&L, tags (no notes text)
- Behavioral patterns (rule-based, no PII)
- Learning resource counts

**Not sent:** Account names, broker names, specific dollar amounts per trade, trade notes text.

### Data Minimization Recommendations
- Never send trade `notes` text to AI provider (use embeddings for semantic search instead)
- Offer "private mode" where AI coach is disabled and no data leaves the app
- Allow users to purge `AiUsageLog` from profile data export
- Add explicit consent checkbox in AI Config UI

---

## 10. Implementation Roadmap for AI Improvements

### Immediate (Sprint 1–2) — TASK-032
- Fix stale model IDs: `claude-sonnet-4-5` → `claude-sonnet-4-6`
- Verify `claude-haiku-4-5-20251001` against Anthropic API
- Fix `ai-context.ts:185` to call `calcSharpeRatio` from `lib/formulas.ts` (TASK-027)
- Fix `api/ai-coach/route.ts:106` error message mismatch (TASK-026)

### Phase XI (Weeks 5–14) — TASK-033
1. Add `UserAiConfig` model to `schema.prisma`; create migration
2. Add `AiUsageLog` model to `schema.prisma`
3. Implement `src/lib/ai/key-encryption.ts`
4. Update `config.ts` with `getProviderKeyForUser()`
5. Create `src/server/trpc/routers/ai-config.ts`
6. Create `src/app/api/ai-test/route.ts`
7. Add "Inteligencia Artificial" section to profile page
8. Wire `onUsage` callback in `streamChat` to insert `AiUsageLog`
9. Add `AI_KEY_ENCRYPTION_KEY` to `.env.example`

### Future
- Trader context caching (5-minute TTL per user)
- Reliable embeddings via DB webhook (replace fire-and-forget)
- Batch re-embedding job when embedding model changes
- Rate limiting implementation
- AI coach proactive nudges from pattern detector

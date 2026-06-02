# AI Architecture Recommendations — Trading Journal v2

> **Date:** 2026-05-31  
> **Scope:** Current AI architecture assessment + per-user key storage + model config + connectivity test + cost tracking + privacy

---

## 1. Current AI Architecture Assessment

### Provider Abstraction Layer

The codebase has a clean multi-provider abstraction at `src/lib/ai/`:

| File | Responsibility | Quality |
|---|---|---|
| `config.ts` | Provider detection, key resolution, model defaults | Good |
| `chat.ts` | Unified streaming chat (Anthropic SDK + OpenAI-compatible) | Good |
| `embeddings.ts` | Unified embedding API (OpenAI-compatible only) | Good |

**Strengths:**
- Provider priority chain: OpenRouter → Anthropic → OpenAI
- Graceful degradation when no key is configured (`isAnyKeyConfigured()`)
- Separate models per feature (coach, embedding, summary)
- Clean streaming abstraction returning `ReadableStream<Uint8Array>`

**Weaknesses:**
1. All keys are server-wide env vars — no per-user configuration possible
2. No per-user cost tracking or rate limiting
3. No connectivity test UI or endpoint
4. Model IDs may be stale (`claude-sonnet-4-5` in `getCoachModel()` — should be `claude-sonnet-4-6`)
5. `ai-context.ts:185` re-implements Sharpe Ratio instead of calling `calcSharpeRatio` from `lib/formulas.ts`
6. Trader context is re-built on every request — no caching layer
7. No retry logic or circuit breaker pattern

### AI Features Inventory

| Feature | File | Provider | Model |
|---|---|---|---|
| AI Coach (streaming chat) | `api/ai-coach/route.ts` | Any configured | `getCoachModel()` |
| Weekly Review AI Summary | `routers/weekly-reviews.ts:generateSummary` | Any configured | `getWeeklySummaryModel()` |
| Trade Note Embeddings | `api/ai-embed/route.ts` | OpenAI/OpenRouter | `getEmbeddingModel()` |
| Trader Context Builder | `domains/analytics/ai-context.ts` | N/A (data aggregation) | N/A |
| Pattern Detector | `domains/analytics/services/pattern-detector.ts` | N/A (rule-based) | N/A |
| Weekly Learning Summary | `supabase/functions/weekly-learning-summary/` | Any configured | Coach model |

---

## 2. Per-User API Key Storage — Recommendation

### Architecture Decision

**Recommended approach: Per-user encrypted key storage with env-var fallback.**

```
User request → AI route handler
  → Try: UserAiConfig (per-user key if configured)
  → Fallback: process.env (global key)
  → Final fallback: return NO_API_KEY error
```

This enables:
- SaaS multi-tenant mode (users bring their own keys)
- Single-tenant self-hosted mode (env vars only)
- Hybrid mode (admin provides key as default; power users override)

### Proposed Database Schema

Add to `schema.prisma`:

```prisma
// ── USER AI CONFIGURATION ────────────────────────────────────────────────────
// Stores per-user AI provider preferences and encrypted API keys.
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

  // Consent and visibility
  aiCoachEnabled      Boolean  @default(true)  @map("ai_coach_enabled")
  embeddingsEnabled   Boolean  @default(false) @map("embeddings_enabled")

  // Usage tracking
  totalTokensUsed     Int      @default(0) @map("total_tokens_used")
  lastUsedAt          DateTime? @map("last_used_at")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_ai_configs")
}

// Attach relation to User model:
// aiConfig  UserAiConfig?
```

### Key Encryption Implementation

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
// src/lib/ai/config.ts — updated getProviderKeyForUser()

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

  if (encKey) return decryptApiKey(encKey)  // user's own key

  return getProviderKey(provider)           // system fallback
}
```

---

## 3. Per-User Model Configuration

### Model Resolution Hierarchy

```
1. User's explicit model override (UserAiConfig.coachModel if non-empty)
2. System env var (AI_COACH_MODEL)
3. Provider-default model (claude-sonnet-4-6 / anthropic/claude-sonnet-4-6)
```

### Model Catalog

Present to users a curated list with cost/quality labels:

```typescript
// src/lib/ai/models.ts

export const COACH_MODELS = [
  {
    id:       "claude-opus-4-5",
    label:    "Claude Opus (Máxima calidad)",
    provider: "anthropic",
    tier:     "premium",
    costPer1kTokens: 0.015,
  },
  {
    id:       "claude-sonnet-4-6",
    label:    "Claude Sonnet (Recomendado)",
    provider: "anthropic",
    tier:     "standard",
    costPer1kTokens: 0.003,
  },
  {
    id:       "claude-haiku-4-5",
    label:    "Claude Haiku (Rápido y económico)",
    provider: "anthropic",
    tier:     "fast",
    costPer1kTokens: 0.00025,
  },
  {
    id:       "openai/gpt-4o",
    label:    "GPT-4o (via OpenRouter)",
    provider: "openrouter",
    tier:     "standard",
    costPer1kTokens: 0.005,
  },
]

export const SUMMARY_MODELS = [
  { id: "claude-haiku-4-5",         label: "Claude Haiku (recomendado)", ... },
  { id: "openai/gpt-4o-mini",       label: "GPT-4o Mini",                ... },
]
```

---

## 4. AI Configuration UI Spec (Profile Page Section)

### Section: "Inteligencia Artificial"

```
┌──────────────────────────────────────────────────────────────────────┐
│  INTELIGENCIA ARTIFICIAL                                              │
│                                                                       │
│  ┌─ Estado de la conexión ───────────────────────────────────────┐   │
│  │  ● Conectado via OpenRouter                [Probar conexión]  │   │
│  │  Modelo: Claude Sonnet 4.6 · Latencia: 340ms                  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  API Key                                                              │
│  ──────────────────────────────────────────────────────────────────  │
│  Proveedor preferido:  [ OpenRouter ▼ ]  [ Anthropic ]  [ OpenAI ]   │
│                                                                       │
│  OpenRouter API Key:  [••••••••••••••••••••••••]  [Actualizar]       │
│  Anthropic API Key:   [   (usando clave del sistema)   ]             │
│  OpenAI API Key:      [   (no configurada)             ]             │
│                                                                       │
│  Nota: Si configuras tu propia clave, se usará solo para ti.         │
│  Los costos corren por tu cuenta. Las claves se almacenan cifradas.  │
│                                                                       │
│  Modelo del Coach                                                     │
│  ──────────────────────────────────────────────────────────────────  │
│  [ Claude Sonnet 4.6 (Recomendado) ▼ ]                               │
│    • Alta calidad · ~$0.003/1k tokens                                │
│                                                                       │
│  Modelo de resúmenes semanales                                       │
│  [ Claude Haiku 4.5 (Rápido) ▼ ]                                     │
│    • Muy económico · ~$0.00025/1k tokens                            │
│                                                                       │
│  Funciones                                                            │
│  ──────────────────────────────────────────────────────────────────  │
│  [▣] AI Coach habilitado                                              │
│      Conversación con IA basada en tus datos de trading.            │
│  [□] Embeddings semánticos                                            │
│      Búsqueda semántica de tus notas de trades (requiere key OpenAI) │
│                                                                       │
│  Uso estimado                                                         │
│  ──────────────────────────────────────────────────────────────────  │
│  Este mes: 12,450 tokens · aprox. $0.037                             │
│  Histórico: 48,200 tokens · aprox. $0.14                             │
│                                                                       │
│  [Guardar configuración]                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### tRPC Procedures Needed

```typescript
// New router: src/server/trpc/routers/ai-config.ts

aiConfig: router({
  get: protectedProcedure.query(...)          // Return config (keys masked)
  update: protectedProcedure.input(...).mutation(...)  // Save config
  testConnection: protectedProcedure.query(...)         // Ping AI provider
  getUsage: protectedProcedure.query(...)     // Return token usage stats
})
```

---

## 5. Connectivity Test Endpoint Design

### Endpoint: `GET /api/ai-test`

```typescript
// src/app/api/ai-test/route.ts

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const start = Date.now()
  try {
    // Send a minimal test message
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
      status:     "connected",
      provider:   detectProvider(getCoachModel()),
      model:      getCoachModel(),
      latencyMs:  Date.now() - start,
      response:   output.trim(),
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

## 6. Cost Tracking Per User

### Token Usage Tracking

Intercept token usage at the `streamChat` level:

```typescript
// Updated streamChat signature:
export async function streamChat(
  opts: StreamChatOptions,
  onUsage?: (tokens: { input: number; output: number }) => void,
): Promise<ReadableStream<Uint8Array>>

// For Anthropic: stream final_message contains usage.input_tokens + usage.output_tokens
// For OpenAI/OpenRouter: usage.prompt_tokens + usage.completion_tokens in last SSE chunk
```

### Cost Tracking Table

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

### Usage Display

Show monthly and all-time token counts in the AI Config UI section (spec above). Optionally add a soft monthly spending alert (e.g., warn if estimated cost > $5/month).

---

## 7. Privacy and Security Considerations

### API Key Security

| Risk | Mitigation |
|---|---|
| Keys stored in plaintext | Encrypt with AES-256-GCM using server-side key (`AI_KEY_ENCRYPTION_KEY` env var) |
| Server-side key compromise | Rotate `AI_KEY_ENCRYPTION_KEY`; re-encrypt all stored keys |
| Keys exposed in client bundle | Never return decrypted keys to client; return only masked preview (last 4 chars) |
| Keys in server logs | Ensure no logging of request bodies in AI routes |
| Keys in error messages | Catch and sanitize errors before returning to client |

### Trader Data Sent to AI

The `buildTraderContext()` function in `ai-context.ts` sends to the AI provider:
- Total trades count, win rate, avg R, P&L (aggregate)
- Last 5 trade records (symbol, direction, P&L, tags)
- Detected behavior patterns
- Learning resource counts

**Not sent:** Account names, broker names, specific dollar amounts per trade, notes text (only aggregate).

**Recommendation:** Add explicit consent checkbox in AI Config UI — "I consent to sending anonymized trading performance data to [Provider Name] to enable AI coaching."

### Data Minimization

Current context is already relatively lean. Future improvements:
- Never send trade `notes` text to the AI provider (use embeddings for similarity search instead)
- Offer a "private mode" where the AI coach is disabled and no data leaves the app
- Allow users to purge AI usage logs from the profile data export

### Rate Limiting

Currently no rate limiting on AI endpoints. Add per-user rate limiting:

```typescript
// src/lib/ai/rate-limit.ts

const LIMITS = {
  coachMessagesPerHour:   20,
  summaryGenerationsPerDay: 10,
  embeddingsPerDay:       100,
}
```

Use a Redis/Upstash counter or the existing `AiUsageLog` table with a time-window query.

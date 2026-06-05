# AI Configuration Consistency — Audit & Fix Report

**Fecha:** 2026-06-05
**Síntoma reportado:** Proveedor por defecto = OpenRouter, API Key guardada, pero el Chat/Coach mostraba *"Configuración pendiente. Configura ANTHROPIC_API_KEY para activar el coach."*

---

## 1. Causa raíz

**La capa de CONSUMO de IA seleccionaba proveedor y API key exclusivamente desde variables de entorno, ignorando por completo la configuración persistida del usuario** (`user_ai_settings` + `user_ai_configs`).

Existía un motor de resolución correcto (`resolveFeatureModel` en `feature-models.ts`) que sí leía la config del usuario y devolvía `{ provider, model }`. Pero los call-sites **descartaban el `provider` resuelto** y solo pasaban el `model`, y `streamChat` entonces:

1. **Re-detectaba** el provider con `detectProvider(model)` — basado en `process.env`.
2. **Obtenía la key** con `getProviderKey(provider)` — solo `process.env`.

`src/lib/ai/chat.ts` (antes):
```ts
const provider = detectProvider(opts.model)   // ← env-based
const key      = getProviderKey(provider)      // ← env-only, ignora user_ai_configs
```

`src/lib/ai/config.ts` — `detectProvider` cae a un default hardcodeado:
```ts
if (process.env.OPENROUTER_API_KEY) return "openrouter"
if (process.env.ANTHROPIC_API_KEY)  return "anthropic"
if (process.env.OPENAI_API_KEY)     return "openai"
return "anthropic"   // ← default cuando NO hay env vars
```

**Secuencia del fallo (config real de producción):**
`user_ai_settings.default_provider = openrouter`, `default_model = "openai/gpt-oss-120b:free"`, key OpenRouter guardada en `user_ai_configs`, **sin** env vars.
1. El resolver devuelve `provider=openrouter, model="openai/gpt-oss-120b:free"`.
2. `coach-service` descartaba el provider y pasaba solo el model a `streamChat`.
3. `detectProvider("openai/gpt-oss-120b:free")`: el modelo tiene "/", busca `OPENROUTER_API_KEY` en env → no existe → cae a `return "anthropic"`.
4. `getProviderKey("anthropic")` → `""`. Y el gate `isAnyKeyConfigured()` (env) → `false`.
5. → `NO_API_KEY` → UI: *"Configura ANTHROPIC_API_KEY"*.

La key del usuario en `user_ai_configs` **nunca se leía** en el camino de consumo.

---

## 2. Inconsistencias detectadas

| # | Inconsistencia | Ubicación | Estado |
|---|----------------|-----------|--------|
| 1 | `streamChat` re-detecta el provider desde env, ignorando el resuelto | `lib/ai/chat.ts:19` | ✅ Corregido |
| 2 | Key obtenida solo de env (`getProviderKey`), ignora `user_ai_configs` | `lib/ai/chat.ts:20`, `lib/ai/embeddings.ts` | ✅ Corregido |
| 3 | Gate `isAnyKeyConfigured()` (env-only) en coach y weekly-reviews | `api/ai-coach/route.ts:17`, `weekly-reviews.ts:187` | ✅ Corregido |
| 4 | Default hardcodeado `"anthropic"` en `detectProvider` | `lib/ai/config.ts` | ✅ Eliminado del camino de consumo |
| 5 | Mensaje hardcodeado "ANTHROPIC_API_KEY" en UI y error de reviews | `ai-coach-drawer.tsx:185`, `weekly-reviews.ts:188` | ✅ Corregido (genérico, dirige a Ajustes) |
| 6 | `coach-service` descartaba `primary.provider` | `lib/ai/coach-service.ts:94` | ✅ Corregido |
| 7 | Embeddings: key/baseUrl resueltos solo desde env | `lib/ai/embeddings.ts`, `trades.ts`, `ai-embed/route.ts` | ✅ Corregido |
| 8 | **Features fantasma**: `trade_analysis`, `psychology_analysis`, `learning_insights`, `review_generation` son configurables en la UI pero **ningún call-site las consume** | `ai-models-card.tsx` vs. código | ⚠️ Documentado (ver §6) |

**No-hallazgos** (verificado): Playbook, Dashboard Insights, Trade Analysis, Psychology y Learning **no llaman a ningún LLM** — son heurísticas/cálculos locales (`domains/analytics`). Los únicos consumidores de LLM hoy son: **Coach Chat** (`ai_chat`), **Weekly Reviews** (`weekly_reviews`) y **Embeddings** (`embeddings`).

---

## 3. Configuration Resolution Engine (nuevo, unificado)

Se creó **`src/lib/ai/resolve-provider.ts`** como el ÚNICO punto que decide, para un usuario y una feature: **provider + modelo + API key**.

**Orden de resolución de key (por provider):**
1. Key **persistida** del usuario en `user_ai_configs` (descifrada) → `source: "user"`
2. **Variable de entorno** de plataforma → `source: "env"`
3. Ninguna → `source: "none"`

**Orden de resolución de modelo/provider** (ya existía, ahora siempre honrado):
```
Modelo por feature (override)
      ↓ (si vacío/auto)
Modelo global por defecto
      ↓ (si "auto")
Ladder por costPriority (quality/speed/cost)
      + Fallback global (si configurado y distinto)
```

API pública:
- `resolveAiCall(prisma, userId, feature)` → `{ primary, fallback }` con provider+model+apiKey+source cada uno.
- `usableCandidates(call)` → candidatos con key (primary, luego fallback).
- `resolveEmbeddingCall(prisma, userId)` → maneja el caso especial de embeddings (Anthropic no tiene API de embeddings → modelos "/" enrutan por OpenRouter→OpenAI).
- `buildAiDiagnostics(prisma, userId)` → snapshot efectivo para la UI.
- `NoApiKeyError` → error tipado cuando no hay key usable.

`streamChat` y `embedText` ahora reciben **provider + apiKey explícitos**; ya no leen `process.env` ni adivinan el provider por el nombre del modelo.

---

## 4. Casos validados (tests unitarios — `__tests__/lib/resolve-provider.test.ts`)

| Caso | Escenario | Resultado esperado | ✅ |
|------|-----------|--------------------|----|
| 1 | OpenRouter, sin fallback, sin feature models | provider=openrouter + modelo global, 1 candidato usable | ✅ |
| 2 | Feature models vacíos | usa modelo global, nunca falla | ✅ |
| 3 | Fallback vacío | sin fallback, sin error, usa primary | ✅ |
| 4 | Feature sin modelo (`auto`) | resuelve por ladder (openrouter+speed → `anthropic/claude-haiku-4-5`); override por feature tiene precedencia | ✅ |
| + | Orden de key: user → env → none | correcto | ✅ |
| + | Embeddings: modelo "/" enruta por key OpenRouter | correcto | ✅ |

---

## 5. Mejoras implementadas

### AI Diagnostics (`aiConfig.diagnostics`)
Nueva query tRPC + sección **"Diagnóstico IA"** en Ajustes → Modelos de IA. Muestra:
- **Proveedor / Modelo / Fallback / Prioridad efectivos.**
- **Estado de API Keys** por provider: `Clave de usuario` / `Variable de entorno` / `No configurada`.
- **Resolución por funcionalidad** (features activas): provider + modelo + origen de la key.

### AI Health Check (`aiConfig.healthCheck`)
Botón **"Verificar configuración IA"** que resuelve el provider+modelo+key efectivos y **valida conectividad real** contra el proveedor (`testProviderConnectivity` en `lib/ai/health-check.ts`), devolviendo el resultado real (modelos detectados o el error del proveedor) y persistiendo `lastTested`/`errorLog`.

---

## 6. Riesgos / Notas

- **Features fantasma:** la UI de "Modelos por funcionalidad" expone `trade_analysis`, `psychology_analysis`, `learning_insights`, `review_generation`, que hoy **no se consumen**. La sección de Diagnóstico ahora lo aclara explícitamente ("solo Chat, Reviews y Embeddings consumen IA en vivo"). No se eliminaron para no perder configuración guardada; cuando se implementen esas features, ya tienen resolución lista.
- **Código env-helper ahora sin uso en consumo:** `detectProvider`, `isAnyKeyConfigured`, `isEmbeddingAvailable`, `getCoachModel`, `getWeeklySummaryModel`, `getEmbeddingModel` en `config.ts` quedan sin uso en el camino de consumo (solo `getProviderKey` se usa como fallback de entorno). Se conservan por compatibilidad; candidatos a limpieza futura.
- **Compatibilidad:** se mantiene el fallback a variables de entorno, por lo que despliegues que usan claves de plataforma (sin config de usuario) siguen funcionando.

---

## 7. Resultado de pruebas

### Tests
```
Test Files  42 passed (42)
Tests      540 passed (540)
```
Incluye 8 tests nuevos del motor de resolución (`resolve-provider.test.ts`) y `coach-service.test.ts` actualizado al nuevo contrato. `tsc --noEmit` limpio.

### Validación end-to-end contra PRODUCCIÓN (solo-lectura)
Config real del usuario: `default_provider=openrouter`, `default_model="openai/gpt-oss-120b:free"`, key OpenRouter guardada.

```
RESOLVED:     { provider: openrouter, model: openai/gpt-oss-120b:free, keySource: user, keyPrefix: sk-or-v1… }
CONNECTIVITY: { provider: openrouter, http: 200, ok: true, detectedModels: 346 }
RESULT: ✓ la key OpenRouter del usuario autentica — el coach transmite vía OpenRouter
```

**Antes:** el coach/reviews leían env → provider "anthropic" → "Configura ANTHROPIC_API_KEY".
**Después:** Coach Chat, Weekly Reviews y Embeddings usan el provider, modelo y key configurados por el usuario.

---

## 8. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/ai/resolve-provider.ts` | **NUEVO** — motor unificado provider+modelo+key + diagnósticos |
| `lib/ai/health-check.ts` | **NUEVO** — verificador de conectividad por provider |
| `lib/ai/chat.ts` | `streamChat` recibe provider+apiKey explícitos (sin env/detección) |
| `lib/ai/embeddings.ts` | `embedText` recibe model+apiKey explícitos |
| `lib/ai/coach-service.ts` | usa `resolveAiCall` + cadena primary→fallback + `NoApiKeyError` |
| `server/trpc/routers/ai-config.ts` | `diagnostics` query + `healthCheck` mutation |
| `server/trpc/routers/weekly-reviews.ts` | gate consciente del usuario + threading provider+key |
| `server/trpc/routers/trades.ts` | embeddings vía `resolveEmbeddingCall` |
| `app/api/ai-coach/route.ts` | gate env → manejo de `NoApiKeyError` |
| `app/api/ai-embed/route.ts` | embeddings vía `resolveEmbeddingCall` |
| `app/perfil/components/ai-models-card.tsx` | sección Diagnóstico IA + botón Verificar |
| `components/ai-coach/ai-coach-drawer.tsx` | mensaje genérico (no hardcodea ANTHROPIC) |
| `__tests__/lib/resolve-provider.test.ts` | **NUEVO** — 8 tests (casos 1-4 + key order) |
| `__tests__/lib/coach-service.test.ts` | actualizado al nuevo contrato |

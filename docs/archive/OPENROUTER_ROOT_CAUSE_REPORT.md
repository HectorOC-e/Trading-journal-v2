# OpenRouter — Root Cause Report

**Fecha:** 2026-06-05
**Proyecto Supabase:** `Trading Journal` (`jpojusluihjjsjvcubdp`, us-east-2, Postgres 17)
**Estado:** ✅ Resuelto y verificado end-to-end contra producción.

---

## 1. Resumen ejecutivo

El error **no** era de OpenRouter, ni del formato de la clave, ni de
`AI_KEY_ENCRYPTION_SECRET`, ni del frontend.

**La tabla `user_ai_configs` —donde se almacenan las API keys cifradas— nunca
existió en la base de datos de producción.** Por lo tanto, *cualquier*
`prisma.userAiConfig.upsert()` fallaba con el error Postgres `42P01`
("relation `public.user_ai_configs` does not exist"). Ese error técnico era
luego enmascarado por el formateador de errores del frontend y convertido en el
mensaje genérico **"Error interno. Intenta de nuevo o contacta soporte"**.

OpenRouter fue el provider que expuso el bug porque es el único cuya clave el
usuario **debe guardar por la UI**. Anthropic y OpenAI "funcionaban" únicamente
porque sus claves se inyectan por variables de entorno
(`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) y nunca necesitan persistirse.

---

## 2. Causa raíz exacta

### El error real detrás del mensaje genérico

```
ERROR: 42P01: relation "public.user_ai_configs" does not exist
```

Lanzado por Postgres al ejecutar el `upsert` en:

`src/server/trpc/routers/ai-config.ts:79`
```ts
const result = await ctx.prisma.userAiConfig.upsert({   // ← falla aquí (42P01)
  where:  { userId_provider: { userId: ctx.userId, provider: input.provider } },
  ...
})
```

### Por qué se mostraba un mensaje genérico

Esta línea está **fuera** del `try/catch` que protege el cifrado
(`ai-config.ts:66-78`). El catch solo captura errores de `encryptApiKey`. El
error de Prisma sube sin envolver; tRPC lo wrappea como `INTERNAL_SERVER_ERROR`
con un mensaje técnico (contiene "prisma"/"does not exist"). En el cliente,
`src/lib/error-formatter.ts` lo clasifica como técnico
(`isTechnicalMessage`, líneas 19-33) → descarta el mensaje real → cae al mapeo
por código:

`src/lib/error-formatter.ts:11`
```ts
INTERNAL_SERVER_ERROR: "Error interno. Intenta de nuevo o contacta soporte",
```

### Por qué la tabla no existía

La tabla se declaró en `src/prisma/schema.prisma:569` (`model UserAiConfig`)
durante **Sprint 5 (commit `cf02efe`)**, pero ese commit **solo modificó el
schema de Prisma** — no se escribió ninguna migración SQL. El proyecto aplica a
producción **migraciones SQL escritas a mano** (`src/prisma/migrations/001…013`),
y nunca hubo una migración para esta tabla (hay incluso un hueco en la
numeración: no existe `005`). Resultado: la tabla solo vivía en el schema de
Prisma; producción jamás la tuvo.

### Evidencia de producción (antes del fix)

```sql
SELECT to_regclass('public.user_ai_configs');  -- → NULL  (no existe)
SELECT to_regclass('public.user_ai_settings');  -- → user_ai_settings (sí existe)
```
`information_schema.tables` confirmó que en `public` existían 21 tablas,
**ninguna** llamada `user_ai_configs`; solo `user_ai_settings` (de la
migración 012).

---

## 3. Línea de código / artefacto responsable

| Tipo | Ubicación | Problema |
|------|-----------|----------|
| **Causa raíz** | `src/prisma/schema.prisma:569` (modelo declarado) **sin** migración SQL correspondiente | La tabla nunca se creó en producción |
| Punto de fallo en runtime | `src/server/trpc/routers/ai-config.ts:79` (`prisma.userAiConfig.upsert`) | Lanza Postgres `42P01` |
| Enmascaramiento | `src/lib/error-formatter.ts:11,19-33` | Convierte el error técnico real en "Error interno…" |

---

## 4. Hipótesis evaluadas

| # | Hipótesis | Veredicto |
|---|-----------|-----------|
| 1 | La API Key se usa como llave de cifrado | ❌ Descartada — `getEncryptionKey` solo lee `AI_KEY_ENCRYPTION_SECRET` |
| 2 | OpenRouter validado con reglas de otro provider | ❌ `validateKeyFormat` ya soporta `sk-or-`/`sk-or-v1-` correctamente |
| 3 | Restricción de longitud de columna incorrecta | ❌ `api_key_enc` es `text` (sin límite) |
| 4 | El servicio de cifrado lee la API Key como secret | ❌ Separados; el secret ya estaba configurado |
| 5 | Bug en el provider mapping | ❌ El mapping es correcto |
| 6 | `AI_KEY_ENCRYPTION_SECRET` no llega al runtime | ❌ El cifrado funciona (verificado por test) |
| 7 | El frontend envía payload incorrecto | ❌ Payload `{ provider, apiKey }` correcto |
| 8 | **Migración incompleta** | ✅ **CONFIRMADA — la tabla `user_ai_configs` nunca se migró a producción** |

---

## 5. Corrección aplicada

### a) Migración faltante (creada y aplicada a producción)

> **Nota (política de migraciones):** la migración quedó consolidada en el sistema
> versionado del proyecto como
> `supabase/migrations/20260605043438_create_user_ai_configs.sql`. La carpeta
> huérfana `src/prisma/migrations/` fue eliminada y el repo se reconcilió con la
> historia canónica de Supabase. Ver `docs/DATABASE_MIGRATIONS.md`.

Contenido (réplica exacta del modelo Prisma, idempotente, additiva):

```sql
CREATE TABLE IF NOT EXISTS user_ai_configs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT         NOT NULL,
  api_key_enc TEXT         NOT NULL,
  model       TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  last_tested TIMESTAMP(3),
  error_log   TEXT,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_ai_configs_user_id_provider_key
  ON user_ai_configs (user_id, provider);
CREATE INDEX IF NOT EXISTS user_ai_configs_user_id_idx
  ON user_ai_configs (user_id);
```

Aplicada vía Supabase `apply_migration` (`create_user_ai_configs`) → `success: true`.

**No se desactivó ninguna validación, ni se hardcodeó, ni se hizo bypass.**
La compatibilidad con OpenRouter / Anthropic / OpenAI se mantiene intacta.

### b) Mejora: botón "Probar conexión" por proveedor

`src/app/perfil/page.tsx` — botón **Probar conexión** para cada provider con
clave guardada, que llama al endpoint ya existente `POST /api/ai-test`. Muestra
el resultado real del API del proveedor:
- ✅ "Conexión exitosa con `<provider>`"
- ❌ "Falló la conexión: `<error real devuelto por la API>`"

(El endpoint `src/app/api/ai-test/route.ts` ya implementaba el test correcto:
OpenRouter → `GET https://openrouter.ai/api/v1/models` con
`Authorization: Bearer <key>`, conforme a la documentación oficial.)

---

## 6. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260605043438_create_user_ai_configs.sql` | **NUEVO** — migración versionada que crea la tabla (sistema canónico) |
| `supabase/migrations/` (35 archivos más) | Reconciliación: historia canónica completa materializada en el repo |
| `supabase/config.toml` | **NUEVO** — vincula el repo al proyecto, habilita `db reset`/`db push` |
| `src/prisma/migrations/` | **ELIMINADA** — carpeta huérfana/desincronizada (causa de la divergencia) |
| `docs/DATABASE_MIGRATIONS.md` | **NUEVO** — política y flujo de migraciones |
| Base de datos de producción | Tabla `user_ai_configs` creada (PK, FK→users CASCADE, índice único `(user_id, provider)`, índice `(user_id)`) |
| `src/app/perfil/page.tsx` | Botón "Probar conexión" + handler `testConnection()` |

---

## 7. Resultado de las pruebas

### Verificación del esquema en producción (después del fix)

```
to_regclass('public.user_ai_configs') → "user_ai_configs"   ✓
```
Columnas: `id, user_id, provider, api_key_enc, model, is_active, last_tested,
error_log, created_at, updated_at` ✓
Constraints: `user_ai_configs_pkey` (PK id) ✓,
`user_ai_configs_user_id_fkey` (FK users CASCADE) ✓.

### Roundtrip completo con clave OpenRouter (formato real `sk-or-v1-…`)

Ejecutado contra la **BD de producción** usando la lógica real de cifrado:

| Paso | Resultado |
|------|-----------|
| 1. Validación de formato (`sk-or-v1-…`) | ✅ pasa |
| 2. Cifrado AES-256-GCM | ✅ `iv:tag:ciphertext` (200 chars) |
| 3. Persistencia (`upsert` real con `ON CONFLICT (user_id, provider)`) | ✅ fila creada (antes fallaba con 42P01) |
| 4. Recuperación desde la BD | ✅ ciphertext idéntico |
| 5. Descifrado | ✅ `sk-or-v1-0123…abcd` |
| 6. Comparación con original | ✅ **MATCHES ORIGINAL: YES** |

> La fila de prueba se eliminó tras la verificación — producción quedó limpia.

### Suite de tests

```
__tests__/lib/key-encryption.test.ts   ✓
__tests__/routers/ai-config.test.ts     ✓
Test Files  2 passed (2)
Tests      29 passed (29)
```

`tsc --noEmit`: sin errores en los archivos tocados.
`eslint app/perfil/page.tsx`: 0 errores (solo advertencias preexistentes, no
relacionadas).

---

## 8. Evidencia de funcionamiento (flujo completo)

```
CIPHERTEXT (AES-256-GCM):
  e33824b90c03def06bd13b6d:94105dfcda3775364261a041fb8d8d92:898300ed02...1721dc88

INSERT ... ON CONFLICT (user_id, provider) DO UPDATE ... RETURNING:
  { provider: "openrouter", model: "anthropic/claude-sonnet-4-6",
    is_active: true, enc_len: 200 }        ← persistencia OK (antes: 42P01)

DECRYPTED FROM PROD DB: sk-or-v1-0123456789abcdef...0123456789abcd
MATCHES ORIGINAL      : YES ✓
```

---

## 9. Nota / deuda relacionada

El proyecto mantenía **dos fuentes de verdad** para el esquema: el
`schema.prisma` y unas migraciones SQL hechas a mano y huérfanas. Esa divergencia
fue la causa raíz.

**Resuelto:** se adoptó el **Supabase CLI** como sistema único y versionado de
migraciones. El repo se reconcilió con la historia canónica de producción
(36 migraciones en `supabase/migrations/`), se añadió `supabase/config.toml`, y
se eliminó la carpeta huérfana `src/prisma/migrations/`. Ahora `supabase db reset`
reconstruye el esquema completo desde cero solo con el repo. Política y flujo en
`docs/DATABASE_MIGRATIONS.md`.

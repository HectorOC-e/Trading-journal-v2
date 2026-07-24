# Diseño — resiliencia de IA sobre el free tier (sin modelos de pago)

> Fecha: 2026-07-24 · Estado: diseño aprobado, plan pendiente.
> Contexto: el usuario decidió seguir en modelos **gratuitos** mientras dura la etapa de pruebas.
> Este sprint es **código, no gasto**: hace usable el free tier, no lo sustituye.
> IDs de arquitectura tocados: ninguno. No se revoca ninguna decisión congelada.

## 1. Punto de partida (verificado contra código y prod, 2026-07-24)

**El mecanismo de fallback existe pero está vacío.** `completeText` (`complete.ts:24-40`) y los otros
call-sites iteran `usableCandidates` con try/catch: si un modelo falla, prueban el siguiente. Pero en
producción **ambos usuarios tienen `fallback_provider` y `fallback_model` a `NULL`**
(`user_ai_settings`), y `resolveModelForFeature` sólo construye un fallback si ambos están puestos
(`feature-models.ts:128`). Resultado: `usableCandidates` devuelve **un solo candidato**, el bucle no
tiene a dónde caer, y un 500 transitorio de `openrouter/free` llega directo al usuario.

**No hay reintento en ningún sitio.** Ni con backoff ni sin él.

**Embeddings no tienen siquiera el mecanismo.** `resolveEmbeddingCall` (`resolve-provider.ts:105`)
devuelve **un** `ResolvedCall`, no una lista. Y `embedText` (`embeddings.ts:18`) devuelve `null` ante
cualquier fallo: `if (!res.ok) return null` y un `catch {}` mudo. No distingue "no hay clave" de "429
transitorio". Es la forma exacta del bug #156 —3 recursos con notas, 0 embebidos, en silencio— que
`FREEZE-P2` existe para impedir.

**El error no es clasificable.** `streamChat` lanza `new Error("openrouter chat error 429: ...")`
(`chat.ts:117`): el status HTTP viaja **dentro del texto**. Hoy es imposible distinguir por
programa un 429 transitorio de un 401 por clave mala.

### Dónde está duplicado, exactamente

`usableCandidates` tiene **7 call-sites**; el **bucle** de candidatos está en **5**:

| Módulo | Lista vacía → | Devuelve |
|---|---|---|
| `coach-service.ts:170` | lanza `NoApiKeyError` | `ReadableStream` |
| `analytics-insights-service.ts:60` | lanza `NoApiKeyError` | `ReadableStream` |
| `psychology-insights-service.ts:40` | lanza `NoApiKeyError` | `ReadableStream` |
| `complete.ts:20` | devuelve `null` | `string` |
| `review-ai.ts:71` (`runReviewAnalysis`) | `throw streamErr ?? Error("AI stream failed")` | `string` |

Los dos restantes (`weekly-reviews.ts:141`, `monthly-reviews.ts:199`) sólo construyen candidatos —
lanzan `TRPCError PRECONDITION_FAILED` si está vacía — y delegan en `runReviewAnalysis`.
`ensure-analysis.ts:34` es el llamador **de fondo** de ese mismo camino.

**Los contratos difieren y deben preservarse.** Añadir retry a mano en cinco sitios produce cinco
comportamientos sutilmente distintos. Es la lección de #156 (la resolución del modelo de embeddings
vivía en cuatro copias) aplicada **antes** de que muerda.

### El defecto que apareció de paso, y que explica un síntoma

`coach-service.ts:178-190` tiene un `try` **anidado** dentro del bucle: si `streamCoachAgent` (la
ruta agéntica, con tools) falla, el `catch` interno lo interpreta como *"este modelo no soporta
tools"* y cae a `streamChat`, la ruta estática **sin herramientas**.

Ese catch no discrimina la causa. **Un 429 transitorio degrada el Coach a modo sin tools, en
silencio.** El usuario ve un Coach que "no usa las herramientas" y concluye que el modelo gratuito no
es capaz — cuando lo que pasó fue un rate limit. Clasificar el error corrige el síntoma y, de paso,
limpia el terreno para la auditoría de tool-use que viene después.

## 2. Objetivo y no-objetivos

Hacer que un hipo transitorio del free tier **no** se convierta en un fallo visible ni en una
degradación silenciosa, y que cuando algo falle de verdad quede constancia de **por qué**.

No-objetivos, declarados:

- **Calidad de redacción.** Requiere modelos de pago; aplazado por decisión del usuario.
- **Fallos a mitad de stream** (`chat.ts:157`). Ver §7.
- **Caché de respuestas** y **límite de gasto**: no aplican en free tier.

## 3. Arquitectura: un ejecutor, un comportamiento

Módulo nuevo `src/lib/ai/execute.ts`. Posee lo que hoy está cinco veces: iterar candidatos,
reintentar, esperar, registrar.

```ts
executeAiCall<T>(
  candidates: ResolvedCall[],
  profile: RetryProfile,
  run: (candidate: ResolvedCall) => Promise<T>,
  meta: { feature: AiFeature },
): Promise<T>
```

Genérico sobre `T`: `run` devuelve un `ReadableStream` en unos call-sites y un `string` en otros, y
el ejecutor no sabe nada de chat ni de embeddings. **Sólo conoce candidatos, política y fallo.**

**Los contratos de lista vacía NO se mueven al ejecutor.** Cada call-site sigue decidiendo qué hacer
con `candidates.length === 0` — `NoApiKeyError`, `null` o `TRPCError` — porque esa decisión es del
llamador, no del transporte. El ejecutor recibe una lista ya no vacía. Esto mantiene el diff acotado
y evita que un refactor de resiliencia cambie, de rebote, la semántica de error de cinco features.

**Inyección de la espera.** El ejecutor recibe su función de espera (`sleep`) por parámetro con
default real. Sin eso los tests del backoff tardarían segundos de reloj, y un test lento se acaba
borrando.

## 4. La cadena de modelos gratuitos

`usableCandidates` (ya compartido por los 7 call-sites) pasa a componer:

1. el primario del usuario,
2. su fallback, si lo configuró,
3. **la cadena gratuita por defecto**,

deduplicando por `provider + model` y conservando el orden. Los 7 call-sites ganan la cadena larga
**sin tocar ni una línea** de ellos.

Los ids viven en **una sola constante exportada**, con el comentario de que caducan y de dónde se
revisan. **El plan debe verificarlos contra el catálogo real de OpenRouter antes de fijarlos**: hoy
prod usa `openrouter/free` —que es un *meta-router* sobre modelos gratuitos, no un modelo— y
`openai/gpt-oss-20b:free`. Una cadena de tres alias del mismo modelo no es una cadena; hace falta
**diversidad real de proveedor upstream**, o el rate limit que tumba al primero tumba a los tres.

Sólo se añaden candidatos **con clave utilizable**: la cadena por defecto es de OpenRouter, así que
si el usuario no tiene clave de OpenRouter no aporta nada y la lista queda como hoy.

## 5. Clasificación del error y política de reintento

**Error tipado.** `streamChat` y `embedText` pasan a lanzar un error que lleva el status **estructurado**
(no embebido en el texto). El ejecutor decide con él:

| Situación | ¿Reintentar? | Por qué |
|---|---|---|
| 429 | Sí | Rate limit: el caso más común del free tier, se resuelve solo |
| 5xx | Sí | Hipo del proveedor |
| Error de red / sin status | Sí | Indistinguible de un hipo; el coste de reintentar es bajo |
| 400 | No | Petición mal formada: no mejora esperando |
| 401 / 403 | No | Clave mala o sin permiso: reintentar sólo retrasa el fallo real |

Un error no reintentable **corta el reintento sobre ESE candidato, pero no la cadena**: se pasa al
siguiente. Un 401 en un modelo no dice nada sobre el siguiente si usa otra clave.

**Dos perfiles, elegidos por el CALL-SITE, no por la feature.** `weekly_reviews` se llama desde un
router (`weekly-reviews.ts:141`, usuario esperando) **y** desde un cron (`ensure-analysis.ts:34`,
nadie esperando). Atar el perfil a la feature sería atarlo al sitio equivocado.

| Perfil | Reintentos por candidato | Backoff | Quién lo usa |
|---|---|---|---|
| `interactive` | 1 | corto, con techo de latencia total | Coach, analytics, psicología, reviews desde router |
| `background` | 3 | exponencial con jitter | crons, embeddings, `ensure-analysis` |

**El jitter no es adorno.** El dispatcher del outbox y los crons disparan en lote; sin jitter sus
reintentos se sincronizan contra el mismo rate limit y lo reproducen.

El perfil interactivo lleva **techo de latencia total**: agotar la cadena entera con esperas ante un
usuario que mira un spinner es peor que fallar rápido.

**Parámetros que el PLAN debe fijar con valores concretos**, no diferir:

- el retardo base y el multiplicador del backoff, y el rango del jitter;
- el techo de latencia del perfil interactivo, en milisegundos;
- los ids exactos de la cadena gratuita, **verificados contra el catálogo de OpenRouter** (§4).

Ninguno admite "se ajusta después": un número sin fijar en el plan acaba siendo un número inventado
en la implementación.

## 6. Embeddings

Es el camino con peor comportamiento hoy y el que más se beneficia.

- `resolveEmbeddingCall` pasa a devolver **lista de candidatos** (misma composición que §4), no uno.
- `embedText` **lanza** el error tipado en vez de devolver `null` ante un fallo. Sigue devolviendo
  `null` en los casos que **no** son fallo: sin clave, sin modelo, texto vacío. La distinción es el
  punto: hoy los cuatro casos colapsan al mismo `null`.
- Los llamadores usan `executeAiCall` con perfil `background`.
- `scheduleEmbedding` y `recordEpisode` siguen siendo **best-effort hacia fuera**: no propagan. Lo
  que cambia es que reintentan antes de rendirse.

La taxonomía de 5 estados del pipeline de recuperación ya distingue `EMBED_FAILED` de `NOT_INDEXED`;
esto la vuelve **fiable** en vez de colapsar todo a "no indexado".

## 7. Lo que NO se maneja, a propósito

**Fallos a mitad de stream.** `chat.ts:115-118` lanza **antes** de devolver el stream: ahí el status
se conoce y ningún token llegó al usuario — es el momento recuperable, y es donde actúa todo este
diseño. Un fallo posterior (`chat.ts:155-157`) hace `controller.error()` con texto ya en pantalla;
reintentar significaría contradecirse ante el usuario. Recuperarlo es otro diseño (reanudación
parcial) y no se fuerza aquí.

## 8. Observabilidad

**Log estructurado, sin tabla nueva.** Cada intento fallido registra `feature`, `provider`, `model`,
`status`, `attempt` y si fue clasificado como reintentable. El agotamiento de la cadena registra un
error con la **causa real**, no un genérico.

Consultable por Vercel MCP, que funciona en esta máquina. Cero esquema, cero RLS, cero crecimiento
que podar. Es exactamente lo que habría evitado los dos diagnósticos falsos de julio
(`psychology_analysis` reportada rota, 200 quince minutos después).

**Se descarta persistir en tabla** por ahora: mientras sólo hay dos usuarios de prueba, el log cubre
la necesidad y una tabla nueva es peso —migración dual, RLS, poda— sin lector.

## 9. Testing

Puro y con TDD; **verificar el ROJO antes de implementar**.

1. **Clasificación**: 429/5xx/red → reintentable; 400/401/403 → no.
2. **Backoff**: con temporizadores falsos y `sleep` inyectado. Progresión exponencial, jitter
   **acotado** (dentro de su rango), y el techo de latencia del perfil interactivo se respeta.
3. **Cadena**: fallo transitorio agota los reintentos de un candidato y pasa al siguiente · un error
   no reintentable pasa al siguiente candidato **sin** agotar reintentos · cadena agotada propaga la
   **causa real**, no un error genérico · éxito en el 2º candidato no reintenta el 1º.
4. **Composición**: `usableCandidates` añade la cadena por defecto, deduplica por `provider+model`,
   respeta el orden y no añade candidatos sin clave.
5. **Contrato de los call-sites**: la lista vacía sigue produciendo `NoApiKeyError` / `null` /
   `TRPCError` según el sitio. Red de no-regresión del refactor.
6. **Guarda anti-duplicación**: ningún call-site itera candidatos por su cuenta — para que las cinco
   copias no vuelvan.
7. **`active-ai-features.test.ts` debe seguir verde**: deriva las features activas de los call-sites
   reales y rompe si divergen. El refactor los toca, así que es red de seguridad directa.

**Disciplina:** suite completa antes de cada push (hoy 1333); los 2 fallos de `sentry-wiring` son los
conocidos por `@sentry/nextjs` ausente en local.

## 10. Criterios de éxito

- Un 429 o 5xx transitorio deja de ser visible: se reintenta o se cae al siguiente modelo gratuito.
- El Coach ya **no** se degrada a modo sin tools por un fallo transitorio.
- Los embeddings reintentan antes de rendirse y distinguen "no pude" de "no hay nada".
- Cuando algo falla de verdad, el log dice qué modelo, qué status y en qué intento.
- Existe **un** comportamiento de reintento, no cinco.
- Cero gasto: todos los eslabones de la cadena son gratuitos.

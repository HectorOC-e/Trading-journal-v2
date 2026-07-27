# El bucle agéntico del Coach: reintento por ronda y cierre garantizado

> Spec de diseño. Fecha: 2026-07-27.
> Ámbito: `src/lib/ai/coach-agent.ts` (181 LOC) y su call-site en `src/lib/ai/coach-service.ts`.
> Antecedente directo: PR #171 (resiliencia de IA sobre el free tier), cuyo límite declarado
> —"todo actúa antes del primer token"— es exactamente el hueco que esta pieza cierra.

## 1. El problema

El síntoma que reporta el trader es *"el Coach no aprovecha sus herramientas"*. El tuning **no** es
la causa: las 12 descripciones de tools y la regla de selección del system prompt están bien
(auditado el 2026-07-24; #168 se sostiene). La causa es mecánica, y son tres defectos.

### D1 — Las rondas 2+ fallan en silencio y sin reintento

`coach-agent.ts:131-134`, rama OpenRouter:

```ts
if (round > 0) {
  res = await doFetch()
  if (!res.ok || !res.body) break     // ← 429/500 → stream truncado, sin error, sin reintento
}
```

Un 429 en cualquier ronda posterior a la primera sale del bucle sin señal. El trader ve una
respuesta corta que **parece completa**. Sobre free tier tiene que estar ocurriendo.

**Es un hueco de #171, no un olvido.** `execute.ts:12-15` declara su frontera de forma explícita:
*"everything here happens BEFORE the first token"*. El `executeAiCall` que envuelve la llamada del
Coach (`coach-service.ts:195`) sólo cubre el pre-flight de `coach-agent.ts:115`. Todo lo que ocurre
dentro del `ReadableStream` cae al otro lado de esa frontera.

**Sólo afecta a la rama OpenRouter.** La rama Anthropic usa `client.messages.stream()`, que *lanza*
en vez de devolver un `Response` inspeccionable; ese throw cae en el `catch` de `:81` →
`controller.error(err)`, y el SDK ya reintenta 429/5xx por su cuenta (`max_retries: 2`). Ya falla de
forma visible. Añadirle `executeAiCall` encima sería doble reintento.

### D2 — Agotar `MAX_ROUNDS` corta sin respuesta

Si en la última ronda el modelo pide herramientas, el código las **ejecuta**, mete los resultados en
la conversación… y el `for` termina → `controller.close()`. El modelo nunca llega a responder con
esos datos. El trader ve "consultando" y después nada.

Está en **ambas** rutas: OpenRouter (`:130-177`) y Anthropic (`:57-80`, misma forma — el `for`
acaba justo después de empujar `results` a `convo`).

### D3 — Cero cobertura directa

Los únicos consumidores de `coach-agent` son `coach-service.ts:4` y `coach-service.test.ts:10`, que
lo **mockea**. 181 líneas que deciden si las tools funcionan, sin un solo test que las ejerza. Es el
mismo patrón que dejó pasar los bugs de `createTrade` / `buildContext` / `persistInsights`, y el que
hizo que la suite verde no probara nada en el cambio de contrato de `embedText` (#171).

## 2. El hecho que gobierna el diseño

**El `catch (agentErr)` de `coach-service.ts:211` no puede ver ningún fallo de ronda 2+.**

Para cuando corre la ronda 2, `streamCoachAgent` ya **devolvió** el `ReadableStream`; el
`start(controller)` corre después, de forma asíncrona. Ni el `try/catch` del `run:`, ni
`shouldDegradeToStatic`, ni el `executeAiCall` externo siguen en el camino.

De ahí se derivan las dos decisiones estructurales, y no son preferencias:

1. El reintento tiene que vivir **dentro** del bucle. No hay nadie fuera que pueda reintentar.
2. La extenuación tiene que salir por **`controller.error`**. No hay nadie fuera que pueda degradar.

## 3. Decisiones

### 3.1 · Reintento en rondas 2+ (sólo OpenRouter)

`doFetch` pasa a **lanzar** `AiCallError` en vez de devolver un `Response` malo, y la llamada se
envuelve en `executeAiCall` con **un solo candidato** y perfil `interactive`:

```ts
res = await executeAiCall({
  candidates: [opts.candidate],   // uno solo: no reenrutar a mitad de conversación
  profile:    "interactive",      // el trader mira el spinner
  feature:    "ai_chat",
  run: async () => {
    const r = await doFetch(toolChoice)
    if (!r.ok || !r.body) throw new AiCallError({
      status: r.status, provider, model,
      kind: "chat",
      detail: await r.text().catch(() => ""),
    })
    return r
  },
})
```

**Por qué `executeAiCall` y no un helper local.** #171 borró cinco copias del bucle de reintento
precisamente para que no hubiera cinco comportamientos. Un helper local aquí sería la sexta.

**Por qué un solo candidato.** Cambiar de modelo con bloques `tool_use` ya en el historial invalida
la caché de prompt y arrastra incompatibilidades de formato entre proveedores. La cadena gratuita
es correcta *antes* de la primera petición (ADR-003 §444), no a mitad de conversación.

**Por qué `kind: "chat"` y no `"tools"`.** `"tools"` es la señal que le dice al llamador *"este
modelo no sabe function calling, degrada a estático"* (`shouldDegradeToStatic`). A mitad de stream
esa degradación es imposible —ya hay texto en pantalla— y además inalcanzable por §2. Marcarlo
`"tools"` documentaría una intención que no puede ocurrir. Nótese que `shouldDegradeToStatic` **no
filtra por `kind`**: sólo mira status; la protección real es §2, y el `kind` correcto evita que un
refactor futuro que uniera ambos caminos degradara por accidente.

Si `executeAiCall` se agota, lanza; el `catch` de `:178` hace `controller.error(err)`.

### 3.2 · Agotar rondas fuerza una respuesta final (ambas rutas)

```ts
const isLast = round === MAX_ROUNDS - 1
// OpenRouter: tool_choice: isLast ? "none" : "auto"
// Anthropic:  tool_choice: isLast ? { type: "none" } : undefined
```

En la última ronda el modelo **no puede** pedir herramientas, así que responde con lo recopilado y
el `break` que ya existe (`calls.size === 0` en OpenRouter, `stop_reason !== "tool_use"` en
Anthropic) dispara solo. No hay rama nueva que mantener.

> ⚠️ **Trampa de implementación.** El pre-flight de `coach-agent.ts:115` **es** la ronda 0: su
> `Response` se reutiliza como `res` en la primera vuelta del bucle. Al parametrizar `doFetch` con
> el `tool_choice` hay que pasar `"auto"` explícitamente en ese call-site; olvidarlo manda la
> ronda 0 con `tool_choice: undefined`. Con `MAX_ROUNDS = 5` la ronda 0 nunca es la última, así que
> `isLast` sólo es cierto en la ronda 4 — que sí es un `fetch` fresco dentro del bucle.

**El modo de fallo queda eliminado por construcción, no evitado:** el bucle no *puede* terminar sin
texto. Es la misma forma de la inyección de handlers de #170 — no una comprobación que haya que
acordarse de hacer.

**Techo de 5 peticiones, igual que hoy.** Se descartó la alternativa de conservar las 5 rondas con
tools y añadir una 6ª petición de síntesis: sobre free tier, la petición de rescate llegaría justo
cuando el modelo ya lleva 5 y es cuando más probable es un 429 — la ronda de rescate sería la de
mayor riesgo de fallar. El precio aceptado: en el caso de agotamiento el modelo dispone de 4 rondas
de tools en vez de 5.

**No se omiten los `tools` del cuerpo, se cambia `tool_choice`.** Dos razones. (a) El historial ya
contiene bloques `tool_use`/`tool_result`; mandarlo sin declarar `tools` es terreno resbaladizo.
(b) `coach-service.ts:184` marca el bloque estático del system con `cache: true`: cambiar
`tool_choice` **preserva** la caché de tools+system, mientras que cambiar las definiciones de
`tools` la invalida entera (los `tools` se renderizan en la posición 0 del prefijo).

### 3.3 · Cambio de interfaz

`CoachAgentOptions` sustituye `provider` / `apiKey` / `model` por `candidate: ResolvedCall` (los
mismos tres campos más `source`). `coach-service.ts:202` ya tiene ese objeto en la mano (`c`) y hoy
lo desarma campo a campo para volver a armarlo. Una fuente de verdad en vez de dos, y
`executeAiCall` recibe su candidato sin fabricar un `source` falso.

Dentro de `streamCoachAgent` se desestructura una vez (`const { provider, model, apiKey } =
opts.candidate`), así que el resto del cuerpo no cambia de forma.

### 3.4 · Tests directos de `streamCoachAgent`

TDD con **rojo verificado** antes de implementar: un test que no se ha visto fallar no prueba nada.

La rama OpenRouter es `fetch` puro (`vi.stubGlobal`); la Anthropic entra por
`await import("@anthropic-ai/sdk")` (`vi.mock`). `executeCoachTool` mockeado.

| # | Qué afirma | Ata |
|---|---|---|
| 1 | 429 en ronda 2 → reintenta → stream completo con todo el texto | D1 |
| 2 | 429 persistente en ronda 2 → el stream **falla**; no cierra callado | D1 |
| 3 | 400 en ronda 2 → falla sin quemar reintentos (permanente, no transitorio) | D1 |
| 4 | OpenRouter: el modelo pide tools en la última ronda → esa petición lleva `tool_choice: "none"` y el stream acaba **con texto** | D2 |
| 5 | Anthropic: ídem con `{ type: "none" }` | D2 |
| 6 | Pre-flight fallido sigue lanzando `AiCallError` con `kind: "tools"` | guarda de #171 |
| 7 | `{tool}` se emite ANTES de ejecutar la tool, `{cites}` después | guarda de contrato |
| 8 | Dos llamadas idénticas en un turno → `executeCoachTool` corre una sola vez | guarda de `toolCache` |

El backoff se prueba con reloj y espera **inyectados** (`sleep` / `now` de `executeAiCall`), no con
`sleep` real — igual que en #171.

## 4. Verificado antes de decidir

- **`tool_choice: {type:"none"}` es legal en ambas rutas.** Anthropic lo documenta ("Claude cannot
  use tools"); OpenAI/OpenRouter aceptan `"none"`. Evita tener que omitir `tools` con `tool_use` ya
  en el historial.
- **El cliente ya maneja el error a mitad de stream, sin cambios.**
  `ai-coach-drawer.tsx:218` (`reader.read()`) está dentro de un `try`; un `controller.error()` hace
  que rechace → salta al `catch` de `:262` → `setApiError("BAD_REQUEST")`, y el `finally` de `:265`
  apaga `streaming`. El texto parcial sobrevive porque el mensaje del asistente entra en el estado
  en `:206` y se actualiza por chunk. **Apagar el spinner es lo que mata el síntoma "consultando… y
  luego nada".**

## 5. Fuera de alcance (declarado, no omitido)

- **No se toca el cliente.** Ya funciona (§4).
- **Limitación conocida que se deja viva:** `ai-coach-drawer.tsx:264` fija
  `setApiError("BAD_REQUEST")`, así que el trader ve un aviso genérico sea un 429 o un 500.
  Ensanchar esa taxonomía es otra pieza. Decirlo aquí es más honesto que arreglarlo de tapadillo.
- **No se toca el tuning de prompts ni las descripciones de tools.** #168 se sostiene; esto es
  mecánico. Este arreglo **no prueba** que un modelo de pago no ayudaría a la redacción; arregla el
  fallo mecánico que se leía como torpeza. Los modelos de pago siguen aplazados por decisión del
  usuario (etapa de pruebas).
- **Sin migración, sin cambio de esquema, sin variable de entorno nueva.**
- **No se añade telemetría por ronda.** Se valoró; los logs viven en Vercel, que no es consultable
  desde esta sesión, así que el dato no sería verificable ahora mismo.

## 6. Verificación de la pieza

- Suite vitest **completa** (hoy 1401) antes de cada push, no un subconjunto.
- CI verde, incluido E2E autenticado.
- La auditoría de tool-use **en vivo** con Playwright queda para *después* de esta pieza: con el
  bucle arreglado la señal está limpia y sí distingue "el modelo elige mal sus tools" de "un 429
  disfrazado". Antes del arreglo esa auditoría no puede separar las dos cosas.

# Diseño — recuperación semántica consolidada y citación en el Coach

> Fecha: 2026-07-23 · Rama: `feat/retrieval-semantica-coach`
> Estado: diseño aprobado, pendiente de plan de implementación.
> IDs de arquitectura tocados: `FREEZE-P2` (respetado), `FREEZE-D10` (respetado),
> `ARCHITECTURE.md §6` (no se toca la memoria episódica). Ninguna decisión de §11.1 se revoca.

## 1. Punto de partida: qué era falso y qué era cierto

`STATUS.md` (2026-07-22) afirma que *"`semanticSearch` y `backfillEmbeddings` siguen expuestos sólo
en tRPC, sin ningún consumidor en la app"*. Verificado contra código: **literalmente cierto, pero
engañoso**. Las procedures tRPC no tienen consumidor, pero el Coach **ya tiene la capacidad**
cableada por otra vía, duplicada e independiente.

Estado real medido el 2026-07-23 (código + producción vía Supabase MCP):

| Pieza | Estado |
|---|---|
| `COACH_TOOLS.semantic_search` (`coach-tools.ts:71`, impl. `:308-331`) | cableada al loop agéntico (`coach-agent.ts:12,55,81`), corpus 16/16 embebido |
| `COACH_TOOLS.search_learning_resources` (`:105`, impl. `:433-456`) | **muda**: 4 de 5 recursos tienen notas y **0** están embebidos |
| `trades.semanticSearch` / `trades.backfillEmbeddings` (tRPC) | sin consumidor de UI |
| Chips de transparencia del drawer (`ai-coach-drawer.tsx:453`) | emiten sólo el **nombre** de la tool, ninguna evidencia |
| Implementaciones de búsqueda vectorial | **tres** paralelas + dos caminos de escritura |

**Por qué `search_learning_resources` está muda.** `learning-resources.ts:28` sí embebe al guardar,
pero los 5 recursos se tocaron por última vez el 2026-07-06, antes del arreglo de #156. Existe
`src/scripts/backfill-resource-embeddings.mjs`, standalone, que exige una URL de BD; nadie lo ha
corrido nunca. Es el gemelo exacto del defecto que #156 arregló en trades — sobrevivió porque la
resolución del modelo de embeddings vivía en copias.

**Trampas de método aplicadas durante el diagnóstico** (ambas evitaron un diagnóstico falso):

- Un `grep` de `COACH_TOOLS` **no** mostró `coach-agent.ts`, que sí lo importa en `:12`. Se abrió el
  consumidor. El grep se equivocó; el código manda.
- La afirmación "sin consumidor" se validó grepeando los **imports del módulo** y abriendo cada
  fichero, no el nombre del símbolo.

## 2. Objetivo

Un solo camino de recuperación semántica, sobre ambos corpus, que **no pueda mentir**, y cuya
evidencia el trader pueda leer y abrir desde la conversación con el Coach.

No-objetivos de este sprint: consolidar `/api/ai-embed`; indexar `memory_episodes`; añadir corpus
nuevos (reviews, setups, planes) — el diseño los abarata, no los entrega.

## 3. Decisión de arquitectura: A′ — registro con consultas literales

**Alternativas consideradas.**

- **A (registro con SQL dinámico).** Un `search(corpus, query, limit)` con tabla y columna
  interpoladas. Rechazada **en su forma original**: mete identificadores dinámicos en la única
  consulta cruda del sistema, justo donde ya se interpola el vector.
- **B (un módulo por corpus, dueño de su flujo entero).** Rechazada tras conocer la intención de
  producto: se prevén **varios corpus más** (reviews, setups, planes). Con 4+ corpus, repetir el
  flujo por corpus deja de ser 6 líneas de SQL y pasa a ser lógica duplicada.
- **C (extender `embedding-service` con recursos).** Rechazada: ese fichero vive en
  `server/services/trades/`. Meter ahí búsqueda de aprendizaje es propiedad equivocada — el gesto
  que produjo la divergencia. Arregla el síntoma y conserva la causa.
- **A′ (elegida).** El registro de A, con la seguridad de B: cada adaptador aporta **su propia
  consulta literal**. Extensible sin un solo identificador interpolado.

**Estructura.**

```
src/server/services/retrieval/
  types.ts              CorpusKey · Citation · RetrievalOutcome
  pipeline.ts           search() · reindex() · indexStatus()      ← se escribe UNA vez
  classify.ts           la taxonomía de estados (puro)
  registry.ts           CORPORA: Record<CorpusKey, CorpusAdapter>
  corpora/trade-notes.ts
  corpora/resource-notes.ts
```

Hermano de `server/services/{trades,behavior,memory}/`, que es la estructura vigente. **No** se
cuelga de `domains/cognitive/`: `FREEZE-D2` restringe al Cognitive Engine a eventos y proyecciones,
y esto lee `trades` en crudo. Colocarlo ahí sería reclamar una frontera y violarla en el mismo
commit.

**Reparto de responsabilidad.** El pipeline es genérico y único: resuelve el modelo de embeddings,
embebe la consulta, aplica la taxonomía, ejecuta la auto-reparación, reordena por el orden del hit,
trunca con **una sola constante** y redondea la similitud a 3 decimales. El adaptador no lleva
lógica: aporta consultas literales y forma.

| Miembro del adaptador | Aporta |
|---|---|
| `knn(prisma, userId, vec, limit)` | su tagged template; tabla y columna **escritas a mano** |
| `pending(prisma, userId, limit)` | filas con texto y sin vector |
| `writeVector(prisma, id, vec)` | escritura idempotente del vector |
| `status(prisma, userId)` | `{total, withText, embedded}` |
| `hydrate(prisma, userId, ids)` | el `select` de Prisma |
| `toCitation(row, similarity)` | la forma de la tarjeta |
| `href(id)` | destino de navegación |

Corpus nuevo = un adaptador (~40 líneas, todo literal) + registrarlo. Cero cambios en el pipeline.

> **Aviso de coste, para no subestimar el nº3:** el adaptador es la parte barata. Cada corpus nuevo
> necesita además **migración dual** (columna `vector` + índice + RLS per-usuario, en SQL y en
> Prisma) y su backfill. Presupuéstalo por ahí, no por las 40 líneas.

## 4. Consolidación: qué absorbe y qué se queda fuera

| Hoy | Después |
|---|---|
| `coach-tools.ts:308-331` búsqueda inline de trades | borrada → llama al pipeline |
| `coach-tools.ts:433-456` búsqueda inline de recursos | borrada → llama al pipeline |
| `embedding-service.semanticSearch` | migrada al adaptador `trade-notes` |
| `embedding-service.backfillEmbeddings` | migrada a `pipeline.reindex` |
| `embedding-service.scheduleEmbedding` | migrada al pipeline |
| `learning-resources.ts:20,28` embebe al guardar | pasa a llamar al pipeline |
| `trades.semanticSearch` / `backfillEmbeddings` (tRPC) | **se conservan**, re-cableadas al pipeline |
| `scripts/backfill-embeddings.mjs`, `backfill-resource-embeddings.mjs` | se borran |
| `memory-episode-service.recallEpisodes` | **no se toca** |
| `/api/ai-embed` | **no se toca** — deuda residual declarada |

**Por qué `recallEpisodes` queda fuera y no es una excepción incómoda.** No ordena por similitud:
trae 40 candidatos y los re-rankea con `recallScore({salience, similarity})` sobre saliencia
decaída, y sin clave cae a saliencia sola sin vector alguno (`memory-episode-service.ts:88-120`).
Es la recuperación híbrida que `ARCHITECTURE.md §6` congela para la capa episódica. Meterla en un
`search(corpus, query, limit)` destruiría su razón de ser.

**Por qué `/api/ai-embed` queda fuera.** Es un webhook con secreto compartido, camino de escritura
independiente. Incluirlo amplía el radio de fallo sin servir a la meta. Se declara como deuda
residual en lugar de afirmar una consolidación total que sería falsa.

**Por qué `trades.semanticSearch` se conserva sin consumidor de UI.** Las tarjetas de cita consumen
el pipeline **vía la tool del Coach**, no vía tRPC. Mantenerla cableada al pipeline da una vía de
verificación **independiente del LLM**, que es justo lo que necesita el paso de verificación (§8).

## 5. La tool del Coach y el viaje de una cita

**Una tool, no cinco.** `semantic_search(query, corpus?, limit)` con `corpus` enumerado
(`trade_notes` | `learning_notes`); omitirlo busca en todos y mezcla por similitud. Desaparece
`search_learning_resources`. Con cinco corpus previstos, cinco tools casi idénticas degradan la
elección del modelo; un parámetro enumerado no.

Esto rompe `__tests__/lib/coach-tools.test.ts:8`, que afirma la lista exacta de nombres. Es una
guarda de deriva funcionando: se actualiza, no se silencia.

**Dos consumidores, una consulta.**

- **Al LLM**: texto compacto, sin `href` (presupuesto de contexto, `FREEZE-D10`).
- **Al cliente**: citas estructuradas para las tarjetas.

`executeCoachTool` pasa de devolver `string` a devolver `{ text: string; cites?: Citation[] }`.
Cambio de firma con impacto en ~8 llamadas de test — preferible a que `coach-agent` reparsee el
JSON que la tool acaba de serializar.

**Transporte: dos tramas NUL, no una.** Hoy `coach-agent.ts` emite `\0{"tool":"…"}\0` **antes** de
ejecutar la tool (`:66` Anthropic, `:158` OpenAI-compatible), y es deliberado: alimenta el
`TypingIndicator consulting` (`ai-coach-drawer.tsx:449`) mientras la consulta corre. Mover la
emisión detrás mataría esa señal de vida. Por eso se emite dos veces:

1. `{tool: "semantic_search"}` — inmediata, idéntica a hoy.
2. `{cites: [...]}` — tras ejecutar; se acumula en el mensaje.

Sin ids de correlación: las citas de un mensaje se pintan todas debajo de él, el orden no importa.
Se deduplican por `(corpus, id)`. El parser de `ai-coach-drawer.tsx:219` (`as { tool?: string }`) se
ensancha a `{ tool?: string; cites?: Citation[] }`; el buffer entre chunks ya está resuelto y no se
toca.

**Cuántos resultados.** `limit` por defecto **5**, máximo **10**, y **las citas son todas las filas
devueltas** — no un subconjunto. Es deliberado: si el LLM leyera 8 notas y el trader viera 5
tarjetas, la evidencia mostrada sería menor que la usada, que es una forma suave del mismo problema
que este sprint arregla.

**Forma de una cita:**

| Campo | Trade | Recurso |
|---|---|---|
| `label` | `NQ · LONG` | título |
| `sublabel` | fecha | tipo · estado |
| `outcome` | R y P&L, con color ganancia/pérdida | progreso % |
| `snippet` | nota truncada — **una sola constante** | igual |
| `similarity` | 3 decimales | igual |
| `href` | `/trades?trade=<id>` | `/aprendizaje?resource=<id>` |

La constante única de truncado mata una deriva real ya presente: hoy se trunca a **200** en trades
(`coach-tools.ts:329`) y a **240** en recursos (`:453`). Nadie decidió eso.

**Navegación, siguiendo el patrón de la casa.** `aprendizaje/page.tsx:38-49` ya hace deep-link
client-only con `URLSearchParams` sobre `window.location.search` + `history.replaceState`, evitando
a propósito el requisito de Suspense de `useSearchParams`. Se replica, no se inventa otro:

- **`/trades?trade=<id>`** — `trades/page.tsx:27` siembra `selectedId` en un `useEffect`. Problema
  real: `trades.list` pagina de 50 con cursor, así que el trade citado puede no estar cargado.
  Requiere **`trades.byId`** (procedure nueva, delega en `trade-read-service`) como respaldo.
- **`/aprendizaje?resource=<id>`** — sin ese problema: `learningResources.list` (`:51`) trae todo
  sin paginar y `useResourceActions` ya expone `handleOpen`/`setDrawerResource`. Sólo hay que
  sembrar.

El drawer es global: una cita se pulsa desde cualquier página.

## 6. Taxonomía de estados — el corazón del sprint

El defecto que se arregla no era un error: era un `[]`. `search_learning_resources` devuelve
`{resources: []}` y el LLM lo narra como *"no has anotado nada sobre eso"*. Eso no es un fallo
técnico: es el sistema **afirmando algo falso sobre el trader**, la clase de cosa que `FREEZE-P2`
existe para impedir. Cinco estados hoy indistinguibles:

| Estado | Significado | Redacción hacia el modelo |
|---|---|---|
| `NO_KEY` | sin clave de embeddings | *no pude buscar* — falta configurar |
| `EMBED_FAILED` | la llamada al proveedor falló | *no pude buscar* — transitorio, reintenta |
| `NOT_INDEXED` | hay texto, no hay vectores | *no pude buscar* — hay N sin indexar |
| `EMPTY_CORPUS` | el trader no ha escrito nada | *no hay nada escrito todavía* |
| `NO_MATCHES` | indexado y buscado, sin parecidos | *busqué y no hay nada parecido* |

**Regla vinculante: sólo los dos últimos pueden redactarse como ausencia.** Los tres primeros dicen
*no pude buscar*, nunca *no hay*. Es la diferencia entre un sistema que no sabe y uno que miente.

**Con varios corpus a la vez** (`corpus` omitido) el estado se calcula **por corpus** y se reportan
todos, no sólo el mejor. Si `trade_notes` devuelve 4 resultados y `learning_notes` está en
`NOT_INDEXED`, la tool debe decir ambas cosas. Colapsarlo a "encontré 4" escondería un corpus mudo
detrás de uno sano — que es exactamente el defecto de hoy con otra ropa. Los resultados se mezclan
por similitud (comparable entre corpus por venir del mismo modelo de embeddings); los estados no se
mezclan.

## 7. Auto-reparación y estado visible

**Mecanismo.** Antes de buscar en un corpus se cuentan las filas con texto y sin vector; si hay, se
embeben hasta un tope de **50** y luego se busca.

**Costuras, declaradas.** Una reparación acotada mal contada reintroduce la misma mentira a menor
escala, así que:

- **Pendientes tras el tope** → el resultado lleva `partiallyIndexed: {remaining: n}` y la tool lo
  dice. Sin esto, un import de 500 notas dejaría al Coach opinando sobre una muestra sesgada
  creyéndola completa.
- **Gasto** → cada reparación consume embeddings. Acotado por el tope y visible en `/perfil`.
- **Latencia** → la primera búsqueda tras escribir notas nuevas es más lenta. Aceptado: es el precio
  de que la feature no pueda volver a quedarse muda.
- **Concurrencia** → dos búsquedas simultáneas pueden embeber la misma fila dos veces. La consulta
  filtra `IS NULL` y el `UPDATE ... WHERE id` es idempotente: el peor caso es **gasto duplicado, no
  corrupción**. Se declara en vez de fingir un lock.
- **Fallo de la reparación** → se busca sobre lo que haya y el error se reporta, no se traga.
  Lección literal de #160 y del `catch {}` mudo de `embedding-service.ts:25`, que pasa a loguear
  por `logger`.

**Estado en `/perfil`.** Bloque *"Indexación semántica"* en `ai-models-card.tsx`, junto a
*"Diagnóstico IA"* (`:227`), con una fila por corpus (`Notas de trades — 16/16`, `Apuntes de
aprendizaje — 0/4`) y un botón **"Indexar ahora"** para vaciar el atraso cuando el tope se quede
corto.

Tapa el agujero que `STATUS.md` ya diagnosticó: el diagnóstico actual comprueba que hay clave y que
el chat responde, no que exista un solo vector. #156 hizo que `/perfil` mostrara el modelo de
embeddings correcto; esto añade la dimensión que faltaba — no *"¿puedo embeber?"* sino *"¿he
embebido?"*.

**Procedures nuevas:** `aiConfig.indexStatus` (query) y `aiConfig.reindex` (mutation), colgadas de
`aiConfig` porque la tarjeta ya se alimenta de ese router. *Alternativa descartada:* un router
`retrieval` propio — dos procedures no justifican un router, y partiría en dos la fuente de datos de
una misma tarjeta.

## 8. Testing y verificación

**Hallazgo previo, registrado aquí.** `embedding-service.semanticSearch` desalinea las similitudes:
en `:58-64`, `trades` se filtra por las filas que hidrataron y `similarity` no —

```ts
const ordered = tradeIds.map(id => found.find(t => t.id === id)).filter(t => !!t)  // puede acortarse
return { trades: ordered.map(serializeTrade), similarity: rows.map(r => r.similarity) } // nunca
```

Si un id no hidrata, los arrays paralelos se desplazan y cada trade recibe la similitud del
siguiente. Disparador estrecho (un trade borrado entre las dos consultas), por eso nadie lo ha
visto; `coach-tools.ts:324` no lo tiene porque usa un `Map` por id. **El diseño lo elimina por
construcción** — un solo mapper, siempre por id. Va como caso de regresión, no como PR aparte.

**Puro, con TDD. Se verifica el ROJO antes de implementar.**

1. **Tabla de decisión de la taxonomía** — `classify({hasKey, embedOk, withText, embedded, hits})`.
   *El* test del sprint: con `withText=4, embedded=0, hits=0` debe dar `NOT_INDEXED` y jamás
   `NO_MATCHES`. Ese caso es el estado de producción hoy y es la mentira que se viene a matar.
2. **Conformado del resultado** — orden por hit, dedup por `(corpus, id)`, truncado en la constante
   única, similitud a 3 decimales, y el caso de hidratación incompleta de arriba.
3. **Contrato de adaptadores** — helper compartido corrido **sobre cada corpus registrado**.
   Registrar el corpus nº3 sin `toCitation` o sin `status` rompe la suite. Mismo patrón de guarda de
   deriva que `active-ai-features.test.ts`; es lo que abarata la ambición de cinco corpus.
4. **Cableado de la tool** — actualizar la lista de nombres de `coach-tools.test.ts:8`; un `corpus`
   desconocido se rechaza.

**Lo que no se puede probar en unit, dicho sin adornos.** La consulta pgvector necesita Postgres con
la extensión; mockearla probaría el mock. Se verifica **contra producción** vía Supabase MCP, con
respuesta esperada conocida de antemano:

- `learning_resources`: reindexar y confirmar que el contador pasa de **0/4 a 4/4**.
- `trades`: buscar *"entré antes de tiempo fuera de plan"* y exigir como primer resultado la nota
  *"Ya llevaba horas delante. Entré fuera de plan…"* — el par consulta/respuesta que #156 dejó
  establecido. Es una aserción, no un smoke test.

**En vivo con Playwright:** abrir el drawer, preguntar algo que fuerce recuperación, comprobar que
las tarjetas se pintan y que una navega al trade correcto. **Antes**, comprobar que no haya una
intervención activa: el overlay `fixed inset-0` sin salida mata la automatización y parece un
cuelgue.

**Disciplina:** suite vitest **completa** antes de cada push (1269 hoy, subirá). Los 2 fallos de
`sentry-wiring` y los 9 errores de tsc por `@sentry/nextjs` y `puppeteer-core` ausentes de
`node_modules` **no son regresiones** — en CI pasan.

## 9. Alcance y partición sugerida

El sprint toca `coach-tools`, `coach-agent`, el drawer, dos routers tRPC, `/perfil`, `/trades`,
`/aprendizaje`, y borra dos scripts. Es grande. Frontera natural si el plan lo parte:

1. **Módulo `retrieval` + taxonomía + tests**, sin UI. **Mergeable sola**: deja el sistema mejor
   aunque las otras dos se retrasen.
2. **Re-cableado** de `coach-tools`, los routers tRPC y `/perfil`.
3. **Citas en el drawer** + deep-link (`trades.byId`, `?trade=`, `?resource=`).

## 10. Criterios de éxito

- `search_learning_resources` deja de existir; `semantic_search` cubre ambos corpus.
- Ningún camino puede devolver "sin resultados" cuando la causa real es falta de clave, fallo de
  embedding o ausencia de vectores.
- El contador de recursos indexados pasa de 0/4 a 4/4 en producción.
- El trader lee, bajo la respuesta del Coach, las notas concretas que la sustentan, y puede abrir
  cualquiera de ellas.
- `/perfil` muestra el estado real de indexación por corpus.
- La resolución del modelo de embeddings vive en **un** sitio, no en cuatro.

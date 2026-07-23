# Diseño — primer consumidor S4 del outbox de eventos de dominio

> Fecha: 2026-07-23 · Spec + plan mergeados a `main`; implementación en la próxima sesión.
> Estado: diseño aprobado, plan escrito (`docs/superpowers/plans/2026-07-23-outbox-s4-consumer.md`),
> implementación pendiente.
> IDs de arquitectura: `FREEZE-D1` (outbox+dispatcher), `FREEZE-D6` (outbox = fuente de verdad
> replayable), `FREEZE-EV3/EV5/EV6` (catálogo de eventos), `ARCHITECTURE.md §4`. Ninguna decisión de
> §11.1 se revoca; se cambia la *firma* de `dispatchPending`, no el mecanismo congelado.

## 1. Punto de partida (verificado contra código y prod)

El transporte de eventos existe desde S0 y es sólido, pero **nunca tuvo un consumidor**. La
migración `20260721190000_unschedule_dispatch_events_until_s4.sql` des-agendó el cron
`v3-dispatch-events` a propósito (S0/R-3), así que los eventos se acumulan en `pending` en vez de
quemarse. Este sprint construye el primer consumidor y re-agenda el cron.

**Estado del transporte** (`domains/cognitive/events/event-bus.ts`):

- `publishEvent(tx, {userId, type, payload, dedupeKey?})` — escribe la fila del outbox en la MISMA
  transacción que la mutación de negocio (FREEZE-D6). Productores reales: `insight-store.ts:118`
  (`insight.created`), `commitment-service.ts` (`commitment.created/broken`).
- `dispatchPending(prisma, batchSize=50)` — reclama un batch con `FOR UPDATE SKIP LOCKED`, corre los
  handlers registrados y aplica `planEventTransition`. Idempotente, at-least-once.
- `planEventTransition(event, outcome)` — **máquina de estados pura**, ya testeada: OK → `processed`;
  error → `pending` de nuevo, salvo `attempts >= maxAttempts` → `failed`.

**El gap crítico — trampa serverless.** `registerHandler` puebla un `Map` MUTABLE a nivel de módulo,
y **el endpoint no lo puebla**: `api/cron/dispatch-events/route.ts` sólo importa `dispatchPending`.
En Vercel cada invocación es un lambda que re-importa; si el módulo que registra no está en la
cadena de imports del endpoint, el `Map` está vacío y `dispatchPending` trata todo como "sin handler
→ processed" y **quema los eventos**. Es exactamente el fallo que la migración de des-agendado
documentó. El diseño lo resuelve de raíz, no lo hereda.

**Eventos en `pending` (prod, 2026-07-23):** `insight.created` ×12, `commitment.created` ×2,
`commitment.broken` ×2. Total 16, todos `pending`, ninguno `processed`.

**Payloads** (`event-types.ts`) — punteros mínimos, como corresponde a FREEZE-D6:
`insight.created` = `{insightId}`; `commitment.*` = `{commitmentId}`. Cada handler carga su entidad.

## 2. Objetivo

Estrenar el outbox con **dos consumidores reales y observables**, resolviendo el gap de registro de
handlers, y re-agendar el cron — sin que ningún evento se pierda ni se queme.

No-objetivos: ordenamiento causal estricto (fuera de alcance, ver §7); consumidores de otros eventos
del catálogo (trade.*, account.*, checkin.*, intervention.* — no hay productores activos hoy).

## 3. Decisión de arquitectura: inyección de handlers (opción B)

**Alternativas consideradas.**

- **A — `Map` global poblado por side-effect en el import.** Rechazada: es el diseño que produjo el
  bug. Depende de que el import con efecto secundario no se elimine por tree-shaking y del orden de
  evaluación. Frágil en serverless/bundler.
- **B — inyección explícita: `dispatchPending(prisma, HANDLERS, batchSize?)`. ELEGIDA.** Se elimina
  el `Map` mutable global y `registerHandler`. Un mapa **estático** `HANDLERS` se importa y se pasa.
  Sin estado global mutable, sin dependencia del orden de import, testeable (mapa falso). El import
  *es* el registro: no hay ventana donde una lambda corra con el registro vacío.
- **C — `dispatchPending` importa el registro directamente.** Rechazada: el transporte pasaría a
  conocer a los consumidores concretos (dirección de dependencia equivocada). El event-bus debe ser
  agnóstico de qué reacciona.

**Estructura.**

```
src/domains/cognitive/events/
  event-bus.ts              dispatchPending(prisma, handlers, batchSize?) — recibe el mapa
  handlers/
    index.ts                HANDLERS: Partial<Record<DomainEventType, EventHandler[]>>  ← composición
    memory-handler.ts       commitment.created/broken → recordEpisodeOnce
    notification-handler.ts insight.created → emitNotification
```

**Tres cambios en `event-bus.ts`, alineados con FREEZE-D1/D6:**

1. `dispatchPending(prisma, handlers, batchSize=50)` recibe el mapa en vez de leer el `Map` global.
2. **El claim se restringe a los tipos con handler**: `... WHERE status='pending' AND type = ANY(...)`.
   Un tipo sin handler NO se reclama → queda `pending`, replayable. Elimina de raíz el "sin handler →
   se quema" que documentó S0/R-3, permanentemente y para tipos futuros.
3. Se borra `registerHandler`, `_resetHandlers` y el `Map`. `planEventTransition`, `publishEvent`,
   `isKnownEventType`, `EventHandler` y los tipos NO se tocan.

El endpoint importa `HANDLERS` y lo pasa; su comentario de cabecera ("no handlers registered, not
scheduled") deja de ser cierto y se reescribe.

## 4. Los dos consumidores

### 4.1 Handler de memoria — `commitment.created`, `commitment.broken`

Recibe `{commitmentId}`, carga el `Commitment` (para su spec/`metricKey` legible) y escribe un
episodio vía un nuevo `recordEpisodeOnce`:

| Evento | Tipo de episodio | Saliencia | Contenido |
|---|---|---|---|
| `commitment.broken` | `commitment_broken` (ya existe) | 0.85 | "Rompiste tu compromiso: <spec>" |
| `commitment.created` | `commitment_created` (**nuevo**) | 0.55 | "Te comprometiste a: <spec>" |

`commitment_created` se añade al union `MemoryEventType` (`salience.ts`) + su saliencia base 0.55 —
un propósito es menos memorable que romperlo.

**Alcance del handler: los cuatro tipos de `commitment.*`.** Aunque hoy sólo `created`/`broken` estén
en pending, el handler cubre también `kept` (→ `commitment_kept`, ya existe: "Cumpliste tu
compromiso: <spec>") y `partial` (→ `commitment_kept`, saliencia menor: "Cumpliste en parte: <spec>").
Es trivial y evita que `kept`/`partial` queden sin handler —y por tanto en `pending` indefinido— en
cuanto el loop de comportamiento los publique. El mapeo exacto de contenido se fija en el plan.

Observable en `CoachMemoryPanel` (drawer del coach) y alimenta el context assembler (FREEZE-D10).

### 4.2 Handler de notificación — `insight.created`

Recibe `{insightId}`, carga el `Insight` (título/categoría) y llama:

```ts
emitNotification(prisma, userId, "INSIGHT_DETECTED", {
  params: { title }, sourceId: insightId, dedupeKey: `insight:${insightId}`, href: <ruta de insights>,
})
```

Requiere **un code nuevo en `MESSAGES`** (`lib/messages/catalog.ts`): `INSIGHT_DETECTED`, `persist:true`,
categoría "insights", prioridad P3 (informativo, no interrumpe). No existe hoy (verificado).

**El `href` se verifica contra la ruta REAL en el plan, no se supone** (lección de la recuperación
semántica: dos hrefs supuestos no existían). Candidata: la superficie donde el trader ve sus insights
(panel "Inteligencia IA", probablemente `/analytics`); el plan confirma la ruta exacta contra el
código antes de cablearla. Si el catálogo define el `href` por code, puede que ni haga falta pasarlo.

Observable en `/notificaciones` y la campana. `emitNotification` ya respeta las preferencias del
usuario (categoría, quiet hours, mute) — no hay que re-implementar el gating.

**Por qué el productor está limpio:** `insight-store.ts:118` sólo PUBLICA el evento; no notifica
inline. El outbox es el lugar correcto para la reacción (desacoplado). Este handler no duplica nada.

## 5. Idempotencia (at-least-once → un evento puede reprocesarse)

- **Notificación: gratis.** `emitNotification` ya hace upsert por `dedupeKey` (`emit.ts:102`). Un
  reproceso de `insight:<id>` refresca la misma fila, no apila.
- **Memoria: se añade.** `recordEpisode` hace `create` directo sin dedupe. Se añade
  `recordEpisodeOnce(prisma, userId, input)` al servicio de memoria: si ya existe un episodio con ese
  `sourceId`, no crea. **`sourceId = event.id`** (id de la fila del outbox), NO `commitmentId`:
  `commitment.created` y `commitment.broken` del mismo compromiso son dos episodios legítimos
  distintos; dedupear por `commitmentId` haría que el segundo pisara al primero. `event.id` es único
  por evento → cada evento produce a lo sumo un episodio, y el reproceso no duplica.

El check-then-create de `recordEpisodeOnce` es seguro: `FOR UPDATE SKIP LOCKED` impide procesar el
mismo evento concurrentemente; el único reproceso es secuencial tras un fallo.

**Entidad borrada entre publicación y consumo:** el handler lo trata como no-op (no lanza) → el
evento se marca `processed`, no reintenta para siempre contra algo que ya no existe.

**Los handlers NO tragan sus errores:** dejan que suban para que `planEventTransition` decida el
reintento. Es la lección de los `catch {}` mudos del proyecto.

## 6. Re-agendar el cron

Migración nueva que restaura `v3-dispatch-events` (des-agendado por `20260721190000`), con el bloque
de `20260626140000` MÁS el `timeout_milliseconds := 60000`:

```sql
select cron.schedule('v3-dispatch-events', '*/5 * * * *', $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/dispatch-events',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000       -- #155: el default de pg_net es 5s
  );
$cron$);
```

Idempotente (unschedule-then-schedule). **`timeout_milliseconds` no es opcional (#155):** el default
de `net.http_post` es 5 s; un batch de 50 eventos con dos handlers puede pasar de 5 s, y sin el
timeout `pg_net` cancelaría a los 5 s registrando el job como fallido aunque el endpoint terminara
bien. Los 60 s casan con `maxDuration = 60` del endpoint.

**Ventana de despliegue, declarada:** `migrate-deploy` (que corre el `cron.schedule`) puede completar
antes de que Vercel termine el deploy. Si el cron dispara en esa ventana de segundos, pega contra el
endpoint viejo, que responde `{claimed:0}` — no quema nada, porque el claim restringido y los
handlers llegan juntos en el mismo bundle. Se documenta en el header de la migración.

## 7. Lo que NO se maneja, a propósito

**Ordenamiento causal estricto.** El claim es `ORDER BY occurred_at ASC` pero con `SKIP LOCKED` y
reintentos dos eventos pueden procesarse fuera de orden. Para memoria episódica y notificaciones da
igual: cada episodio lleva su `occurredAt` real y la recuperación ordena por saliencia. Un consumidor
que necesitara orden causal es otro diseño (realtime/POST-1). No se fuerza aquí.

## 8. Testing

**Puro, con TDD (verifica el ROJO antes de implementar):**

1. **`planEventTransition`** — ya tiene tests; deben seguir verdes (red de no-regresión del cambio de
   firma).
2. **`dispatchPending` con inyección** (ahora testeable *porque* B quitó el estado global): handler
   OK → `processed`; handler lanza → `pending`/`failed` según `maxAttempts`; **un tipo fuera de
   `HANDLERS` NO se reclama** (el test que impide que "sin handler → se quema" vuelva); dos handlers
   por tipo → ambos corren.
3. **Idempotencia**: `recordEpisodeOnce` con `sourceId` repetido → no crea; con distinto → crea.
   Mapeo memoria: `commitment.broken` → `commitment_broken`, `commitment.created` →
   `commitment_created`, entidad ausente → no-op. Notificación: `dedupeKey` correcto (`insight:<id>`).
4. **Catálogo**: `MESSAGES.INSIGHT_DETECTED` existe, `persist:true`, resuelve título/cuerpo en ES.

**Contra producción (Supabase MCP), estado esperado conocido:**

- Antes: 16 en `pending`. Tras disparar el dispatcher: 2 `commitment.broken` + 2 `commitment.created`
  → `processed`, 4 episodios nuevos en `memory_episodes`; 12 `insight.created` → `processed` + 12
  notificaciones deduplicadas por `insight:<id>`.
- Criterio FREEZE-D6: publicar un tipo sin handler → queda `pending`, no se quema.
- `cron.job` tiene `v3-dispatch-events` `active`; `cron.job_run_details` registra `succeeded` sin el
  falso-fallo de los 5 s.

**En vivo (opcional, Playwright, con guarda anti-overlay):** `CoachMemoryPanel` muestra los episodios;
`/notificaciones` muestra las de insight.

**Disciplina:** suite completa antes de cada push (hoy 1301); los 2 fallos de `sentry-wiring` son los
conocidos por `@sentry/nextjs` ausente en local.

## 9. Criterios de éxito

- El endpoint corre `dispatchPending(prisma, HANDLERS)`; el `Map` mutable global desaparece.
- Un evento sin handler queda `pending` (replayable), nunca `processed` sin consumir.
- Los 16 eventos en pending se consumen: 4 episodios + 12 notificaciones, todo idempotente.
- El cron `v3-dispatch-events` revive con `timeout_milliseconds := 60000`.
- La memoria del coach y `/notificaciones` reflejan los eventos consumidos.

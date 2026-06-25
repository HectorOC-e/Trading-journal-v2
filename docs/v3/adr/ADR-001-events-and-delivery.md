# ADR-001 — Runtime de eventos y entrega

- **Estado:** Aceptada
- **Fecha:** 2026-06-25
- **Decide:** `FREEZE-D1`, `FREEZE-D5`, `FREEZE-D6`
- **Resuelve riesgo:** RI-1 (C1 sin infraestructura)

## Contexto
El diferenciador #1 (coach proactivo / intervención en el momento del error, C1) exige reaccionar a eventos de dominio. El repo **no tiene** runtime de eventos: `lib/coach-bus.ts` es un `window.dispatchEvent` de 9 líneas (cliente), el único scheduler es `pg_cron → pg_net → /api/cron/*` (batch horario), y no hay websockets ni Supabase Realtime. Un bus in-process no sobrevive entre invocaciones serverless.

## Decisión
**Outbox transaccional + dispatcher**, con dos caminos de entrega:

1. **Camino durable (backbone):** cada mutación de dominio escribe una fila en `domain_events` (outbox) **dentro de la misma transacción** que el cambio de negocio. Un dispatcher entrega a los consumidores. Semántica **at-least-once + idempotente**.
2. **Camino rápido (fast-path síncrono) para intervención in-trade:** la mutación `trade.create/close` corre los detectores **deterministas** (sin LLM en el camino crítico) y devuelve la intervención **en la respuesta de la mutación**.

**SLA redefinido (FREEZE-D5):** "intervención ≤2s push" → *intervención in-trade entregada síncronamente en la respuesta de la mutación; el resto de señales llegan al feed de HOY vía outbox en el siguiente render/poll.* **No hay websockets en v3.1.**

## Alternativas consideradas
| Opción | Por qué no (ahora) |
|---|---|
| Cola dedicada (`pg-boss`/BullMQ) | Añade dependencia/infra; el volumen v3.1 no lo exige. **Reversible:** el dispatcher puede migrar a cola sin tocar productores. |
| Bus in-process | No sobrevive serverless; eventos se perderían entre instancias. |
| Realtime/SSE para push | Postergado (POST-1): el outbox queda listo para alimentarlo cuando haga falta. |

## Consecuencias
- **Irreversible:** el outbox como única fuente de "qué pasó" (FREEZE-D6). Productores futuros deben publicar eventos.
- **Reversible:** el mecanismo del dispatcher (`pg_cron` vs `LISTEN/NOTIFY` vs cola).
- El fast-path acopla `trade.create` a los detectores → deben ser rápidos y deterministas (presupuesto de latencia documentado en S7).

## Validación (gate G1 / S0)
Spike: un `trade.created` cruza el outbox a un consumidor server de forma fiable y a coste medido.

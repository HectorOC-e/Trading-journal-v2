-- S0/R-3: des-agendar el dispatcher de la outbox hasta que exista el primer
-- consumidor (S4).
--
-- Contexto (auditoría 2026-07-21, docs/STATUS.md §1):
--   `20260626140000_schedule_v3_crons.sql` agendó `v3-dispatch-events` cada 5
--   minutos, pero NO existe ningún consumidor: `registerHandler` (event-bus.ts:114)
--   no tiene un solo call-site en `src/`. Y `dispatchPending` trata "sin handler"
--   como éxito (event-bus.ts:156-157: lista vacía → outcome.ok → `processed`).
--
--   Efecto medido en prod: los 7 eventos publicados (`insight.created` ×6 del
--   26-jun, `commitment.created` ×1 del 28-jun) están TODOS en `processed`, sin
--   que ningún consumidor corriera. La outbox dejó de ser un log replayable.
--
--   Esto es exactamente lo que la fila `S0/R-3` advertía: el dispatcher debe
--   programarse JUNTO CON el primer consumidor, no antes.
--
-- Qué hace esta migración:
--   Quita `v3-dispatch-events` del scheduler. Los productores (`publishEvent` en
--   insight-store.ts y commitment-service.ts) siguen escribiendo a la outbox con
--   normalidad — los eventos simplemente se ACUMULAN en `pending` en vez de
--   quemarse. Cuando S4 registre su primer handler, estarán ahí para consumirse.
--
-- Qué NO hace:
--   No toca `v3-recompute-insights` ni `v3-evaluate-commitments` (ambos tienen
--   consumidor real: sus endpoints hacen trabajo observable).
--   No revive los 7 eventos ya marcados `processed`: eso se perdió y no se
--   reconstruye. Esta migración detiene la hemorragia, no la revierte.
--
-- Cómo revertirlo (S4, junto con el primer consumidor):
--   Re-ejecutar el bloque `cron.schedule('v3-dispatch-events', '*/5 * * * *', …)`
--   de `20260626140000_schedule_v3_crons.sql`.
--
-- Idempotente: el `if exists` hace que re-correrla sea un no-op.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-dispatch-events') then
    perform cron.unschedule('v3-dispatch-events');
    raise notice 'S0/R-3: v3-dispatch-events des-agendado (sin consumidores hasta S4)';
  else
    raise notice 'S0/R-3: v3-dispatch-events no estaba agendado; nada que hacer';
  end if;
end $$;

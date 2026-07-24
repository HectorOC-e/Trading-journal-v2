-- S4: re-agendar `v3-dispatch-events`, ahora que existe el primer consumidor.
--
-- `20260721190000` lo des-agendó (S0/R-3) porque no había handlers y
-- `dispatchPending` trataba "sin handler" como éxito, quemando los eventos.
-- Desde entonces los productores han seguido escribiendo y los eventos se han
-- ACUMULADO en `pending`, que era el objetivo.
--
-- Qué cambió en el código y por qué ya es seguro agendarlo:
--   · Los handlers se INYECTAN (`HANDLERS` en events/handlers/index.ts) en vez de
--     registrarse en un Map global por efecto secundario del import. Una lambda
--     fría no puede correr con el registro vacío: el import ES el registro.
--   · El claim se restringe a los tipos CON handler. Un tipo sin consumidor ya no
--     se reclama: queda `pending` y replayable (FREEZE-D6). El modo de fallo que
--     motivó el des-agendado está eliminado por construcción, no evitado.
--
-- POR QUÉ EL TIMEOUT (#155): el default de `net.http_post` es 5000 ms, y
-- `20260722190000` dejó dicho explícitamente que al revivir este job incluyera
-- `timeout_milliseconds := 60000`. Un batch de 50 eventos con dos handlers (cada
-- uno con su consulta + escritura, y el de memoria además con un embedding
-- best-effort) puede pasar de 5 s; sin el timeout, pg_net abandonaría la espera y
-- registraría el job como fallido AUNQUE el endpoint terminara bien — el modo de
-- fallo silencioso que #155 documentó. Los 60 s casan con el `maxDuration = 60`
-- que declara la ruta.
--
-- VENTANA DE DESPLIEGUE, declarada: `migrate-deploy` (que corre este
-- `cron.schedule`) puede completar antes de que Vercel termine de desplegar. Si
-- el cron dispara en esa ventana de segundos, pega contra el bundle viejo, cuyo
-- `dispatchPending` tiene la firma antigua y responde con un error o `claimed:0`.
-- Benigno: no quema nada, porque el claim restringido y los handlers viajan
-- juntos en el mismo bundle. El siguiente tick (≤5 min) ya encuentra el código
-- nuevo.
--
-- Idempotente: unschedule-then-schedule.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-dispatch-events') then
    perform cron.unschedule('v3-dispatch-events');
  end if;
end $$;

-- maxDuration 60 s — dispatcher de la outbox, cada 5 minutos.
select cron.schedule(
  'v3-dispatch-events',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/dispatch-events',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Los crons esperaban 5 s por trabajos declarados para 60–300 s.
--
-- `net.http_post` usa un `timeout_milliseconds` por defecto de 5000, y ninguna de
-- las llamadas agendadas lo fijaba. Las rutas, en cambio, declaran `maxDuration`
-- de 60 s (dispatch-events, learning-digest) o 300 s (el resto). En cuanto los
-- datos crecen lo suficiente para que el trabajo pase de 5 s, pg_net abandona la
-- espera y registra el job como fallido.
--
-- Medido en producción el 2026-07-22 sobre `v3-recompute-insights`: con 57 trades
-- respondía dentro del margen; con 67 dio
--   "Timeout of 5000 ms reached. Total time: 5000.503 ms"
-- mientras el servidor completaba el trabajo igualmente y persistía 10 insights.
--
-- Es el peor modo de fallo posible: el trabajo SÍ se ejecuta, así que nadie nota
-- nada, pero `net._http_response` guarda error y `status_code` nulo. A partir de
-- ahí no hay forma de distinguir un fallo real de este ruido — el día que el cron
-- se rompa de verdad, el síntoma será idéntico al de un día sano.
--
-- Cada job pasa a esperar lo que su ruta declara. Idempotente: unschedule + schedule.
--
-- NO se toca `v3-dispatch-events`: sigue des-agendado a propósito desde
-- 20260721190000 hasta que exista el primer consumidor de S4, que es quien debe
-- volver a agendarlo. Cuando se haga, que incluya `timeout_milliseconds := 60000`.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-recompute-insights')   then perform cron.unschedule('v3-recompute-insights');   end if;
  if exists (select 1 from cron.job where jobname = 'v3-evaluate-commitments') then perform cron.unschedule('v3-evaluate-commitments'); end if;
  if exists (select 1 from cron.job where jobname = 'v3-cognitive-digest')     then perform cron.unschedule('v3-cognitive-digest');     end if;
  if exists (select 1 from cron.job where jobname = 'reviews-digest-hourly')   then perform cron.unschedule('reviews-digest-hourly');   end if;
  if exists (select 1 from cron.job where jobname = 'learning-digest-hourly')  then perform cron.unschedule('learning-digest-hourly');  end if;
end $$;

-- maxDuration 300 s — insights deterministas + snapshot + patrones de memoria.
select cron.schedule(
  'v3-recompute-insights',
  '15 5 * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/recompute-insights',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cron$
);

-- maxDuration 300 s — verificación de compromisos con la ventana cerrada.
select cron.schedule(
  'v3-evaluate-commitments',
  '45 5 * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/evaluate-commitments',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cron$
);

-- maxDuration 300 s — digest cognitivo semanal.
select cron.schedule(
  'v3-cognitive-digest',
  '0 6 * * 1',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/cognitive-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cron$
);

-- maxDuration 300 s — digest de reviews.
select cron.schedule(
  'reviews-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/reviews-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cron$
);

-- maxDuration 60 s — digest de aprendizaje.
select cron.schedule(
  'learning-digest-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/learning-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

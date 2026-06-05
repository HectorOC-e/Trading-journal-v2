-- TASK-002 (fix): El REVOKE FROM anon/authenticated no era suficiente porque
-- el grant estaba en PUBLIC (heredable por todos los roles).
-- Revocar de PUBLIC bloquea anon+authenticated mientras postgres/service_role
-- mantienen sus grants explícitos y el trigger sigue funcionando.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

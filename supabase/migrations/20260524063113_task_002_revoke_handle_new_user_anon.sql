-- TASK-002: Revoke EXECUTE on handle_new_user from anon AND authenticated
-- (both roles can call it per advisor — only postgres/service_role should trigger it)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

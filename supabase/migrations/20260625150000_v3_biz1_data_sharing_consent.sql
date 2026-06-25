-- BIZ-1 (ADR-004, Decisión B) — reservar la frontera para aprendizaje cross-user.
--
-- Flag de consentimiento opt-in (default false). NO habilita nada todavía: reserva
-- la posibilidad de, en el futuro, entrenar un modelo poblacional anónimo
-- (privacy-preserving) sin tener que pedir consentimiento retroactivo ni migrar
-- datos. Aditivo, sin riesgo.

alter table public.users
  add column if not exists data_sharing_consent boolean not null default false;

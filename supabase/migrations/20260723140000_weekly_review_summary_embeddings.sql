-- Corpus `weekly_reviews`: búsqueda semántica sobre el resumen ejecutivo que
-- ESCRIBE EL TRADER en su review semanal (`executive_summary`).
--
-- Ojo con no confundir con `ai_analysis`: esa columna la redacta la IA y NO se
-- indexa — indexar prosa del LLM para que el LLM la recupere como evidencia del
-- trader sería un bucle prohibido por FREEZE-P6 (el LLM propone, los datos
-- confirman) y la frontera anti-poisoning FREEZE-D9.
--
-- Es texto retrospectivo y deliberado, distinto en naturaleza al del calor del
-- trade (trade_events) o al plan pre-entrada (trade_plans).
--
-- pgvector ya está habilitado. La columna NO se declara en schema.prisma (Prisma
-- no soporta `vector`). RLS: weekly_reviews ya tiene políticas per-usuario.

ALTER TABLE weekly_reviews ADD COLUMN IF NOT EXISTS summary_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_summary_embedding
  ON weekly_reviews USING ivfflat (summary_embedding vector_cosine_ops)
  WITH (lists = 100);

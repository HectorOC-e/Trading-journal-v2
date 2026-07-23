-- Corpus `monthly_reviews`: búsqueda semántica sobre el resumen que ESCRIBE EL
-- TRADER en su review mensual (`summary`).
--
-- Simétrico a weekly_reviews (20260723140000): mismo criterio, misma frontera.
-- NO se indexa `ai_analysis` — esa columna la redacta la IA, e indexar prosa del
-- LLM para que el LLM la cite como evidencia del trader es un bucle prohibido por
-- FREEZE-P6 y la frontera anti-poisoning FREEZE-D9.
--
-- Cierra la asimetría de #165: se indexaban las reviews semanales pero no las
-- mensuales, siendo idénticas en naturaleza.
--
-- pgvector ya está habilitado. La columna NO se declara en schema.prisma (Prisma
-- no soporta `vector`). RLS: monthly_reviews ya tiene políticas per-usuario.

ALTER TABLE monthly_reviews ADD COLUMN IF NOT EXISTS summary_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_monthly_reviews_summary_embedding
  ON monthly_reviews USING ivfflat (summary_embedding vector_cosine_ops)
  WITH (lists = 100);

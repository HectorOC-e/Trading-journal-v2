-- Convierte los índices vectoriales del pipeline de recuperación de ivfflat a HNSW.
--
-- POR QUÉ. ivfflat agrupa los vectores en `lists` centroides calculados EN EL
-- MOMENTO DE CREAR EL ÍNDICE. Las siete migraciones de estos corpus crearon el
-- índice sobre una tabla SIN vectores (la columna acababa de nacer; el backfill
-- viene después), así que los centroides nunca se entrenaron. Con `lists = 100`
-- sobre 1–21 filas y el `probes = 1` por defecto, una búsqueda sondea 1 de 100
-- listas casi todas vacías → recall degradado desde el día uno. No es sólo
-- rendimiento: es correctitud (se pierden vecinos reales).
--
-- HNSW no entrena nada al crearse (construye el grafo incrementalmente al
-- insertar), da buen recall a cualquier tamaño y es la recomendación por defecto
-- de pgvector moderno. A la escala de un trader individual el coste de
-- construcción es trivial. pgvector en prod es 0.8.0 (soporta HNSW desde 0.5.0).
--
-- ALCANCE. Los siete índices que consulta el pipeline (services/retrieval). Se
-- incluyen los dos pre-existentes (trades.notes_embedding, learning_resources)
-- porque arrastran el mismo defecto latente y dejar 5 HNSW + 2 ivfflat sería la
-- inconsistencia que este subsistema vino a eliminar.
--
-- FUERA DE ALCANCE: idx_memory_episodes_embedding. La memoria episódica NO usa
-- este pipeline (recall híbrido por saliencia decaída, ARCHITECTURE.md §6); su
-- índice se decide por separado.
--
-- vector_cosine_ops se conserva: el pipeline mide distancia coseno (`<=>`).

DROP INDEX IF EXISTS idx_trades_notes_embedding;
CREATE INDEX IF NOT EXISTS idx_trades_notes_embedding
  ON trades USING hnsw (notes_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_trades_plan_notes_embedding;
CREATE INDEX IF NOT EXISTS idx_trades_plan_notes_embedding
  ON trades USING hnsw (plan_notes_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_trade_events_notes_embedding;
CREATE INDEX IF NOT EXISTS idx_trade_events_notes_embedding
  ON trade_events USING hnsw (notes_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_weekly_reviews_summary_embedding;
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_summary_embedding
  ON weekly_reviews USING hnsw (summary_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_monthly_reviews_summary_embedding;
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_summary_embedding
  ON monthly_reviews USING hnsw (summary_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_setups_description_embedding;
CREATE INDEX IF NOT EXISTS idx_setups_description_embedding
  ON setups USING hnsw (description_embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_learning_resources_notes_embedding;
CREATE INDEX IF NOT EXISTS idx_learning_resources_notes_embedding
  ON learning_resources USING hnsw (notes_embedding vector_cosine_ops);

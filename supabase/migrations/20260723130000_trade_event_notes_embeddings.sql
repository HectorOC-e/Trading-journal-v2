-- Corpus `trade_events`: búsqueda semántica sobre las notas por EVENTO.
--
-- Son las notas que el trader escribe al mover un stop, cerrar parcial o añadir
-- posición: texto escrito en el momento de decidir, con el trade abierto. Es el
-- corpus con más volumen real del sistema y el único que capturaba lo que pasa
-- DENTRO del trade, no antes (trade_plans) ni después (trade_notes).
--
-- pgvector ya está habilitado por 20260531060409_005_pgvector_embeddings.sql.
-- La columna NO se declara en schema.prisma: Prisma no soporta el tipo `vector`.
-- RLS: `trade_events` ya tiene RLS activo con políticas per-usuario sobre
-- `user_id` (columna propia, sin necesidad de join contra trades).

ALTER TABLE trade_events ADD COLUMN IF NOT EXISTS notes_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_trade_events_notes_embedding
  ON trade_events USING ivfflat (notes_embedding vector_cosine_ops)
  WITH (lists = 100);

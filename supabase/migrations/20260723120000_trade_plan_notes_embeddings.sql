-- Corpus `trade_plans`: búsqueda semántica sobre el plan PRE-trade.
--
-- `trades.notes` (lo que el trader escribió después) ya se indexaba; `plan_notes`
-- (lo que se dijo que iba a hacer ANTES de entrar) no se indexaba en ningún sitio.
-- Es el texto que permite contrastar intención contra resultado, así que va a su
-- propio corpus en vez de concatenarse con las notas: son preguntas distintas.
--
-- pgvector ya está habilitado por 20260531060409_005_pgvector_embeddings.sql.
-- La columna NO se declara en schema.prisma: Prisma no soporta el tipo `vector`
-- y se lee/escribe por SQL crudo (misma convención que trades.notes_embedding,
-- documentada en schema.prisma).
--
-- RLS: `trades` ya tiene RLS activo con políticas per-usuario sobre `user_id`;
-- una columna nueva hereda esa protección, no hacen falta políticas nuevas.

ALTER TABLE trades ADD COLUMN IF NOT EXISTS plan_notes_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_trades_plan_notes_embedding
  ON trades USING ivfflat (plan_notes_embedding vector_cosine_ops)
  WITH (lists = 100);

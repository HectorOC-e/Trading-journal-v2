-- Corpus `setups`: búsqueda semántica sobre la descripción del setup.
--
-- Nota de alcance: este corpus se añade a PEDIDO EXPLÍCITO del usuario. La
-- descripción es DEFINITORIA (qué es el setup), no reflexiva, y el Coach ya la
-- recupera por nombre vía get_setup_detail. Su valor semántico es menor que el de
-- los corpus de notas del trader — se documenta aquí para que no se lea como una
-- recomendación de diseño.
--
-- pgvector ya está habilitado. La columna NO se declara en schema.prisma (Prisma
-- no soporta `vector`). RLS: setups ya tiene políticas per-usuario.

ALTER TABLE setups ADD COLUMN IF NOT EXISTS description_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_setups_description_embedding
  ON setups USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100);

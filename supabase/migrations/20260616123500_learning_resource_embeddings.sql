-- SP2: semantic search over learning-resource notes.
-- pgvector extension already enabled by 20260531060409_005_pgvector_embeddings.sql.

-- Add embedding column to learning_resources (mirrors trades.notes_embedding).
ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS notes_embedding vector(1536);

-- IVFFlat index for cosine similarity.
CREATE INDEX IF NOT EXISTS idx_learning_resources_notes_embedding
  ON learning_resources USING ivfflat (notes_embedding vector_cosine_ops)
  WITH (lists = 100);

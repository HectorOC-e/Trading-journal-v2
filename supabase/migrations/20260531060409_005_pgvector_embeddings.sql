-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS notes_embedding vector(1536);

-- Create IVFFlat index for cosine similarity
CREATE INDEX IF NOT EXISTS idx_trades_notes_embedding 
  ON trades USING ivfflat (notes_embedding vector_cosine_ops) 
  WITH (lists = 100);

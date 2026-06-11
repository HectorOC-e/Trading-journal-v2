-- Per-user FX rate overrides for dashboard currency normalization (D-03).
-- JSON map of { "<CURRENCY>": <value of 1 unit in USD> }, e.g. { "EUR": 1.08 }.
-- Empty default {} → app falls back to the static table in lib/fx.ts.
-- Stored as TEXT (JSON string) parsed at the app boundary, to keep the generated
-- Prisma User type free of the recursive JsonValue type (avoids TS2589 in the
-- aggregated tRPC AppRouter inference).
ALTER TABLE users ADD COLUMN IF NOT EXISTS fx_rates text NOT NULL DEFAULT '{}';

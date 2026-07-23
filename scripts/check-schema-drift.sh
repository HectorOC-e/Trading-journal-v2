#!/usr/bin/env bash
# Fails when supabase/migrations/ can no longer rebuild the schema that
# schema.prisma describes (S0/DT-4).
#
# WHY NOT `supabase db push --dry-run`: that is what this check used to be, and it
# could never fail. `db push` compares the repo's migrations against the target
# DB's *migration history*; run against a stack that just replayed them all, the
# answer is always "nothing to apply". It never opened schema.prisma. Meanwhile
# real drift accumulated: an entire table (resource_reviews) and 18 columns
# existed in production and in schema.prisma but in no migration, so a fresh
# database could not run the app.
#
# WHY ONLY TABLES AND COLUMNS: `prisma migrate diff` also reports index names, FK
# ordering and its own rendering of column types. Those differ by design between
# hand-written SQL and Prisma's model — ~325 lines of noise that would pin this
# check permanently red, which is no more useful than permanently green. Missing
# tables/columns are the class of drift that actually breaks a rebuild.
#
# Usage: scripts/check-schema-drift.sh <db-url>

set -euo pipefail

DB_URL="${1:?usage: check-schema-drift.sh <db-url>}"
cd "$(dirname "$0")/../src"

# Differences that are deliberate and documented, so the check must not flag them:
#   app_settings          — cron settings table, read via the app_setting() SQL
#                           function; intentionally not a Prisma model.
#   <tabla>.*embedding    — columnas pgvector, leídas/escritas por SQL crudo.
#
# La regla de las columnas vectoriales es GENÉRICA a propósito. Antes listaba una
# por una (trades.notes_embedding, learning_resources.notes_embedding,
# memory_episodes.embedding) y cada corpus semántico nuevo exigía tocar este
# fichero — un sitio más, en shell, donde vivía el conocimiento de los corpus y
# donde se olvidaría.
#
# Por qué generalizar no afloja el guard: Prisma NO tiene tipo `vector`, así que
# una columna cuyo nombre acaba en `embedding` es por construcción de gestión por
# SQL crudo y nunca un campo del modelo. Y una columna vectorial ausente de
# schema.prisma jamás rompe un rebuild —el código nunca la selecciona por
# Prisma—, que es exactamente la clase de deriva que este check existe para cazar.
# Exige el punto, así que una TABLA llamada `embeddings` seguiría marcándose.
#
# Lo que esto NO cubre, y no le toca: que exista la columna pero falte su
# adaptador de recuperación. De eso responde la guarda de contrato del registro
# (src/__tests__/services/retrieval/registry.test.ts).
ALLOWED='^(app_settings|[a-z_]+\.[a-z_]*embedding)$'

DIFF="$(DATABASE_URL="$DB_URL" npx prisma migrate diff \
          --from-config-datasource --to-schema prisma/schema.prisma 2>/dev/null)"

# Structural findings: tables under an Added/Removed heading, and per-table columns.
STRUCTURAL="$(printf '%s\n' "$DIFF" | awk '
  /^\[[+-]\] (Added|Removed) tables/ { intable = 1; next }
  /^\[\*\] Changed the/             { intable = 0; gsub(/`/, "", $4); tbl = $4; next }
  /^\[/                             { intable = 0 }
  intable && /^  - / { print $2; next }
  /\[[+-]\] (Added|Removed) column/ { gsub(/`/, "", $4); print tbl "." $4 }
')"

UNEXPECTED="$(printf '%s\n' "$STRUCTURAL" | grep -v '^$' | grep -Ev "$ALLOWED" || true)"

if [ -n "$UNEXPECTED" ]; then
  echo "::error::schema.prisma and supabase/migrations/ disagree on tables/columns."
  echo "A database rebuilt from this repo would not match the schema the code expects."
  echo
  echo "$UNEXPECTED" | sed 's/^/  /'
  echo
  echo "Add a migration to supabase/migrations/ (the source of record), or update"
  echo "schema.prisma if the model is the thing that is wrong."
  exit 1
fi

echo "No table/column drift between schema.prisma and supabase/migrations/."

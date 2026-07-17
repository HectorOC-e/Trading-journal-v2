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
#   *.notes_embedding /
#   memory_episodes.embedding
#                         — pgvector columns, read/written via raw SQL. Prisma has
#                           no vector type; schema.prisma says so at its
#                           MemoryEpisode model.
ALLOWED='^(app_settings|trades\.notes_embedding|learning_resources\.notes_embedding|memory_episodes\.embedding)$'

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

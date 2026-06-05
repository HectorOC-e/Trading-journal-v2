import "dotenv/config";
import { defineConfig } from "prisma/config";

// NOTE: Prisma is used here ONLY to generate the typed client (`prisma generate`).
// Database migrations are owned by the Supabase CLI (supabase/migrations/), the
// single source of truth — do NOT use `prisma migrate`. See docs/DATABASE_MIGRATIONS.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});

import { defineConfig } from "vitest/config"
import path from "path"

// DB-backed integration tests (S0/DT-3). Run ONLY where a local Postgres is up
// (supabase local). Kept out of the default `vitest run` via vitest.config.ts's
// exclude. fileParallelism is off because dispatchPending claims events globally.
export default defineConfig({
  test: {
    globals: true,
    include: ["**/__tests__/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
})

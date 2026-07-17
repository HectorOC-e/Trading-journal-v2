import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    exclude: ["**/.claude/**", "**/node_modules/**", "**/__tests__/e2e/**", "**/__tests__/integration/**"],
    setupFiles: ["./vitest.setup.ts"],
    // Default environment for server-side tests
    environment: "node",
    // Component tests in __tests__/components/ use @vitest-environment jsdom docblock
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})

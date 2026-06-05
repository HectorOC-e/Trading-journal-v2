import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — not authored, not linted.
    "lib/generated/**",
  ]),
  // Test files legitimately use `any` to shape partial mocks for createCaller
  // (mock Prisma/Supabase clients don't implement the full type surface).
  {
    files: ["__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // `react-hooks/set-state-in-effect` is a React-Compiler performance HINT, not a
  // correctness rule. The flagged sites are intentional sync-on-open / localStorage
  // bootstrap effects (audited in Cycle 1, TD-037). Surfaced as warnings, not errors,
  // so `eslint` errors stay reserved for genuine bugs. Tracked for v3 key-remount refactor.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

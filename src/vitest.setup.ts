// Global test setup — runs before every test file
// In JSDOM environment: extends expect with jest-dom matchers
// In Node environment: no-op (jest-dom is browser-only)

if (typeof document !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@testing-library/jest-dom")
}

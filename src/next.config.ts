import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  distDir: ".next",
  // Keep the headless-Chromium packages out of the bundler so they're traced into the
  // serverless function. puppeteer-core (not playwright-core) because @sparticuz/chromium
  // targets puppeteer and playwright-core's runtime path requires weren't traced by Vercel
  // (caused "Cannot find module …playwright…" → /api/reviews/pdf 500).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Force the @sparticuz/chromium binary pack (bin/*.br — the compressed Chromium) into the
  // serverless functions that render PDFs. Externalizing alone isn't enough: nothing
  // statically requires bin/, so Next's file tracing drops it and chromium.executablePath()
  // throws "The input directory …/bin does not exist" at runtime on Vercel. Glob targets the
  // real pnpm path (version-wildcarded), relative to this project dir (src/).
  outputFileTracingIncludes: {
    "/api/reviews/pdf": ["./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**"],
    "/api/cron/reviews-digest": ["./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**"],
  },
}

// Source-map upload turns Sentry's minified stack traces back into real file:line,
// which is most of why an error tracker is worth having. It needs SENTRY_AUTH_TOKEN
// + org/project, which only exist in Vercel — so it is gated: without them the
// wrapper still applies (instrumentation, error capture) but skips the upload
// instead of failing the build. CI builds have no token and must stay green.
const sentryUploadConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent:  !process.env.CI,
  sourcemaps: { disable: !sentryUploadConfigured },
  // Route browser events through the app's own origin so ad blockers don't drop
  // them — the errors most worth seeing come from the users running blockers.
  tunnelRoute: "/monitoring",
  disableLogger: true,
})

// Sentry — server runtime (Node). Loaded by instrumentation.ts register().
//
// Inert without SENTRY_DSN: the SDK no-ops when there is no DSN, so CI, local dev
// and previews never send anything, and turning it on is one env var in Vercel
// rather than a deploy.
import * as Sentry from "@sentry/nextjs"
import { stripRequestPii } from "@/lib/observability/strip-pii"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Errors are the point (B-04: production had no runtime error visibility at all).
  // Tracing is off: it multiplies event volume and cost, and nothing here needs
  // spans yet. Turn it on deliberately if latency ever becomes the question.
  tracesSampleRate: 0,

  // This app handles a trader's financial data. Do not let the SDK attach request
  // bodies, cookies or headers to events by default.
  sendDefaultPii: false,

  // Belt and braces over sendDefaultPii — see lib/observability/strip-pii.ts.
  beforeSend: stripRequestPii,
})

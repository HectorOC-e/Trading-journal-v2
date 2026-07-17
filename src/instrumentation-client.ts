// Sentry — browser. Inert without NEXT_PUBLIC_SENTRY_DSN.
//
// The DSN must be NEXT_PUBLIC_* to reach the browser at all; a Sentry DSN is
// designed to be public (it only accepts events, it cannot read them), which is
// why it is a separate var from the server's SENTRY_DSN.
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  // Session Replay would record the trader's screen, including their P&L and
  // notes. Off deliberately — not a default to accept without asking.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
})

// Instruments client-side navigation errors (Next 16 client instrumentation hook).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

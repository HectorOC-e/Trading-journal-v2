// Next 16 file convention: register() runs once per server instance, before the
// first request. onRequestError reports server-side errors Next catches.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError

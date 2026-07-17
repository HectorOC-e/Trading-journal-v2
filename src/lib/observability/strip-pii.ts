// What Sentry is allowed to learn about a request.
//
// This app holds a trader's P&L, private notes and encrypted API keys. Sentry's
// `sendDefaultPii: false` already keeps cookies/headers/bodies off events, but
// that is one boolean away from being reversed by a future edit or an SDK default
// change — and the failure would be silent and irreversible: the data is already
// at a third party by the time anyone notices. This runs regardless, so the
// guarantee does not rest on a single flag.
//
// Typed against the SDK's own event rather than a hand-rolled shape: it exists to
// satisfy that contract, so it should break if the contract moves.
import type { ErrorEvent } from "@sentry/nextjs"

/** Strips the request fields that can carry credentials or user content. */
export function stripRequestPii(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    delete event.request.data
  }
  return event
}

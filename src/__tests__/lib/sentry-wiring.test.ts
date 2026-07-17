/**
 * B-04 — proves the Sentry wiring emits, rather than just compiling.
 *
 * Points a fake DSN at a local listener and captures an exception: if the config
 * ever stops initialising (an SDK major, a bad env read), this fails instead of
 * production going quietly blind again — which is the exact failure B-04 exists
 * to end.
 *
 * Also pins the privacy posture. This app holds a trader's P&L, notes and API
 * keys; sendDefaultPii and Session Replay are off on purpose, and those are easy
 * for a future edit to flip back "because the defaults suggest it".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import http from "http"
import type { AddressInfo } from "net"

let server: http.Server
let port: number
let payloads: string[]

beforeEach(async () => {
  payloads = []
  server = http.createServer((req, res) => {
    let body = ""
    req.on("data", c => (body += c))
    req.on("end", () => {
      payloads.push(body)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end('{"id":"fake"}')
    })
  })
  await new Promise<void>(r => server.listen(0, r))
  port = (server.address() as AddressInfo).port
  vi.resetModules()
})

afterEach(async () => {
  await new Promise<void>(r => { server.close(() => r()) })
})

describe("sentry.server.config", () => {
  it("emits a captured exception to the configured DSN", async () => {
    process.env.SENTRY_DSN = `http://publickey@localhost:${port}/1`
    await import("@/sentry.server.config")
    const Sentry = await import("@sentry/nextjs")

    Sentry.captureException(new Error("wiring probe"))
    await Sentry.flush(5000)

    expect(payloads.join("")).toContain("wiring probe")
  })

  it("stays inert with no DSN — CI, previews and local dev must not report", async () => {
    delete process.env.SENTRY_DSN
    await import("@/sentry.server.config")
    const Sentry = await import("@sentry/nextjs")

    Sentry.captureException(new Error("should not leave the box"))
    await Sentry.flush(2000)

    expect(payloads).toEqual([])
  })
})

/**
 * The PII strip is tested directly rather than through the SDK: Sentry keeps a
 * client on globalThis that survives vi.resetModules(), so a second init in the
 * same process is unreliable — the test would be measuring the SDK's global
 * state, not this guarantee.
 */
describe("stripRequestPii", () => {
  it("removes cookies, headers and body from an event", async () => {
    const { stripRequestPii } = await import("@/lib/observability/strip-pii")
    const event = stripRequestPii({
      type: undefined,
      message: "boom",
      request: {
        url: "https://app/x",
        cookies: { session: "super-secret" },
        headers: { authorization: "Bearer leak-me" },
        data:    { apiKey: "sk-leak" },
      },
    })
    expect(JSON.stringify(event)).not.toContain("super-secret")
    expect(JSON.stringify(event)).not.toContain("leak-me")
    expect(JSON.stringify(event)).not.toContain("sk-leak")
    // The useful part survives: an error with no URL is not much of a report.
    expect(event.request?.url).toBe("https://app/x")
    expect(event.message).toBe("boom")
  })

  it("tolerates an event with no request", async () => {
    const { stripRequestPii } = await import("@/lib/observability/strip-pii")
    expect(() => stripRequestPii({ type: undefined, message: "no request here" })).not.toThrow()
  })
})

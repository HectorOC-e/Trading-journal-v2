/**
 * The auth gate's matcher decides what gets redirected to /login. It is one
 * regex, it has no other test, and it has already caused a production outage
 * once: the cron endpoints were not excluded, so every cron 307'd to /login and
 * the digests silently stopped (see project docs / PR #73 era).
 *
 * The failure mode is what makes this worth pinning: an over-broad matcher does
 * not error, it redirects. The endpoint just quietly stops working for whoever
 * lacks a session — often the exact traffic you added it for.
 */
import { describe, it, expect } from "vitest"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { config } from "@/proxy"

const matcher = new RegExp(config.matcher[0].replace(/^\//, "^/"))

const gated = (path: string) => matcher.test(path)

describe("proxy matcher — what the auth gate intercepts", () => {
  it("gates the app's real pages", () => {
    expect(gated("/dashboard")).toBe(true)
    expect(gated("/trades")).toBe(true)
    expect(gated("/perfil")).toBe(true)
  })

  it("lets Sentry's browser tunnel through", () => {
    // tunnelRoute in next.config.ts. Gated, it would redirect events from
    // logged-out users — including errors on the login screen — to /login.
    expect(gated("/monitoring")).toBe(false)
  })

  it("lets the unauthenticated endpoints through", () => {
    expect(gated("/api/cron/reviews-digest")).toBe(false)
    expect(gated("/api/health")).toBe(false)
    expect(gated("/api/trpc/trades.list")).toBe(false)
  })

  it("lets PWA assets and framework internals through", () => {
    expect(gated("/sw.js")).toBe(false)
    expect(gated("/manifest.json")).toBe(false)
    expect(gated("/icons/icon-192.png")).toBe(false)
    expect(gated("/_next/static/chunk.js")).toBe(false)
    expect(gated("/favicon.ico")).toBe(false)
  })
})

// Exercise Next's actual matcher compiler, including exact-path boundaries.
describe("offline shell public route", () => {
  it.each(["/offline.html", "/offline.html?offlineQA=1"])("serves %s without the auth proxy", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false)
  })
  it.each(["/offline.html/private", "/offline.htmlx", "/", "/dashboard"])("keeps %s behind the existing auth gate", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true)
  })
})

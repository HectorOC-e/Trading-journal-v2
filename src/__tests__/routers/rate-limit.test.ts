import { describe, it, expect } from "vitest"
import { InMemoryRateLimiter, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } from "@/lib/rate-limiter"

// Tests import InMemoryRateLimiter directly (TD-033 resolved — no algorithm duplication).
// Each test creates a fresh instance so tests are fully isolated.

function getMap(l: InMemoryRateLimiter) {
  return (l as unknown as { map: Map<string, { count: number; windowStart: number }> }).map
}

describe("InMemoryRateLimiter", () => {
  it("allows first 5 requests in window", async () => {
    const limiter = new InMemoryRateLimiter()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const r = await limiter.check("user-1")
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks 6th request in same window", async () => {
    const limiter = new InMemoryRateLimiter()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await limiter.check("user-1")
    const r = await limiter.check("user-1")
    expect(r.allowed).toBe(false)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it("resets after window expires", async () => {
    const limiter = new InMemoryRateLimiter()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await limiter.check("user-1")
    getMap(limiter).get("user-1")!.windowStart = Date.now() - RATE_LIMIT_WINDOW - 1
    const r = await limiter.check("user-1")
    expect(r.allowed).toBe(true)
  })

  it("different users are rate-limited independently", async () => {
    const limiter = new InMemoryRateLimiter()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await limiter.check("user-1")
    const r = await limiter.check("user-2")
    expect(r.allowed).toBe(true)
  })

  it("retryAfter decreases as window elapses", async () => {
    const limiter = new InMemoryRateLimiter()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await limiter.check("user-1")

    const entry = getMap(limiter).get("user-1")!
    entry.windowStart = Date.now() - 10_000
    const r1 = await limiter.check("user-1")

    entry.windowStart = Date.now() - 30_000
    const r2 = await limiter.check("user-1")

    expect(r1.retryAfter).toBeGreaterThan(r2.retryAfter)
  })

  it("evicts stale entries older than 2× window", async () => {
    const limiter = new InMemoryRateLimiter()
    await limiter.check("stale-user")
    getMap(limiter).get("stale-user")!.windowStart = Date.now() - RATE_LIMIT_WINDOW * 3
    await limiter.check("trigger-user") // triggers eviction loop
    expect(getMap(limiter).has("stale-user")).toBe(false)
  })
})

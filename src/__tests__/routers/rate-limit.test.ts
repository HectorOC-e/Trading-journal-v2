import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Test the rate limiting logic extracted from ai-test/route.ts
// We test the pure function in isolation since the route handler has Next.js dependencies.

const RATE_LIMIT_MAX    = 5
const RATE_LIMIT_WINDOW = 60_000

function makeRateLimiter() {
  const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

  return function checkRateLimit(userId: string, now: number): { allowed: boolean; retryAfter: number } {
    const entry = rateLimitMap.get(userId)
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.set(userId, { count: 1, windowStart: now })
      return { allowed: true, retryAfter: 0 }
    }
    if (entry.count >= RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.windowStart)) / 1000)
      return { allowed: false, retryAfter }
    }
    entry.count++
    return { allowed: true, retryAfter: 0 }
  }
}

describe("ai-test rate limiter", () => {
  it("allows first 5 requests in window", () => {
    const check = makeRateLimiter()
    const now   = Date.now()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const r = check("user-1", now + i)
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks 6th request in same window", () => {
    const check = makeRateLimiter()
    const now   = Date.now()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) check("user-1", now + i)
    const r = check("user-1", now + RATE_LIMIT_MAX)
    expect(r.allowed).toBe(false)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it("resets after window expires", () => {
    const check = makeRateLimiter()
    const now   = Date.now()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) check("user-1", now + i)
    // Advance past window
    const r = check("user-1", now + RATE_LIMIT_WINDOW + 1)
    expect(r.allowed).toBe(true)
  })

  it("different users are rate-limited independently", () => {
    const check = makeRateLimiter()
    const now   = Date.now()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) check("user-1", now + i)
    // user-2 should not be affected
    const r = check("user-2", now)
    expect(r.allowed).toBe(true)
  })

  it("retryAfter decreases as window elapses", () => {
    const check = makeRateLimiter()
    const now   = Date.now()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) check("user-1", now)
    const r1 = check("user-1", now + 10_000)
    const r2 = check("user-1", now + 30_000)
    expect(r1.retryAfter).toBeGreaterThan(r2.retryAfter)
  })
})

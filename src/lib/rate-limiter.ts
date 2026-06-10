// Rate limiter for the AI test endpoint.
// InMemoryRateLimiter: always available; per-process (resets on cold start).
//
// A Redis-backed limiter (Upstash) can be reintroduced here once the optional
// @upstash/ratelimit + @upstash/redis packages are added to the dependency tree.
// The previous Upstash adapter was removed because those packages were never
// declared, so its require() always threw and silently fell back to memory.

export interface RateLimiter {
  check(userId: string): Promise<{ allowed: boolean; retryAfter: number }>
}

export const RATE_LIMIT_MAX    = 5
export const RATE_LIMIT_WINDOW = 60_000 // ms

export class InMemoryRateLimiter implements RateLimiter {
  private readonly map = new Map<string, { count: number; windowStart: number }>()

  async check(userId: string): Promise<{ allowed: boolean; retryAfter: number }> {
    const now = Date.now()
    // Evict entries older than 2× the window to prevent unbounded Map growth (M-004)
    for (const [id, e] of this.map.entries()) {
      if (now - e.windowStart > RATE_LIMIT_WINDOW * 2) this.map.delete(id)
    }
    const entry = this.map.get(userId)
    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW) {
      this.map.set(userId, { count: 1, windowStart: now })
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

let _limiter: RateLimiter | null = null

export function createRateLimiter(): RateLimiter {
  if (!_limiter) _limiter = new InMemoryRateLimiter()
  return _limiter
}

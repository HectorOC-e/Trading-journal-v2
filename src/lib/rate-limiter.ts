// Rate limiter abstraction for AI test endpoint.
// InMemoryRateLimiter: always available; per-process (resets on cold start).
// UpstashRateLimiter: Redis-backed sliding window; requires UPSTASH_REDIS_REST_URL + TOKEN env vars.
// createRateLimiter() returns Upstash when env vars are present, InMemory otherwise.

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

export class UpstashRateLimiter implements RateLimiter {
  // Lazy-loaded to avoid breaking builds when @upstash packages are not installed.
  // Falls back to InMemoryRateLimiter when packages or Redis connection are unavailable.
  private fallback = new InMemoryRateLimiter()

  async check(userId: string): Promise<{ allowed: boolean; retryAfter: number }> {
    try {
      // Use require() to avoid TS2307: @upstash packages are optional peer deps not installed by default.
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const rl  = require("@upstash/ratelimit") as any
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const rdm = require("@upstash/redis") as any
      const redis = rdm.Redis.fromEnv()
      const ratelimit = new rl.Ratelimit({
        redis,
        limiter: rl.Ratelimit.slidingWindow(RATE_LIMIT_MAX, `${RATE_LIMIT_WINDOW / 1000} s`),
        prefix: "tj:ai-test",
      })
      const result = await ratelimit.limit(userId)
      return {
        allowed: result.success,
        retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
      }
    } catch {
      return this.fallback.check(userId)
    }
  }
}

let _limiter: RateLimiter | null = null

export function createRateLimiter(): RateLimiter {
  if (!_limiter) {
    _limiter = process.env.UPSTASH_REDIS_REST_URL
      ? new UpstashRateLimiter()
      : new InMemoryRateLimiter()
  }
  return _limiter
}

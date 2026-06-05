import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next",
  // @upstash packages are optional peer deps (Redis rate limiter).
  // Marking as external prevents Turbopack from trying to bundle them at build time;
  // the try/catch in UpstashRateLimiter falls back to InMemory when they're absent.
  serverExternalPackages: ["@upstash/ratelimit", "@upstash/redis"],
}

export default nextConfig

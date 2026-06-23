import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next",
  // Keep the headless-Chromium packages out of the bundler so they're traced into the
  // serverless function. puppeteer-core (not playwright-core) because @sparticuz/chromium
  // targets puppeteer and playwright-core's runtime path requires weren't traced by Vercel
  // (caused "Cannot find module …playwright…" → /api/reviews/pdf 500).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
}

export default nextConfig

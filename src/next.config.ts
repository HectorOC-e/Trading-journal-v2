import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next",
  // Keep the headless-Chromium packages out of the bundler so they're traced into the
  // serverless function. puppeteer-core (not playwright-core) because @sparticuz/chromium
  // targets puppeteer and playwright-core's runtime path requires weren't traced by Vercel
  // (caused "Cannot find module …playwright…" → /api/reviews/pdf 500).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Force the @sparticuz/chromium binary pack (bin/*.br — the compressed Chromium) into the
  // serverless functions that render PDFs. Externalizing alone isn't enough: nothing
  // statically requires bin/, so Next's file tracing drops it and chromium.executablePath()
  // throws "The input directory …/bin does not exist" at runtime on Vercel. Glob targets the
  // real pnpm path (version-wildcarded), relative to this project dir (src/).
  outputFileTracingIncludes: {
    "/api/reviews/pdf": ["./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**"],
    "/api/cron/reviews-digest": ["./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**"],
  },
}

export default nextConfig

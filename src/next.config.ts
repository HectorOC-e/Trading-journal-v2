import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next",
  // Keep the headless-Chromium packages out of the bundler so their native binary
  // is traced into the serverless function (otherwise /api/reviews/pdf 500s on
  // Vercel because chromium.executablePath() resolves to a file that wasn't shipped).
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
}

export default nextConfig

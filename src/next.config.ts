import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  distDir: ".next",
  outputFileTracingRoot: path.join(__dirname, "../"),
  // Vercel's build adapter (written for Next.js 15) reads outputFileTracingRoot
  // from config.experimental. Next.js 16 moved it to the top level.
  // Providing it in both places prevents the adapter from receiving undefined
  // and crashing with "path argument must be of type string".
  experimental: {
    // @ts-expect-error outputFileTracingRoot moved to top-level in Next.js 16
    outputFileTracingRoot: path.join(__dirname, "../"),
  },
}

export default nextConfig

// Drift guard for ACTIVE_AI_FEATURES.
//
// ACTIVE_AI_FEATURES claims to list the features consumed by a live LLM call-site.
// Nothing enforced that claim, so it drifted: psychology_analysis gained a call-site
// and the list never learned about it, which made the "Diagnóstico IA" panel hide a
// feature that really does call an LLM. This test derives the truth from the source
// and fails when the two disagree in either direction.

import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "fs"
import path from "path"
import { AI_FEATURES, ACTIVE_AI_FEATURES, type AiFeature } from "@/lib/ai/feature-models"

const SRC_ROOT = path.resolve(__dirname, "../..")
const SCAN_DIRS = ["lib", "server", "app", "domains"]

/** Every .ts/.tsx file under the given roots. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated") continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

/**
 * Features passed as a string literal to a real LLM resolver call.
 * Call-sites that pass a variable (the generic `completeText` wrapper, `resolveAiCall`
 * itself, and the diagnostics loop — all of which take the feature as an argument)
 * intentionally do not match: they are plumbing, not consumers.
 */
function featuresWithLiveCallSites(): Set<AiFeature> {
  const found = new Set<AiFeature>()
  // resolveModelForFeature is included because embeddings resolve through it
  // (resolveEmbeddingCall) rather than through resolveAiCall.
  const CALL = /(?:resolveAiCall|completeText|resolveModelForFeature)\([^)]*?["']([a-z_]+)["']/g

  for (const dir of SCAN_DIRS) {
    for (const file of sourceFiles(path.join(SRC_ROOT, dir))) {
      const src = readFileSync(file, "utf8")
      for (const m of src.matchAll(CALL)) {
        const feature = m[1] as AiFeature
        if ((AI_FEATURES as readonly string[]).includes(feature)) found.add(feature)
      }
    }
  }
  return found
}

describe("ACTIVE_AI_FEATURES", () => {
  it("matches the features that actually have a live LLM call-site", () => {
    const actual = [...featuresWithLiveCallSites()].sort()
    expect([...ACTIVE_AI_FEATURES].sort()).toEqual(actual)
  })

  it("only lists real features", () => {
    for (const f of ACTIVE_AI_FEATURES) {
      expect(AI_FEATURES).toContain(f)
    }
  })

  it("finds a non-trivial number of call-sites (the scanner still works)", () => {
    // Guards against the regex silently matching nothing and making this suite vacuous.
    expect(featuresWithLiveCallSites().size).toBeGreaterThanOrEqual(4)
  })
})

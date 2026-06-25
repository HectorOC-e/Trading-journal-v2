// ─────────────────────────────────────────────────────────────────────────────
// Insight reconciliation — historization diff (C8, FREEZE-E6).
//
// v2 recomputed insights on every request and threw them away, so "did this
// insight get better or worse?" was unanswerable. v3 persists insights. This PURE
// function decides, given what is already stored and what a detector just
// computed, which insights to CREATE (newly appeared), TOUCH (still present →
// bump lastSeenAt) or RESOLVE (active row that disappeared).
//
// A `fingerprint` is the stable identity of an insight across runs (e.g.
// `${type}:${scope}`), so the same recurring insight is one row over time, not a
// new row per run. Statistical fields (sampleSize/confidence) ride along on
// `ComputedInsight`; the Bayesian estimator that fills confidence lands in S3
// (ADR-002) — S0 only persists what detectors already provide.
// ─────────────────────────────────────────────────────────────────────────────

export type InsightStatus = "active" | "resolved" | "committed"

/** A reference to an already-persisted insight (only the fields the diff needs). */
export interface PersistedInsightRef {
  id: string
  fingerprint: string
  status: InsightStatus
}

/** An insight freshly produced by a detector this run. */
export interface ComputedInsight {
  fingerprint: string
  type: string
  category: string
  severity: string
  title: string
  detail: string
  evidence: string
  recommendation?: string
  metric?: number
  /** Statistical honesty (ADR-002). sampleSize is real; confidence may be absent until S3. */
  sampleSize: number
  confidence?: number
  credibleIntervalLow?: number
  credibleIntervalHigh?: number
  effectSize?: number
  windowFrom?: string
  windowTo?: string
}

export interface ReconcilePlan {
  toCreate: ComputedInsight[]
  toTouch: PersistedInsightRef[]
  toResolve: PersistedInsightRef[]
}

/**
 * Diff persisted vs computed insights. An insight is identified by `fingerprint`;
 * only `active` persisted rows participate in touch/resolve (a `resolved` row that
 * reappears is re-created, preserving the historical resolved record).
 */
export function reconcileInsights(
  existing: PersistedInsightRef[],
  computed: ComputedInsight[],
): ReconcilePlan {
  const activeByFingerprint = new Map<string, PersistedInsightRef>()
  for (const e of existing) {
    if (e.status === "active") activeByFingerprint.set(e.fingerprint, e)
  }

  // Dedupe the computed batch by fingerprint (keep first) so `toCreate` never
  // violates the one-active-row-per-fingerprint invariant when two detectors
  // emit the same insight identity.
  const uniqueComputed: ComputedInsight[] = []
  const seen = new Set<string>()
  for (const c of computed) {
    if (seen.has(c.fingerprint)) continue
    seen.add(c.fingerprint)
    uniqueComputed.push(c)
  }
  const computedFingerprints = seen

  const toCreate = uniqueComputed.filter((c) => !activeByFingerprint.has(c.fingerprint))
  const toTouch = [...activeByFingerprint.values()].filter((e) => computedFingerprints.has(e.fingerprint))
  const toResolve = [...activeByFingerprint.values()].filter((e) => !computedFingerprints.has(e.fingerprint))

  return { toCreate, toTouch, toResolve }
}

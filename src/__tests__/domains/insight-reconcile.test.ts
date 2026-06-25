import { describe, it, expect } from "vitest"
import {
  reconcileInsights,
  type PersistedInsightRef,
  type ComputedInsight,
} from "@/domains/analytics/insights/insight-reconcile"

function existing(o: Partial<PersistedInsightRef> & { id: string; fingerprint: string }): PersistedInsightRef {
  return { status: "active", ...o }
}
function computed(fingerprint: string): ComputedInsight {
  return { fingerprint, type: "intraday-decay", category: "risk", severity: "warning", title: "t", detail: "d", evidence: "e", sampleSize: 30 }
}

describe("reconcileInsights — historization diff (C8)", () => {
  it("creates insights that are newly computed", () => {
    const plan = reconcileInsights([], [computed("a"), computed("b")])
    expect(plan.toCreate.map((c) => c.fingerprint)).toEqual(["a", "b"])
    expect(plan.toTouch).toEqual([])
    expect(plan.toResolve).toEqual([])
  })

  it("touches insights that are still present (updates lastSeenAt, no duplicate)", () => {
    const plan = reconcileInsights([existing({ id: "1", fingerprint: "a" })], [computed("a")])
    expect(plan.toCreate).toEqual([])
    expect(plan.toTouch.map((e) => e.id)).toEqual(["1"])
    expect(plan.toResolve).toEqual([])
  })

  it("resolves active insights that disappeared from the computed set", () => {
    const plan = reconcileInsights([existing({ id: "1", fingerprint: "a" })], [])
    expect(plan.toResolve.map((e) => e.id)).toEqual(["1"])
  })

  it("does not resolve insights that were already resolved", () => {
    const plan = reconcileInsights([existing({ id: "1", fingerprint: "a", status: "resolved" })], [])
    expect(plan.toResolve).toEqual([])
  })

  it("re-creates an insight whose only prior record was resolved (reappearance)", () => {
    const plan = reconcileInsights([existing({ id: "1", fingerprint: "a", status: "resolved" })], [computed("a")])
    expect(plan.toCreate.map((c) => c.fingerprint)).toEqual(["a"])
    expect(plan.toTouch).toEqual([])
  })

  it("deduplicates computed insights sharing a fingerprint (keeps the first)", () => {
    const a1 = computed("dup")
    const a2 = { ...computed("dup"), title: "second" }
    const plan = reconcileInsights([], [a1, a2])
    expect(plan.toCreate).toHaveLength(1)
    expect(plan.toCreate[0].title).toBe("t")
  })

  it("handles a mixed batch", () => {
    const plan = reconcileInsights(
      [existing({ id: "1", fingerprint: "keep" }), existing({ id: "2", fingerprint: "gone" })],
      [computed("keep"), computed("new")],
    )
    expect(plan.toCreate.map((c) => c.fingerprint)).toEqual(["new"])
    expect(plan.toTouch.map((e) => e.id)).toEqual(["1"])
    expect(plan.toResolve.map((e) => e.id)).toEqual(["2"])
  })
})
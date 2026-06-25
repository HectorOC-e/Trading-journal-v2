import { describe, it, expect } from "vitest"
import {
  planEventTransition,
  isKnownEventType,
  type DomainEventRecord,
} from "@/domains/cognitive/events/event-bus"

function rec(o: Partial<DomainEventRecord>): DomainEventRecord {
  return { attempts: 0, maxAttempts: 5, ...o } as DomainEventRecord
}

describe("planEventTransition — outbox state machine", () => {
  it("marks an event processed on success and stamps processedAt", () => {
    const next = planEventTransition(rec({ attempts: 0 }), { ok: true }, new Date("2026-01-01T00:00:00Z"))
    expect(next.status).toBe("processed")
    expect(next.processedAt).toEqual(new Date("2026-01-01T00:00:00Z"))
    expect(next.attempts).toBe(1)
  })

  it("re-queues for retry on failure while attempts remain", () => {
    const next = planEventTransition(rec({ attempts: 0, maxAttempts: 3 }), { ok: false, error: "boom" })
    expect(next.status).toBe("pending")
    expect(next.attempts).toBe(1)
    expect(next.lastError).toBe("boom")
    expect(next.processedAt).toBeNull()
  })

  it("marks an event failed once attempts are exhausted", () => {
    const next = planEventTransition(rec({ attempts: 2, maxAttempts: 3 }), { ok: false, error: "boom" })
    expect(next.status).toBe("failed")
    expect(next.attempts).toBe(3)
  })
})

describe("isKnownEventType — the frozen catalog (FREEZE-EV)", () => {
  it("accepts catalog events", () => {
    expect(isKnownEventType("trade.created")).toBe(true)
    expect(isKnownEventType("insight.created")).toBe(true)
    expect(isKnownEventType("account.dd_breach")).toBe(true)
  })

  it("rejects unknown events (guards against typos at publish time)", () => {
    expect(isKnownEventType("trade.exploded")).toBe(false)
    expect(isKnownEventType("")).toBe(false)
  })
})
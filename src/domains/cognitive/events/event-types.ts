// ─────────────────────────────────────────────────────────────────────────────
// Domain event catalog — the frozen list (ARCHITECTURE_FREEZE §4.2, FREEZE-EV).
//
// This is the canonical vocabulary of "what happened" in the system. The outbox
// (`domain_events`) only ever stores these types; `isKnownEventType` guards the
// publish path against typos.
//
// Sprint 0 scope: define the catalog + payload SHAPES only. Producers (trade
// mutations) and consumers (behavior/coach) are wired in later sprints — S0 ships
// the vocabulary and the transport, not the reactions.
// ─────────────────────────────────────────────────────────────────────────────

/** The frozen catalog. Adding a type is an architectural change (cite FREEZE-EV). */
export const DOMAIN_EVENT_TYPES = [
  "trade.created", // EV1
  "trade.closed", // EV2
  "insight.created", // EV3
  "insight.resolved", // EV4
  "commitment.created", // EV5
  "commitment.kept", // EV6
  "commitment.partial", // EV6
  "commitment.broken", // EV6
  "rule.fired", // EV7
  "account.dd_approach", // EV8
  "account.dd_breach", // EV8
  "checkin.submitted", // EV9
  "intervention.responded", // EV10
] as const

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number]

/** Minimal payload contracts. Filled in by producers in later sprints. */
export interface DomainEventPayloads {
  "trade.created": { tradeId: string }
  "trade.closed": { tradeId: string }
  "insight.created": { insightId: string }
  "insight.resolved": { insightId: string }
  "commitment.created": { commitmentId: string }
  "commitment.kept": { commitmentId: string }
  "commitment.partial": { commitmentId: string }
  "commitment.broken": { commitmentId: string }
  "rule.fired": { ruleId: string; tradeId?: string }
  "account.dd_approach": { accountId: string }
  "account.dd_breach": { accountId: string }
  "checkin.submitted": { checkinId: string }
  "intervention.responded": { interventionId: string }
}

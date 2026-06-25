// ─────────────────────────────────────────────────────────────────────────────
// Domain event bus — transactional OUTBOX backbone (ADR-001, FREEZE-D1/D6).
//
// `lib/coach-bus.ts` (a 9-line client-side window event) is NOT this. This is the
// server-side bus that ADR-001 decides: every domain mutation writes an event row
// in the SAME transaction as its business change; a dispatcher later claims pending
// rows and hands them to registered handlers (at-least-once + idempotent).
//
// Sprint 0 scope: publish + claim/dispatch + handler registry + the PURE state
// machine (`planEventTransition`). No real handlers are registered yet — consumers
// arrive in S4+. This file ships the transport, not the reactions.
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client"
import {
  DOMAIN_EVENT_TYPES,
  type DomainEventType,
  type DomainEventPayloads,
} from "./event-types"

export type EventStatus = "pending" | "processing" | "processed" | "failed"

const KNOWN = new Set<string>(DOMAIN_EVENT_TYPES)

/** Guards the publish path against typos / unknown event types. */
export function isKnownEventType(type: string): type is DomainEventType {
  return KNOWN.has(type)
}

// ── Pure state machine ───────────────────────────────────────────────────────
// Extracted so the retry/exhaustion logic is unit-testable without a database.

export interface DomainEventRecord {
  attempts: number
  maxAttempts: number
}

export interface HandlerOutcome {
  ok: boolean
  error?: string
}

export interface EventTransition {
  status: EventStatus
  attempts: number
  processedAt: Date | null
  lastError: string | null
}

/** Decide the next outbox row state after a handler runs. Pure. */
export function planEventTransition(
  event: DomainEventRecord,
  outcome: HandlerOutcome,
  now: Date = new Date(),
): EventTransition {
  const attempts = event.attempts + 1
  if (outcome.ok) {
    return { status: "processed", attempts, processedAt: now, lastError: null }
  }
  const exhausted = attempts >= event.maxAttempts
  return {
    status: exhausted ? "failed" : "pending",
    attempts,
    processedAt: null,
    lastError: outcome.error ?? "unknown error",
  }
}

// ── Publish (outbox write) ───────────────────────────────────────────────────

type Tx = Prisma.TransactionClient | PrismaClient

export interface PublishInput<T extends DomainEventType = DomainEventType> {
  userId: string
  type: T
  payload: DomainEventPayloads[T]
  /** Optional idempotency key; a duplicate dedupeKey is silently ignored. */
  dedupeKey?: string
  occurredAt?: Date
}

/**
 * Write a domain event to the outbox. MUST be called inside the same transaction
 * as the business mutation that produced it (FREEZE-D6). Unknown types throw —
 * publishing is a typed, guarded operation.
 */
export async function publishEvent<T extends DomainEventType>(tx: Tx, input: PublishInput<T>): Promise<void> {
  if (!isKnownEventType(input.type)) {
    throw new Error(`Unknown domain event type: ${input.type}`)
  }
  await tx.domainEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      dedupeKey: input.dedupeKey ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  })
}

// ── Handler registry + dispatcher ────────────────────────────────────────────

export type EventHandler = (event: {
  id: string
  userId: string
  type: DomainEventType
  payload: unknown
}) => Promise<void>

const handlers = new Map<DomainEventType, EventHandler[]>()

/** Register a consumer for an event type. Consumers are added in S4+. */
export function registerHandler(type: DomainEventType, handler: EventHandler): void {
  const list = handlers.get(type) ?? []
  list.push(handler)
  handlers.set(type, list)
}

/** Test/maintenance helper — clears the in-memory registry. */
export function _resetHandlers(): void {
  handlers.clear()
}

export interface DispatchResult {
  claimed: number
  processed: number
  failed: number
}

/**
 * Claim a batch of pending events and run their handlers. Idempotent and safe to
 * run concurrently: rows are claimed with `FOR UPDATE SKIP LOCKED`. An event with
 * no registered handler is considered processed (no-op) — the catalog can outrun
 * its consumers without blocking the outbox.
 */
export async function dispatchPending(prisma: PrismaClient, batchSize = 50): Promise<DispatchResult> {
  const claimed = await prisma.$queryRaw<Array<{ id: string; user_id: string; type: string; payload: unknown; attempts: number; max_attempts: number }>>`
    UPDATE domain_events
       SET status = 'processing'
     WHERE id IN (
       SELECT id FROM domain_events
        WHERE status = 'pending'
        ORDER BY occurred_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, user_id, type, payload, attempts, max_attempts
  `

  let processed = 0
  let failed = 0

  for (const row of claimed) {
    const type = row.type as DomainEventType
    const list = handlers.get(type) ?? []
    let outcome: HandlerOutcome = { ok: true }
    try {
      for (const h of list) {
        await h({ id: row.id, userId: row.user_id, type, payload: row.payload })
      }
    } catch (e) {
      outcome = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }

    const next = planEventTransition({ attempts: row.attempts, maxAttempts: row.max_attempts }, outcome)
    await prisma.domainEvent.update({
      where: { id: row.id },
      data: {
        status: next.status,
        attempts: next.attempts,
        processedAt: next.processedAt,
        lastError: next.lastError,
      },
    })
    if (next.status === "processed") processed++
    else if (next.status === "failed") failed++
  }

  return { claimed: claimed.length, processed, failed }
}

// ─────────────────────────────────────────────────────────────────────────────
// Commitment service (Behavior Engine I, S4) — the loop's server side.
//
// createCommitmentFromInsight → evaluateCommitment → reinforce, plus the window-end
// job and review carry-over. Pure decisions live in domains/behavior/*; this file
// is the I/O shell: load data, run the verifier, persist the check + state
// transition + reinforcement, and emit commitment.* on the OUTBOX in the same
// transaction (FREEZE-D6, EV5/EV6).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { publishEvent } from "@/domains/cognitive/events/event-bus"
import { getVerifier, type WindowTrade } from "@/domains/behavior/verifiers"
import {
  deriveCommitmentSpec,
  evaluateResult,
  type CommitmentWindow,
} from "@/domains/behavior/commitment-machine"
import { planReinforcement } from "@/domains/behavior/reinforcement"

export class NoVerifierError extends Error {
  constructor(insightType: string) {
    super(`Insight "${insightType}" has no verifier — offer study/note, not a commitment.`)
    this.name = "NoVerifierError"
  }
}

function windowEnd(start: Date, window: CommitmentWindow): Date {
  const d = new Date(start)
  if (window === "day") d.setUTCDate(d.getUTCDate() + 1)
  else if (window === "week") d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d
}

export interface CreateCommitmentOverrides {
  text?: string
  target?: number
  window?: CommitmentWindow
  createdVia?: "coach" | "self" | "review"
}

/**
 * Turn a persisted insight into a verifiable commitment (BEHAVIOR_ENGINE_V3 §4.1).
 * Throws NoVerifierError when the insight type can't be verified (caller routes to
 * the study/note CTA — "ningún insight sin CTA", but also no fabricated verifiability).
 */
export async function createCommitmentFromInsight(
  prisma: PrismaClient,
  userId: string,
  insightId: string,
  overrides: CreateCommitmentOverrides = {},
) {
  const insight = await prisma.insight.findFirstOrThrow({ where: { id: insightId, userId } })
  const spec = deriveCommitmentSpec(insight.type)
  if (!spec) throw new NoVerifierError(insight.type)

  const window = overrides.window ?? spec.window
  const startAt = new Date()
  const endAt = windowEnd(startAt, window)

  return prisma.$transaction(async (tx) => {
    const commitment = await tx.commitment.create({
      data: {
        userId,
        sourceInsightId: insight.id,
        text: overrides.text ?? spec.text,
        metricKey: spec.metricKey,
        target: overrides.target ?? spec.target,
        comparator: spec.comparator,
        window,
        startAt,
        endAt,
        status: "active",
        createdVia: overrides.createdVia ?? "self",
      },
    })
    // Mark the insight as committed so it stops nagging and the loop is visible.
    await tx.insight.update({ where: { id: insight.id }, data: { status: "committed" } })
    await publishEvent(tx, { userId, type: "commitment.created", payload: { commitmentId: commitment.id } })
    return commitment
  })
}

/** Map closed trades in a window to the pure WindowTrade shape the verifiers read. */
async function loadWindowTrades(prisma: PrismaClient, userId: string, from: Date, to: Date): Promise<WindowTrade[]> {
  const rows = await prisma.trade.findMany({
    where: { userId, status: "CLOSED", date: { gte: from, lt: to } },
    select: {
      id: true, date: true, pnl: true, rMultiple: true, tags: true,
      riskPct: true, revengeFlag: true, fomoFlag: true, openTime: true,
    },
  })
  return rows.map((t) => ({
    id: t.id,
    date: (t.date as Date).toISOString().slice(0, 10),
    pnl: t.pnl != null ? Number(t.pnl) : 0,
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    tags: (t.tags as string[]) ?? [],
    riskPct: t.riskPct != null ? Number(t.riskPct) : null,
    revengeFlag: t.revengeFlag,
    fomoFlag: t.fomoFlag,
    openTime: t.openTime as string | null,
  }))
}

export interface EvaluateResultOut {
  status: "kept" | "partial" | "broken" | "expired"
  observedValue: number | null
}

/**
 * Verify one commitment over its window: measure observedValue, decide the result,
 * persist a CommitmentCheck + state transition + reinforcement, and emit the
 * commitment.{kept,partial,broken} event. No trades in the window → EXPIRED (no
 * data to judge — never falsely rewards inactivity). Idempotent-ish: re-evaluating
 * an already-terminal commitment is a no-op.
 */
export async function evaluateCommitment(
  prisma: PrismaClient,
  userId: string,
  commitmentId: string,
): Promise<EvaluateResultOut> {
  const c = await prisma.commitment.findFirstOrThrow({ where: { id: commitmentId, userId } })
  if (c.status !== "active" || c.archivedAt) return { status: c.status as EvaluateResultOut["status"], observedValue: null }

  const verifier = getVerifier(c.metricKey)
  if (!verifier) return { status: "expired", observedValue: null }

  const trades = await loadWindowTrades(prisma, userId, c.startAt, c.endAt)
  if (trades.length === 0) {
    await prisma.commitment.update({ where: { id: c.id }, data: { status: "expired" } })
    return { status: "expired", observedValue: null }
  }

  const { observedValue, evidence } = verifier(trades)
  const result = evaluateResult(observedValue, c.target, c.comparator as "<=" | ">=" | "==")
  const plan = planReinforcement(result, c.keptCount)

  await prisma.$transaction(async (tx) => {
    await tx.commitmentCheck.create({
      data: { commitmentId: c.id, userId, observedValue, result, evidence },
    })
    await tx.commitment.update({
      where: { id: c.id },
      data: { status: result, keptCount: result === "kept" ? c.keptCount + 1 : c.keptCount },
    })
    await tx.reinforcement.create({
      data: { userId, commitmentId: c.id, kind: plan.kind, visible: plan.visible, channel: "today" },
    })
    await publishEvent(tx, { userId, type: `commitment.${result}` as const, payload: { commitmentId: c.id } })
  })

  return { status: result, observedValue }
}

export interface WindowEvalSummary {
  evaluated: number
  kept: number
  partial: number
  broken: number
  expired: number
}

/**
 * Window-end job (BEHAVIOR_ENGINE_V3 §6): evaluate every active commitment whose
 * window has closed. `userId` optional — omit to sweep all users (cron).
 */
export async function evaluateWindowCommitments(prisma: PrismaClient, userId?: string): Promise<WindowEvalSummary> {
  const due = await prisma.commitment.findMany({
    where: { status: "active", archivedAt: null, endAt: { lte: new Date() }, ...(userId ? { userId } : {}) },
    select: { id: true, userId: true },
  })
  const sum: WindowEvalSummary = { evaluated: 0, kept: 0, partial: 0, broken: 0, expired: 0 }
  for (const d of due) {
    try {
      const r = await evaluateCommitment(prisma, d.userId, d.id)
      sum.evaluated++
      sum[r.status]++
    } catch {
      // best-effort: one failure never blocks the rest of the sweep
    }
  }
  return sum
}

/**
 * Review carry-over (#5): commitments relevant to a review scope — active ones plus
 * those whose window closed recently — with their latest check, for the
 * "¿Cumpliste?" block.
 */
export async function carryOverCommitments(prisma: PrismaClient, userId: string, sinceDays = 14) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - sinceDays)
  return prisma.commitment.findMany({
    where: { userId, archivedAt: null, OR: [{ status: "active" }, { updatedAt: { gte: since } }] },
    orderBy: { createdAt: "desc" },
    include: { checks: { orderBy: { evaluatedAt: "desc" }, take: 1 } },
  })
}

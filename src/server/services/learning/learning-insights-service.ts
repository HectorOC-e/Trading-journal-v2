// ─────────────────────────────────────────────────────────────────────────────
// Learning insights service (S11) — prisma orchestration over the pure learning
// analytics: transfer (#31, before/after a resource's study date over its linked
// setups, honest association per D17), the linked-setup performance signal that
// adapts SRS cadence (#45), and errors→cards (#42). Read-only; surfaces in S12.
// (`computeNextReview` is already wired into the grade mutation — see
// learning-resources.ts:245. An older comment here claimed it was pending.)
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { computeTransfer, type TransferResult } from "@/domains/learning/transfer"
import { generateErrorCards, type ErrorCard } from "@/domains/learning/error-cards"
import { detectEdgeDecay } from "@/domains/analytics/setups/edge-decay"
import type { PerfSignal } from "@/domains/learning/srs"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))

/** Default mistake tags (mirrors the intervention violation set) + flag-derived ones. */
export const DEFAULT_ERROR_TAGS = ["Off-plan", "Impulsivo", "Revancha", "Revanche", "FOMO", "dudé"]

export interface ResourceTransfer {
  transfer: TransferResult
  /** Linked-setup edge signal that should bend the review cadence (#45). */
  performanceSignal: PerfSignal
  /** UI nudge: review sooner because the linked edge is decaying. */
  reviewSooner: boolean
}

export async function getResourceTransfer(
  prisma: PrismaClient,
  userId: string,
  resourceId: string,
): Promise<ResourceTransfer | null> {
  const resource = await prisma.learningResource.findFirst({
    where: { id: resourceId, userId },
    select: { date: true, linkedSetups: { select: { id: true } } },
  })
  if (!resource) return null

  const setupIds = resource.linkedSetups.map((s) => s.id)
  if (setupIds.length === 0) {
    return {
      transfer: computeTransfer({ before: [], after: [] }),
      performanceSignal: null,
      reviewSooner: false,
    }
  }

  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED", setupId: { in: setupIds } },
    orderBy: [{ date: "asc" }],
    select: { rMultiple: true, date: true },
  })

  const cut = resource.date.getTime()
  const before: number[] = []
  const after: number[] = []
  for (const t of trades) {
    const r = num(t.rMultiple)
    if (r == null) continue
    if (t.date.getTime() < cut) before.push(r)
    else after.push(r)
  }

  const transfer = computeTransfer({ before, after })

  // Performance signal: recent vs earlier linked-setup R (drives SRS cadence).
  const allR = trades.map((t) => num(t.rMultiple)).filter((r): r is number => r != null)
  const recent = allR.slice(-20)
  const baseline = allR.slice(0, -20)
  const decay = detectEdgeDecay({ recent, baseline: baseline.length >= 2 ? baseline : null })
  const performanceSignal: PerfSignal =
    decay.status === "decaying" ? "decaying" : decay.status === "improving" ? "improving" : decay.status === "stable" ? "stable" : null

  return { transfer, performanceSignal, reviewSooner: performanceSignal === "decaying" }
}

export async function getErrorCards(prisma: PrismaClient, userId: string): Promise<ErrorCard[]> {
  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: { tags: true, rMultiple: true, pnl: true, revengeFlag: true, fomoFlag: true },
  })
  const mapped = trades.map((t) => {
    const tags = [...t.tags]
    if (t.revengeFlag) tags.push("Revancha")
    if (t.fomoFlag) tags.push("FOMO")
    return { tags, rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 }
  })
  return generateErrorCards({ trades: mapped, errorTags: DEFAULT_ERROR_TAGS })
}

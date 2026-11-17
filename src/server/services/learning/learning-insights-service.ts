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
import type { OperationalMode } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))

/** Default mistake tags (mirrors the intervention violation set) + flag-derived ones. */
export const DEFAULT_ERROR_TAGS = ["Off-plan", "Impulsivo", "Revancha", "Revanche", "FOMO", "dudé"]

export interface ResourceTransfer {
  transfer: TransferResult
  /** Linked-setup edge signal that should bend the review cadence (#45). */
  performanceSignal: PerfSignal
  /** UI nudge: review sooner because the linked edge is decaying. */
  reviewSooner: boolean
  mode: OperationalMode
  missingEvidence?: string
}

export async function getResourceTransfer(
  prisma: PrismaClient,
  userId: string,
  resourceId: string,
  mode: OperationalMode = "REAL",
): Promise<ResourceTransfer | null> {
  const resource = await prisma.learningResource.findFirst({
    where: { id: resourceId, userId },
    select: {
      completedAt: true,
      linkedSetups: { select: { id: true } },
      studySessions: { where: { status: "completed", source: { not: "practice" }, durationMin: { gt: 0 }, endedAt: { not: null } }, select: { endedAt: true }, orderBy: { endedAt: "asc" }, take: 1 },
      reviews: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  })
  if (!resource) return null

  const setupIds = resource.linkedSetups.map((s) => s.id)
  const milestones = [resource.completedAt, ...resource.studySessions.map(s => s.endedAt), ...resource.reviews.map(r => r.createdAt)].filter((d): d is Date => !!d)
  const cut = milestones.length ? Math.min(...milestones.map(d => d.getTime())) : null
  if (setupIds.length === 0 || cut === null) {
    return {
      transfer: computeTransfer({ before: [], after: [] }),
      performanceSignal: null,
      reviewSooner: false,
      mode,
      missingEvidence: cut === null ? "Falta un hito de estudio verificable: registra la finalización del recurso, una sesión de estudio o un repaso." : "Vincula un setup para comparar evidencia de esta modalidad.",
    }
  }

  const trades = await prisma.trade.findMany({
    where: { ...await scopedTradeWhere(prisma, userId, { mode, includeArchived: true }), status: "CLOSED", setupId: { in: setupIds } },
    orderBy: [{ date: "asc" }],
    select: { rMultiple: true, date: true, practiceLinks: { where: { role: "EXECUTED", userId, practice: { operationalMode: mode, kind: "EXECUTION" } }, select: { role: true, practice: { select: { date: true } } } } },
  })

  const before: number[] = []
  const after: number[] = []
  const dated: { at: number; r: number }[] = []
  for (const t of trades) {
    const r = num(t.rMultiple)
    if (r == null) continue
    const date = mode === "REAL" ? t.date : t.practiceLinks.find(l => l.role === "EXECUTED")?.practice.date
    if (!date) continue
    dated.push({ at: date.getTime(), r })
    if (date.getTime() < cut) before.push(r)
    else after.push(r)
  }

  const transfer = computeTransfer({ before, after })

  // Performance signal: recent vs earlier linked-setup R (drives SRS cadence).
  const allR = dated.sort((a,b) => a.at-b.at).map(t => t.r)
  const recent = allR.slice(-20)
  const baseline = allR.slice(0, -20)
  const decay = detectEdgeDecay({ recent, baseline: baseline.length >= 2 ? baseline : null })
  const performanceSignal: PerfSignal =
    decay.status === "decaying" ? "decaying" : decay.status === "improving" ? "improving" : decay.status === "stable" ? "stable" : null

  return { transfer, performanceSignal, reviewSooner: performanceSignal === "decaying", mode,
    ...(dated.length !== trades.length ? { missingEvidence: "Las operaciones simuladas sin fecha EXECUTED verificable no entran en esta comparación." } : {}) }
}

export async function getErrorCards(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<ErrorCard[]> {
  const trades = await prisma.trade.findMany({
    where: { ...await scopedTradeWhere(prisma, userId, { mode, includeArchived: true }), status: "CLOSED" },
    select: { tags: true, rMultiple: true, pnl: true, revengeFlag: true, fomoFlag: true, account: { select: { currency: true } } },
  })
  const currencies = new Map<string, Parameters<typeof generateErrorCards>[0]["trades"]>()
  for (const t of trades) {
    const tags = [...t.tags]
    if (t.revengeFlag) tags.push("Revancha")
    if (t.fomoFlag) tags.push("FOMO")
    const currency = t.account?.currency ?? "Sin divisa"
    const group = currencies.get(currency) ?? []
    group.push({ tags, rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 })
    currencies.set(currency, group)
  }
  return [...currencies].flatMap(([currency, trades]) => generateErrorCards({ trades, errorTags: DEFAULT_ERROR_TAGS }).map(card => ({ ...card, currency }))).sort((a,b) => a.costR-b.costR)
}

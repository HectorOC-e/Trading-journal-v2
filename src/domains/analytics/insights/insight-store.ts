// ─────────────────────────────────────────────────────────────────────────────
// Insight store — persistence wrapper for the historization diff (C8, FREEZE-E6).
//
// Bridges the PURE reconcile (`insight-reconcile.ts`) to Postgres, and publishes
// `insight.created` / `insight.resolved` through the outbox (FREEZE-EV3/EV4) inside
// the SAME transaction as the writes (FREEZE-D6). This is the first end-to-end
// exercise of the S0 bus: a job produces events durably.
//
// `toComputedInsight` (pure) maps an in-memory engine Insight to the persisted
// shape. sample_size is real; the Bayesian confidence fields stay undefined until
// the estimator lands in S3 (ADR-002) — S0 does not fabricate rigor.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Insight as EngineInsight } from "@/domains/analytics/services/insights-engine"
import { proportionEstimate } from "@/domains/analytics/institutional/stats/bayes"
import { publishEvent } from "@/domains/cognitive/events/event-bus"
import {
  reconcileInsights,
  type ComputedInsight,
  type PersistedInsightRef,
  type InsightStatus,
} from "./insight-reconcile"

/**
 * Map an in-memory engine insight to the persisted, statistically-honest shape. Pure.
 *
 * When the detector exposes a statistical basis (`stat`), the Bayesian estimator
 * (ADR-002 / S3) fills `confidence` (directional, vs the detector's baseline),
 * `credibleInterval` and `effectSize`, and `sampleSize` is refined to the
 * detector's own n. Without a basis the Bayesian fields stay undefined — no
 * fabricated rigor (R6); `sampleSize` falls back to the coarse trade count.
 */
export function toComputedInsight(insight: EngineInsight, sampleSize: number): ComputedInsight {
  const base: ComputedInsight = {
    fingerprint: insight.id, // engine ids are stable slugs (e.g. "intraday-decay")
    type: insight.id,
    category: insight.category,
    severity: insight.severity,
    title: insight.title,
    detail: insight.detail,
    evidence: insight.evidence,
    recommendation: insight.recommendation,
    metric: insight.metric,
    sampleSize,
  }

  if (insight.stat?.kind === "proportion") {
    const { successes, trials, baseline, direction } = insight.stat
    const est = proportionEstimate(successes, trials, { baseline, direction })
    if (est) {
      return {
        ...base,
        sampleSize: est.sampleSize, // per-detector n is more honest than the trade count
        confidence: est.confidence,
        credibleIntervalLow: est.ciLow,
        credibleIntervalHigh: est.ciHigh,
        effectSize: est.effectSize,
      }
    }
  }

  return base
}

export interface PersistResult {
  created: number
  touched: number
  resolved: number
}

async function loadActiveRefs(prisma: PrismaClient, userId: string): Promise<PersistedInsightRef[]> {
  const rows = await prisma.insight.findMany({
    where: { userId, status: "active" },
    select: { id: true, fingerprint: true, status: true },
  })
  return rows.map((r) => ({ id: r.id, fingerprint: r.fingerprint, status: r.status as InsightStatus }))
}

/**
 * Reconcile a user's computed insights against what is stored: create new ones,
 * bump lastSeenAt on survivors, resolve the disappeared. Emits domain events for
 * created/resolved within the transaction.
 */
export async function persistInsights(
  userId: string,
  computed: ComputedInsight[],
  client: PrismaClient = defaultPrisma,
): Promise<PersistResult> {
  const existing = await loadActiveRefs(client, userId)
  const plan = reconcileInsights(existing, computed)

  await client.$transaction(async (tx) => {
    for (const c of plan.toCreate) {
      const created = await tx.insight.create({
        data: {
          userId,
          fingerprint: c.fingerprint,
          type: c.type,
          category: c.category,
          severity: c.severity,
          title: c.title,
          detail: c.detail,
          evidence: c.evidence,
          recommendation: c.recommendation ?? null,
          metric: c.metric ?? null,
          sampleSize: c.sampleSize,
          confidence: c.confidence ?? null,
          credibleIntervalLow: c.credibleIntervalLow ?? null,
          credibleIntervalHigh: c.credibleIntervalHigh ?? null,
          effectSize: c.effectSize ?? null,
          windowFrom: c.windowFrom ? new Date(c.windowFrom) : null,
          windowTo: c.windowTo ? new Date(c.windowTo) : null,
          sourceDetector: c.type,
        },
      })
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: created.id } })
    }

    if (plan.toTouch.length > 0) {
      await tx.insight.updateMany({
        where: { id: { in: plan.toTouch.map((t) => t.id) } },
        data: { lastSeenAt: new Date() },
      })
    }

    for (const r of plan.toResolve) {
      await tx.insight.update({
        where: { id: r.id },
        data: { status: "resolved", resolvedAt: new Date() },
      })
      await publishEvent(tx, { userId, type: "insight.resolved", payload: { insightId: r.id } })
    }
  })

  return { created: plan.toCreate.length, touched: plan.toTouch.length, resolved: plan.toResolve.length }
}

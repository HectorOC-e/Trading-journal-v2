// ─────────────────────────────────────────────────────────────────────────────
// Intervention service (S7) — the fast-path that runs the deterministic engine in
// the trade mutation, persists the chosen intervention, and records the response.
//
// The mutation contract is unchanged: `runIntervention` persists the row (created
// inside the create/close mutation, so it exists ≤2s) and the client reads it via
// intervention.active right after — no push, no response-shape change.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { isWin } from "@/lib/formulas"
import { detectInterventions, decideIntervention, type DayState } from "@/domains/cognitive/intervention/engine"
import { recordEpisode } from "@/server/services/memory/memory-episode-service"

const VIOLATION_TAGS = new Set(["Off-plan", "Impulsivo", "Revanche"])

/** Compute today's intervention-relevant state for an account. One query. */
export async function buildInterventionState(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
  dateStr: string,
): Promise<DayState> {
  const [account, rows] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId }, select: { initialBalance: true, ddDailyPct: true } }),
    prisma.trade.findMany({
      where: { userId, accountId, status: "CLOSED", date: new Date(dateStr) },
      orderBy: [{ closeTime: "asc" }, { createdAt: "asc" }],
      select: { pnl: true, riskPct: true, tags: true, fomoFlag: true, revengeFlag: true },
    }),
  ])

  const pnls = rows.map((r) => (r.pnl != null ? Number(r.pnl) : 0))
  const risks = rows.map((r) => (r.riskPct != null ? Number(r.riskPct) : null)).filter((n): n is number => n != null)
  const lossesToday = pnls.filter((p) => p < 0).length

  // Trailing losing streak.
  let consecutiveLosses = 0
  for (let i = pnls.length - 1; i >= 0; i--) {
    if (!isWin({ pnl: pnls[i] }) && pnls[i] < 0) consecutiveLosses++
    else break
  }

  const impulsiveToday = rows.filter(
    (r) => r.fomoFlag || r.revengeFlag || ((r.tags as string[]) ?? []).some((t) => VIOLATION_TAGS.has(t)),
  ).length

  const initial = account ? Number(account.initialBalance) : 0
  const dayPnl = pnls.reduce((s, p) => s + p, 0)
  const dayPnlPct = initial > 0 ? (dayPnl / initial) * 100 : 0

  return {
    tradesToday: rows.length,
    lossesToday,
    consecutiveLosses,
    lastRiskPct: risks.length ? risks[risks.length - 1] : null,
    avgRiskPct: risks.length ? risks.reduce((s, r) => s + r, 0) / risks.length : null,
    dayPnlPct,
    drawdownPct: Math.max(0, -dayPnlPct),
    ddDailyLimitPct: account?.ddDailyPct != null ? Number(account.ddDailyPct) : null,
    impulsiveToday,
  }
}

const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

/**
 * Fast-path: build the day state, run the engine with the user's fatigue, and
 * persist the chosen intervention (if any). Best-effort — callers never let it
 * break the trade write. Returns the created intervention id or null.
 */
export async function runIntervention(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
  dateStr: string,
): Promise<string | null> {
  const [state, activeCount, recent, shownToday] = await Promise.all([
    buildInterventionState(prisma, userId, accountId, dateStr),
    prisma.intervention.count({ where: { userId, status: "active" } }),
    prisma.intervention.findFirst({ where: { userId }, orderBy: { shownAt: "desc" }, select: { shownAt: true } }),
    prisma.intervention.count({ where: { userId, shownAt: { gte: startOfDay() } } }),
  ])

  const candidates = detectInterventions(state)
  const minsSinceLast = recent ? Math.round((Date.now() - recent.shownAt.getTime()) / 60000) : null
  const chosen = decideIntervention(candidates, { activeCount, minsSinceLast, shownToday })
  if (!chosen) return null

  const created = await prisma.intervention.create({
    data: {
      userId,
      accountId,
      trigger: chosen.trigger,
      severity: chosen.severity,
      scores: chosen.scores as unknown as Prisma.InputJsonValue,
      message: chosen.message,
      suggestedAction: chosen.suggestedAction as unknown as Prisma.InputJsonValue,
      status: "active",
    },
    select: { id: true },
  })
  return created.id
}

/** Block-action helpers for an accepted protective action. */
function protectiveRule(action: { kind?: string }) {
  if (action.kind === "risk_limit") {
    return {
      name: "Riesgo máx. 1.5% por trade",
      conditions: { field: "riskPct", cmp: "gt", value: 1.5 },
      message: "Este trade supera tu límite de riesgo (intervención aceptada).",
    }
  }
  // cooldown / stop_for_day / cascade / dd_* → cool down after a loss.
  return {
    name: "Enfriamiento tras una pérdida",
    conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 30 },
    message: "Enfriamiento activo (intervención aceptada).",
  }
}

/**
 * Record the trader's response. `accepted` → outcome 'protected' and materialise a
 * protective enforce rule; `dismissed` → outcome 'overridden' (kept for learning).
 */
export async function respondIntervention(
  prisma: PrismaClient,
  userId: string,
  interventionId: string,
  response: "accepted" | "dismissed",
): Promise<{ ruleCreated: boolean }> {
  const iv = await prisma.intervention.findFirstOrThrow({ where: { id: interventionId, userId } })
  const outcome = response === "accepted" ? "protected" : "overridden"

  let ruleCreated = false
  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: iv.id },
      data: { status: "responded", response, outcome, respondedAt: new Date() },
    })
    if (response === "accepted") {
      const action = (iv.suggestedAction as { kind?: string }) ?? {}
      if (action.kind && action.kind !== "none") {
        const r = protectiveRule(action)
        await tx.rule.create({
          data: {
            userId,
            name: r.name,
            description: "Creada desde una intervención del coach.",
            severity: "CRÍTICA",
            mode: "enforce",
            trigger: "TRADE_PRE_CREATE",
            conditions: r.conditions as unknown as Prisma.InputJsonValue,
            actions: [{ type: "BLOCK", params: { message: r.message } }] as unknown as Prisma.InputJsonValue,
            priority: 100,
            category: "Protección de capital",
            enabled: true,
          },
        })
        ruleCreated = true
      }
    }
  })

  // E13 (v3.2): record the moment as an episode the coach can recall later.
  void recordEpisode(prisma, userId, {
    eventType: "intervention",
    content: `Intervención (${iv.trigger}): ${response === "accepted" ? "aceptaste la protección" : "seguiste asumiendo el riesgo"}. ${iv.message}`,
    sourceId: iv.id,
  })

  return { ruleCreated }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule linking + suggestions service (Behavior Engine II, S5).
//
// linkRule: turn a commitment into an ENFORCE rule (pre-trade BLOCK) and link them,
// so breaking the commitment is PREVENTED. The rule is created in the unified
// `rules` table — which IS the live enforcement source post-G2 (RULES_SOURCE=rules).
//
// suggestRulesFromInsights / accept / dismiss: surface "Activar regla anti-X" on a
// critical insight. Pure proposals live in domains/behavior/rule-linking.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { requireDerivedMode } from "@/domains/behavior/operational-scope"
import type { OperationalMode } from "@/domains/trading/operational-mode"
import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { proposeRuleForCommitment, suggestRuleForInsight, type ProposedRule } from "@/domains/behavior/rule-linking"

export class NotEnforceableError extends Error {
  constructor(metricKey: string) {
    super(`Metric "${metricKey}" cannot be enforced pre-trade — no rule available.`)
    this.name = "NotEnforceableError"
  }
}

async function createRuleFromProposal(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  p: ProposedRule,
  mode: OperationalMode,
  links: { sourceCommitmentId?: string | null; sourceInsightId?: string | null },
) {
  return tx.rule.create({
    data: {
      userId,
      operationalMode: mode,
      name: p.name,
      description: "Creada desde el loop de comportamiento (compromiso → regla).",
      severity: "CRÍTICA",
      mode: p.mode,
      trigger: p.trigger,
      conditions: p.conditions as unknown as Prisma.InputJsonValue,
      actions: p.actions as unknown as Prisma.InputJsonValue,
      priority: 100,
      category: "Protección de capital",
      enabled: true,
      sourceCommitmentId: links.sourceCommitmentId ?? null,
      sourceInsightId: links.sourceInsightId ?? null,
    },
  })
}

/**
 * Back a commitment with an enforce rule and link them. Throws NotEnforceableError
 * when the commitment's metric can't be prevented pre-trade (e.g. off-plan).
 */
export async function linkRule(
  prisma: PrismaClient,
  userId: string,
  commitmentId: string,
  opts: { oversizeThresholdPct?: number; mode?: OperationalMode } = {},
) {
  const commitment = await prisma.commitment.findFirstOrThrow({ where: { id: commitmentId, userId } })
  const mode = requireDerivedMode(commitment.operationalMode, opts.mode)
  const proposal = proposeRuleForCommitment(commitment.metricKey, opts)
  if (!proposal) throw new NotEnforceableError(commitment.metricKey)

  return prisma.$transaction(async (tx) => {
    const rule = await createRuleFromProposal(tx, userId, proposal, mode, {
      sourceCommitmentId: commitment.id,
      sourceInsightId: commitment.sourceInsightId,
    })
    await tx.commitment.update({ where: { id: commitment.id }, data: { ruleId: rule.id } })
    return rule
  })
}

/**
 * Generate RuleSuggestions for critical active insights that can be enforced and
 * don't already have a pending suggestion. Idempotent per (insight). Returns count.
 */
export async function suggestRulesFromInsights(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<number> {
  const insights = await prisma.insight.findMany({
    where: { userId, operationalMode: mode, status: "active", severity: { in: ["critical", "warning"] } },
    select: { id: true, type: true, operationalMode: true },
  })
  let created = 0
  for (const i of insights) {
    const proposal = suggestRuleForInsight(i.type)
    if (!proposal) continue
    const exists = await prisma.ruleSuggestion.findFirst({
      where: { userId, operationalMode: mode, insightId: i.id, status: "pending" },
      select: { id: true },
    })
    if (exists) continue
    await prisma.ruleSuggestion.create({
      data: {
        userId,
        operationalMode: mode,
        insightId: i.id,
        proposedRule: proposal.proposedRule as unknown as Prisma.InputJsonValue,
        reason: proposal.reason,
        status: "pending",
      },
    })
    created++
  }
  return created
}

/** Accept a suggestion: materialise the proposed rule and mark it accepted. */
export async function acceptRuleSuggestion(prisma: PrismaClient, userId: string, suggestionId: string, expectedMode?: OperationalMode) {
  const s = await prisma.ruleSuggestion.findFirstOrThrow({ where: { id: suggestionId, userId } })
  const mode = requireDerivedMode(s.operationalMode, expectedMode)
  const proposal = s.proposedRule as unknown as ProposedRule
  return prisma.$transaction(async (tx) => {
    const rule = await createRuleFromProposal(tx, userId, proposal, mode, { sourceInsightId: s.insightId })
    await tx.ruleSuggestion.update({ where: { id: s.id }, data: { status: "accepted", ruleId: rule.id } })
    return rule
  })
}

/** Dismiss a suggestion (no rule created). */
export async function dismissRuleSuggestion(prisma: PrismaClient, userId: string, suggestionId: string, mode: OperationalMode = "REAL"): Promise<void> {
  await prisma.ruleSuggestion.updateMany({
    where: { id: suggestionId, userId, operationalMode: mode, status: "pending" },
    data: { status: "dismissed" },
  })
}

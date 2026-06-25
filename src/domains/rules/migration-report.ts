// ─────────────────────────────────────────────────────────────────────────────
// Rule-unification migration report (C6, gate G2).
//
// READ-ONLY. Produces the no-mapping report a human must review BEFORE the
// enforcement cutover from `automations` to the unified `rules` model. Reads the
// v2 picture: descriptive rules (rules with no source_automation_id) + automations.
// No writes — this never changes runtime behaviour.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Trigger, ConditionNode, RuleAction } from "./types"
import {
  buildNoMappingReport,
  type NoMappingReport,
  type V2Automation,
  type V2DescriptiveRule,
} from "./unification"

export async function buildMigrationReportForUser(
  prisma: PrismaClient,
  userId: string,
): Promise<NoMappingReport> {
  const [descriptiveRows, automationRows] = await Promise.all([
    prisma.rule.findMany({
      where: { userId, sourceAutomationId: null },
      select: { id: true, name: true, description: true, severity: true, isSystem: true, enabled: true },
    }),
    prisma.automation.findMany({ where: { userId } }),
  ])

  const rules: V2DescriptiveRule[] = descriptiveRows
  const automations: V2Automation[] = automationRows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    enabled: a.enabled,
    priority: a.priority,
    trigger: a.trigger as Trigger,
    conditions: a.conditions as unknown as ConditionNode,
    actions: (a.actions as unknown as RuleAction[]) ?? [],
    category: a.category,
    isSystem: a.isSystem,
  }))

  return buildNoMappingReport(rules, automations)
}

export interface MigrationReportTotals {
  users: number
  descriptiveCount: number
  automationCount: number
  unifiedTotal: number
  falseProtectionCount: number
  ambiguousCount: number
}

export async function buildMigrationReportForAll(prisma: PrismaClient): Promise<MigrationReportTotals> {
  const users = await prisma.user.findMany({ select: { id: true } })
  const totals: MigrationReportTotals = {
    users: users.length,
    descriptiveCount: 0,
    automationCount: 0,
    unifiedTotal: 0,
    falseProtectionCount: 0,
    ambiguousCount: 0,
  }
  for (const u of users) {
    const r = await buildMigrationReportForUser(prisma, u.id)
    totals.descriptiveCount += r.summary.descriptiveCount
    totals.automationCount += r.summary.automationCount
    totals.unifiedTotal += r.summary.unifiedTotal
    totals.falseProtectionCount += r.summary.falseProtectionCount
    totals.ambiguousCount += r.ambiguousAutomations.length
  }
  return totals
}

// ─────────────────────────────────────────────────────────────────────────────
// Dual-write sync: mirror an Automation into the unified `rules` model (G2).
//
// Until `automations` is retired (post-cutover cleanup), it stays the editable
// source of truth and we KEEP `rules` in sync, so flipping RULES_SOURCE='rules'
// enforces the same set. Sync is best-effort at the call site: a mirror failure
// must never break the primary automation write.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { classifyMode } from "./unification"
import type { RuleAction } from "./types"

export interface AutomationLike {
  id: string
  name: string
  description: string
  category: string
  trigger: string
  conditions: unknown
  actions: unknown
  priority: number
  enabled: boolean
  isSystem: boolean
}

/** Pure: the `rules` row fields for a given automation. */
export function ruleFieldsFromAutomation(a: AutomationLike) {
  const mode = classifyMode((a.actions as RuleAction[]) ?? [])
  return {
    name:               a.name,
    description:        a.description,
    severity:          mode === "enforce" ? "CRÍTICA" : "MEDIA",
    mode,
    enabled:           a.enabled,
    isSystem:          a.isSystem,
    trigger:           a.trigger,
    conditions:        a.conditions as Prisma.InputJsonValue,
    actions:           a.actions as Prisma.InputJsonValue,
    priority:          a.priority,
    category:          a.category,
    sourceAutomationId: a.id,
  }
}

/** Upsert the mirrored rule for an automation (no DB unique needed — find-then-write). */
export async function syncRuleFromAutomation(
  prisma: PrismaClient,
  userId: string,
  automation: AutomationLike,
): Promise<void> {
  const fields = ruleFieldsFromAutomation(automation)
  const existing = await prisma.rule.findFirst({
    where:  { userId, sourceAutomationId: automation.id },
    select: { id: true },
  })
  if (existing) {
    await prisma.rule.update({ where: { id: existing.id }, data: fields })
  } else {
    await prisma.rule.create({ data: { ...fields, userId } })
  }
}

/** Remove the mirrored rule when its automation is deleted. */
export async function deleteRuleForAutomation(prisma: PrismaClient, userId: string, automationId: string): Promise<void> {
  await prisma.rule.deleteMany({ where: { userId, sourceAutomationId: automationId } })
}

/** Mirror an enabled/priority change without reloading the automation. */
export async function patchRuleForAutomation(
  prisma: PrismaClient,
  userId: string,
  automationId: string,
  data: { enabled?: boolean; priority?: number },
): Promise<void> {
  await prisma.rule.updateMany({ where: { userId, sourceAutomationId: automationId }, data })
}

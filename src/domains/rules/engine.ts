// Rules runner. Loads enabled automations for a trigger, evaluates each condition
// tree against the context, and runs matching actions. Context is built lazily
// (only when automations exist) so triggers stay cheap when the user has no rules.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { evaluate } from "./conditions"
import { runAction } from "./actions"
import type { Trigger, ConditionNode, RuleAction, EvalContext } from "./types"

export interface RunResult {
  blocked: boolean
  blockMessage?: string
  addTags: string[]
  removeTags: string[]
  firedIds: string[]
}

export async function runAutomations(
  prisma: PrismaClient,
  userId: string,
  trigger: Trigger,
  ctxFn: () => Promise<EvalContext> | EvalContext,
): Promise<RunResult> {
  const res: RunResult = { blocked: false, addTags: [], removeTags: [], firedIds: [] }

  const autos = await prisma.automation.findMany({
    where:   { userId, trigger, enabled: true },
    orderBy: { priority: "desc" },
  })
  if (autos.length === 0) return res

  const ctx = await ctxFn()

  for (const a of autos) {
    let matched = false
    try { matched = evaluate(a.conditions as unknown as ConditionNode, ctx) } catch { matched = false }
    if (!matched) continue
    res.firedIds.push(a.id)

    for (const action of ((a.actions as unknown as RuleAction[]) ?? [])) {
      try {
        const r = await runAction(action, ctx, { prisma, userId, automationName: a.name })
        if (r.block) { res.blocked = true; res.blockMessage = r.blockMessage }
        if (r.addTags?.length) res.addTags.push(...r.addTags)
        if (r.removeTags?.length) res.removeTags.push(...r.removeTags)
      } catch (err) {
        // Best-effort: one failing action never breaks the trade write or other actions.
        console.warn(`[rules] action ${action.type} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  if (res.firedIds.length) {
    await prisma.automation
      .updateMany({ where: { id: { in: res.firedIds }, userId }, data: { lastFiredAt: new Date() } })
      .catch(() => { /* observability only */ })
  }
  return res
}

// ─────────────────────────────────────────────────────────────────────────────
// G2 cutover (C6): the same runner over the UNIFIED `rules` model. Identical
// semantics to runAutomations — reads executable rules (those with a trigger;
// descriptive rules have trigger=null and are excluded by the trigger filter).
// Selected at the call site by the RULES_SOURCE flag; default stays on automations
// until the cutover is flipped (FREEZE-P9, gate G2).
// ─────────────────────────────────────────────────────────────────────────────
export async function runRules(
  prisma: PrismaClient,
  userId: string,
  trigger: Trigger,
  ctxFn: () => Promise<EvalContext> | EvalContext,
): Promise<RunResult> {
  const res: RunResult = { blocked: false, addTags: [], removeTags: [], firedIds: [] }

  const rules = await prisma.rule.findMany({
    where:   { userId, trigger, enabled: true },
    orderBy: { priority: "desc" },
  })
  if (rules.length === 0) return res

  const ctx = await ctxFn()

  for (const r of rules) {
    let matched = false
    try { matched = evaluate(r.conditions as unknown as ConditionNode, ctx) } catch { matched = false }
    if (!matched) continue
    res.firedIds.push(r.id)

    for (const action of ((r.actions as unknown as RuleAction[]) ?? [])) {
      try {
        const out = await runAction(action, ctx, { prisma, userId, automationName: r.name })
        if (out.block) { res.blocked = true; res.blockMessage = out.blockMessage }
        if (out.addTags?.length) res.addTags.push(...out.addTags)
        if (out.removeTags?.length) res.removeTags.push(...out.removeTags)
      } catch (err) {
        console.warn(`[rules] action ${action.type} failed:`, err instanceof Error ? err.message : err)
      }
    }
  }

  if (res.firedIds.length) {
    await prisma.rule
      .updateMany({ where: { id: { in: res.firedIds }, userId }, data: { lastFiredAt: new Date() } })
      .catch(() => { /* observability only */ })
  }
  return res
}

/** Whether the unified `rules` model is the live enforcement source. Default: no. */
export function rulesSourceIsUnified(): boolean {
  return process.env.RULES_SOURCE === "rules"
}

/**
 * Engine entrypoint used by callers. Routes to the unified `rules` model when the
 * RULES_SOURCE flag is flipped, else keeps enforcing off `automations` (no change).
 */
export function runRuleEngine(
  prisma: PrismaClient,
  userId: string,
  trigger: Trigger,
  ctxFn: () => Promise<EvalContext> | EvalContext,
): Promise<RunResult> {
  return rulesSourceIsUnified()
    ? runRules(prisma, userId, trigger, ctxFn)
    : runAutomations(prisma, userId, trigger, ctxFn)
}

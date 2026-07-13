// Rules runner (post-G2). Loads enabled executable rules for a trigger from the
// unified `rules` model, evaluates each condition tree against the context, and
// runs matching actions. Context is built lazily (only when rules exist) so
// triggers stay cheap when the user has no rules. Descriptive rules have
// trigger=null and are excluded by the trigger filter.

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
        // Best-effort: one failing action never breaks the trade write or other actions.
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

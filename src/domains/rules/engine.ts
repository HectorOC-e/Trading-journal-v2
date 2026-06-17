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

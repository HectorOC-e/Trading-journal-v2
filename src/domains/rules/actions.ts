// Action registry (THEN). Extensible: add a handler here + a type in types.ts.
// Side-effect actions (notify/reminder/critical) emit via the notifications system;
// tag actions return mutations the caller applies; BLOCK returns a block signal.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { emitNotification } from "@/server/services/notifications/emit"
import type { RuleAction, RuleActionType, EvalContext } from "./types"

export interface ActionResult {
  block?: boolean
  blockMessage?: string
  addTags?: string[]
  removeTags?: string[]
}
export interface ActionDeps { prisma: PrismaClient; userId: string; automationName: string }
type Handler = (action: RuleAction, ctx: EvalContext, deps: ActionDeps) => Promise<ActionResult>

const str = (v: unknown, d = "") => (typeof v === "string" && v.trim() ? v : d)

const HANDLERS: Record<RuleActionType, Handler> = {
  NOTIFY: async (a, _ctx, d) => {
    await emitNotification(d.prisma, d.userId, "RULE_FIRED", { params: { rule: d.automationName, detail: str(a.params?.message) } })
    return {}
  },
  CRITICAL_ALERT: async (a, _ctx, d) => {
    await emitNotification(d.prisma, d.userId, "RULE_CRITICAL", { params: { rule: d.automationName, detail: str(a.params?.message) } })
    return {}
  },
  CREATE_REMINDER: async (a, _ctx, d) => {
    await emitNotification(d.prisma, d.userId, "RULE_REMINDER", { params: { rule: d.automationName, detail: str(a.params?.message) } })
    return {}
  },
  ADD_TAG:    async (a) => ({ addTags: [str(a.params?.tag)].filter(Boolean) }),
  REMOVE_TAG: async (a) => ({ removeTags: [str(a.params?.tag)].filter(Boolean) }),
  BLOCK:      async (a) => ({ block: true, blockMessage: str(a.params?.message, "Operación bloqueada por una regla") }),
}

export const ACTION_TYPES = Object.keys(HANDLERS) as RuleActionType[]

export async function runAction(action: RuleAction, ctx: EvalContext, deps: ActionDeps): Promise<ActionResult> {
  const h = HANDLERS[action.type]
  return h ? h(action, ctx, deps) : {}
}

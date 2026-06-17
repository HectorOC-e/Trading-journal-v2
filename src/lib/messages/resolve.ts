// Resolve a catalog code + params + language into a concrete message.
// Interpolates {param} tokens; falls back en→es; defaults category to "Sistema".

import { MESSAGES, LABELS, type MessageCode } from "./catalog"
import type { Lang, ResolvedMessage, ResolvedAction, MessageText, MessageDef } from "./types"

const TOKEN = /\{(\w+)\}/g

function interpolate(text: string, params: Record<string, unknown>): string {
  return text.replace(TOKEN, (_m, key: string) =>
    params[key] != null ? String(params[key]) : "",
  )
}

function pickText(def: MessageDef, lang: Lang): MessageText {
  if (lang === "en" && def.en) return def.en
  return def.es
}

function resolveLabel(labelCode: string, lang: Lang): string {
  const l = LABELS[labelCode]
  if (!l) return labelCode
  return lang === "en" && l.en ? l.en : l.es
}

export function resolveMessage(
  code: MessageCode,
  params: Record<string, unknown> = {},
  lang: Lang = "es",
): ResolvedMessage {
  const def = MESSAGES[code] as MessageDef
  const text = pickText(def, lang)
  const actions: ResolvedAction[] = (def.actions ?? []).map((a) => ({
    label: resolveLabel(a.labelCode, lang),
    href: a.href,
    actionCode: a.actionCode,
    style: a.style ?? "ghost",
  }))
  return {
    code,
    type: def.type,
    priority: def.priority,
    category: def.category ?? "Sistema",
    persist: def.persist,
    title: interpolate(text.title, params),
    body: interpolate(text.body ?? "", params),
    actions,
  }
}

/** True when a string is a known catalog code. */
export function isMessageCode(value: unknown): value is MessageCode {
  return typeof value === "string" && value in MESSAGES
}

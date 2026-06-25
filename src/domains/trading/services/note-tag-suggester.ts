// ─────────────────────────────────────────────────────────────────────────────
// Note auto-tagging (#37) — deterministic, suggestion-only.
//
// Scales qualitative capture without forcing it: scans a trade note for known
// behavioural cues and SUGGESTS tags the trader confirms with one tap. Determinism
// first (FREEZE-P2): this is a keyword matcher, not an LLM. An LLM enrichment layer
// can be added later on top, but the testable core stays rule-based.
//
// Suggestions only — nothing is applied automatically. Capped at 3 to avoid noise.
// ─────────────────────────────────────────────────────────────────────────────

interface TagRule {
  tag: string
  pattern: RegExp
}

// Order = priority. Tags align with the app's behavioural vocabulary.
const RULES: TagRule[] = [
  { tag: "FOMO", pattern: /\bfomo\b|me lo perd|perd[ée]rmelo|entr[ée] tarde|miedo a perder|chas(e|ing)/i },
  { tag: "Revancha", pattern: /reveng|revanch|recuperar lo perdido|me la devuelv|recuperar(me)?\b/i },
  { tag: "Duda", pattern: /\bdud[ééaoé]|dud[ée]|no estaba segur|insegur|no ten[ií]a clar/i },
  { tag: "Off-plan", pattern: /fuera de plan|sin plan|no respet[ée]|me salt[ée] el plan|off.?plan|sin confirmaci[oó]n/i },
  { tag: "Codicia", pattern: /codicia|avaric|greed/i },
]

export function suggestTagsFromNote(note: string): string[] {
  const text = note.trim()
  if (!text) return []
  const out: string[] = []
  for (const rule of RULES) {
    if (out.length >= 3) break
    if (rule.pattern.test(text) && !out.includes(rule.tag)) out.push(rule.tag)
  }
  return out
}

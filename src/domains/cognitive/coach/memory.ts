// ─────────────────────────────────────────────────────────────────────────────
// Coach memory — the anti-poisoning frontier + context assembler (S6).
//
// FREEZE-D9 / P6 / ADR-003 (irreversible): the LLM PROPOSES, data/user CONFIRM.
// `proposeMemory` can only ever produce a `candidate` written by `llm`; only
// `confirmed` memory is INJECTED into the prompt (`isInjectable`). A flat
// LLM-editable memory is forbidden — this module is the gate that enforces it.
//
// FREEZE-D10: the Context Assembler is budget-bounded — Identity + active
// Commitments are always kept; confirmed facts fill the remaining budget; the
// previous-thread summary is last. Pure, no I/O — fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryKind = "fact" | "preference" | "identity"
export type MemoryStatus = "candidate" | "confirmed" | "refuted"

/** Only confirmed memory is trusted enough to inject into the prompt. */
export const INJECTABLE_STATUS: MemoryStatus = "confirmed"

export function isInjectable(m: { status: string }): boolean {
  return m.status === INJECTABLE_STATUS
}

export interface ProposedMemory {
  kind: MemoryKind
  content: string
  status: "candidate"
  source: "llm"
  sourceThreadId?: string
}

/**
 * Build a memory the LLM proposes. By construction it is a `candidate` written by
 * `llm` — the LLM can NEVER mint confirmed memory (D9). Persisting confirmed memory
 * is a separate, user/deterministic action.
 */
export function proposeMemory(kind: MemoryKind, content: string, sourceThreadId?: string): ProposedMemory {
  return { kind, content: content.trim(), status: "candidate", source: "llm", sourceThreadId }
}

export interface MemoryExtraction {
  summary: string | null
  facts: { kind: MemoryKind; content: string }[]
}

/**
 * Parse the LLM's thread-extraction response into a summary + candidate facts.
 * Tolerant: finds the first JSON object, ignores garbage, caps at 5 facts. The
 * facts are CANDIDATES (the caller persists them via proposeMemory — D9).
 */
export function parseMemoryExtraction(raw: string): MemoryExtraction {
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return { summary: null, facts: [] }
    const o = JSON.parse(m[0]) as { summary?: unknown; facts?: unknown }
    const summary = typeof o.summary === "string" && o.summary.trim() ? o.summary.trim() : null
    const facts = Array.isArray(o.facts)
      ? o.facts
          .filter((f): f is { kind?: unknown; content: string } => !!f && typeof (f as { content?: unknown }).content === "string" && !!(f as { content: string }).content.trim())
          .slice(0, 5)
          .map((f) => ({
            kind: ((f.kind === "preference" || f.kind === "identity") ? f.kind : "fact") as MemoryKind,
            content: String(f.content).trim().slice(0, 300),
          }))
      : []
    return { summary, facts }
  } catch {
    return { summary: null, facts: [] }
  }
}

export interface AssembleInput {
  identity?: string | null
  /** Improvement memory (E16) — the North Star narrative ("better than N days ago"). */
  improvement?: string | null
  confirmedMemories: { kind: string; content: string }[]
  commitments: { text: string; status: string }[]
  /** Episodic memory (E13) — salient recalled moments, evidence the coach can cite. */
  episodes?: { content: string }[]
  lastSummary?: string | null
}

const DEFAULT_BUDGET = 1500

/**
 * Assemble the dynamic MEMORY block injected into the coach prompt. Returns "" when
 * there is nothing to say. Identity + active commitments are always kept; confirmed
 * facts fill the remaining budget (overflow noted as "(+N más)"); the previous
 * summary is included only if it still fits.
 */
export function assembleContextBlock(input: AssembleInput, opts: { maxChars?: number } = {}): string {
  const budget = opts.maxChars ?? DEFAULT_BUDGET
  const parts: string[] = []

  if (input.identity && input.identity.trim()) {
    parts.push(`Identidad del trader: ${input.identity.trim()}`)
  }

  if (input.improvement && input.improvement.trim()) {
    parts.push(`Progreso: ${input.improvement.trim()}`)
  }

  if (input.commitments.length > 0) {
    const lines = input.commitments.map((c) => `  - "${c.text}" (${c.status})`)
    parts.push(`Compromisos activos:\n${lines.join("\n")}`)
  }

  // Confirmed facts fill whatever budget remains after identity + commitments.
  if (input.confirmedMemories.length > 0) {
    const used = parts.join("\n\n").length
    const remaining = Math.max(0, budget - used)
    const kept: string[] = []
    let acc = 0
    let dropped = 0
    for (const m of input.confirmedMemories) {
      const line = `  - ${m.content}`
      if (acc + line.length <= remaining || kept.length === 0) {
        kept.push(line)
        acc += line.length + 1
      } else {
        dropped++
      }
    }
    let block = `Hechos confirmados:\n${kept.join("\n")}`
    if (dropped > 0) block += `\n  (+${dropped} más)`
    parts.push(block)
  }

  // Episodic memory (E13) — salient recalled moments, within the remaining budget.
  if (input.episodes && input.episodes.length > 0) {
    const used = parts.join("\n\n").length
    const remaining = Math.max(0, budget - used)
    const kept: string[] = []
    let acc = 0
    for (const e of input.episodes) {
      const line = `  - ${e.content}`
      if (acc + line.length <= remaining) { kept.push(line); acc += line.length + 1 }
    }
    if (kept.length > 0) parts.push(`Momentos recordados:\n${kept.join("\n")}`)
  }

  if (input.lastSummary && input.lastSummary.trim()) {
    const candidate = `Resumen de la conversación previa: ${input.lastSummary.trim()}`
    if (parts.join("\n\n").length + candidate.length <= budget) parts.push(candidate)
  }

  if (parts.length === 0) return ""
  return `## MEMORIA DEL COACH\n${parts.join("\n\n")}`
}

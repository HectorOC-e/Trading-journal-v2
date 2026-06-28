// ─────────────────────────────────────────────────────────────────────────────
// Cognitive digest (C4 / #28, v3.2). Composes a short weekly summary of the trader's
// cognitive state — improvement delta, commitments kept/broken, the pattern to
// watch — into one notification body. Empty weeks produce no content (don't nag).
// Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface DigestInput {
  improvementDelta: number | null
  topPattern: string | null
  kept: number
  broken: number
}

export interface DigestResult {
  hasContent: boolean
  summary: string
}

export function buildCognitiveDigest(input: DigestInput): DigestResult {
  const parts: string[] = []

  if (input.improvementDelta != null && Math.round(input.improvementDelta) !== 0) {
    const d = Math.round(input.improvementDelta)
    parts.push(d > 0
      ? `Tu índice de mejora subió ${d} ${d === 1 ? "punto" : "puntos"} esta semana.`
      : `Tu índice de mejora bajó ${Math.abs(d)} ${Math.abs(d) === 1 ? "punto" : "puntos"} esta semana.`)
  }

  if (input.kept > 0 || input.broken > 0) {
    const k = `${input.kept} ${input.kept === 1 ? "compromiso cumplido" : "compromisos cumplidos"}`
    const b = `${input.broken} ${input.broken === 1 ? "roto" : "rotos"}`
    parts.push(`${k} y ${b}.`)
  }

  if (input.topPattern) {
    parts.push(`Patrón a vigilar: ${input.topPattern}.`)
  }

  return { hasContent: parts.length > 0, summary: parts.join(" ") }
}

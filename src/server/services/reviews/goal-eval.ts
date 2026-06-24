// Hybrid goal evaluation: auto-score the MEASURABLE monthly goals from the month's data;
// leave the rest for the user. Pure + deterministic. The caller must skip goals the user
// already confirmed (we never overwrite a userConfirmed goal). Non-measurable goals return
// null → the caller leaves them untouched.

export type GoalStatus = "pending" | "partial" | "done"

export interface GoalContext {
  violations: number
  trades: number
  netPnl: number
  winRate: number
  /** Minutes studied in the month, when available (learning). */
  studyMinutes?: number
}

export interface GoalProposal { status: GoalStatus; note: string }

/**
 * Propose a status + note for a goal from its text, or null when it isn't auto-measurable.
 * Conservative on purpose — only fires for goals we can actually verify from data.
 */
export function evaluateGoal(text: string, ctx: GoalContext): GoalProposal | null {
  const t = text.toLowerCase()

  // Revenge / impulsive / discipline goals → judged by rule violations.
  if (/\b(revenge|reveng|venganza|impuls|disciplin|sin violac|respetar (el )?stop|stop[- ]?loss)\b/.test(t)) {
    if (ctx.violations === 0) return { status: "done", note: "Sin violaciones registradas." }
    if (ctx.violations <= 2)  return { status: "partial", note: `${ctx.violations} violación${ctx.violations > 1 ? "es" : ""} (cerca).` }
    return { status: "pending", note: `${ctx.violations} violaciones — aún por corregir.` }
  }

  // Study goals like "estudiar 20 min" → judged by study minutes when known.
  const studyMatch = /(estudi|aprend|repas).*?(\d{1,3})\s*min/.exec(t)
  if (studyMatch && ctx.studyMinutes != null) {
    const targetPerDay = Number(studyMatch[2])
    const target = targetPerDay * 20 // ~trading days/month
    if (ctx.studyMinutes >= target)       return { status: "done", note: `${ctx.studyMinutes} min estudiados.` }
    if (ctx.studyMinutes >= target * 0.5) return { status: "partial", note: `${ctx.studyMinutes} min (meta ~${target}).` }
    return { status: "pending", note: `${ctx.studyMinutes} min estudiados.` }
  }

  return null // not auto-measurable — leave to the user
}

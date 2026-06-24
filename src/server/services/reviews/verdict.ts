// Shared "verdict" derivation for review periods. Pure + isomorphic (safe on the
// client card and the server email/finalize paths). Turns a period's numbers and
// AI analysis into: a letter grade, a one-line verdict, and ✓worked / ✗toImprove
// chip lists. The AI analysis is the preferred source for the verdict line; we fall
// back to a deterministic metric sentence so cards/email are never blank.

export type VerdictTone = "good" | "mid" | "bad"

export interface GradeInput {
  disciplineScore: number | null
  winRate: number
  netPnl: number
  profitFactor: number
  trades: number
}

/** Composite 0–100 → letter grade. Anchored on discipline, nudged by performance. */
export function deriveGrade(i: GradeInput): { letter: string; tone: VerdictTone } {
  if (i.trades === 0) return { letter: "—", tone: "mid" }
  let s = i.disciplineScore ?? 60
  s += i.netPnl > 0 ? 8 : i.netPnl < 0 ? -8 : 0
  s += i.winRate >= 55 ? 4 : i.winRate < 40 ? -4 : 0
  s += i.profitFactor >= 1.5 ? 4 : i.profitFactor < 1 ? -4 : 0
  s = Math.max(0, Math.min(100, s))

  const letter =
    s >= 90 ? "A+" : s >= 85 ? "A" : s >= 80 ? "A−" :
    s >= 75 ? "B+" : s >= 70 ? "B" : s >= 65 ? "B−" :
    s >= 60 ? "C+" : s >= 55 ? "C" : s >= 50 ? "C−" :
    s >= 40 ? "D" : "F"
  const tone: VerdictTone = s >= 70 ? "good" : s >= 55 ? "mid" : "bad"
  return { letter, tone }
}

/** Strip light markdown (bullets, emphasis, callouts) + LaTeX from a single line. */
function stripMd(line: string): string {
  return line
    .replace(/^>\s*\[![^\]]+\]\s*/i, "") // callout marker
    .replace(/^[-•*]\s+/, "")            // bullet
    .replace(/^#{1,6}\s+/, "")           // header
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/`(.+?)`/g, "$1")           // code
    // LaTeX: unwrap only real $…$ math (has a backslash) — never touch currency like $980
    .replace(/\$([^$]+)\$/g, (m, inner) => (/\\/.test(inner) ? inner : m))
    .replace(/\\[()[\]]/g, "")           // \( \) \[ \]
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2") // \frac{a}{b} → a/b
    .replace(/\\times\b/g, "×").replace(/\\cdot\b/g, "·")
    .replace(/\\[a-zA-Z]+/g, "")         // any remaining LaTeX command
    .replace(/\{([^{}]*)\}/g, "$1")      // unwrap leftover braces, keep content
    .replace(/\s{2,}/g, " ")
    .trim()
}

export interface VerdictInput {
  aiAnalysis: string | null
  netPnl: number
  winRate: number
  disciplineScore: number | null
  trades: number
}

/**
 * One-line verdict. Prefers the first substantive sentence of the AI analysis
 * (skipping section headers and standalone callout markers); falls back to a
 * deterministic metric sentence.
 */
export function deriveVerdict(i: VerdictInput): string {
  if (i.aiAnalysis) {
    for (const rawLine of i.aiAnalysis.split("\n")) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith("###") || line.startsWith("#")) continue
      const cleaned = stripMd(line)
      if (cleaned.length < 12) continue // skip stray markers / tiny fragments
      const sentence = cleaned.split(/(?<=[.!?])\s/)[0]
      return sentence.length > 140 ? sentence.slice(0, 137).trimEnd() + "…" : sentence
    }
  }

  if (i.trades === 0) return "Sin trades esta semana."
  const profitable = i.netPnl > 0
  const disc = i.disciplineScore
  const discNote =
    disc != null && disc < 60 ? ", pero la disciplina flojeó" :
    disc != null && disc >= 80 ? " con disciplina sólida" : ""
  const wrNote = i.winRate >= 55 ? "alta efectividad" : i.winRate < 40 ? "baja efectividad" : "efectividad media"
  return profitable
    ? `Semana rentable (${wrNote})${discNote}.`
    : i.netPnl < 0
      ? `Semana en rojo (${wrNote})${discNote}.`
      : `Semana neutra (${wrNote})${discNote}.`
}

/** Split a stored free-text field (one item per line / bullet) into chips. */
export function splitChips(text: string | null | undefined, max = 3): string[] {
  if (!text) return []
  return text
    .split("\n")
    .map(stripMd)
    .filter(Boolean)
    .slice(0, max)
}

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString()}`

export interface MetricChipInput {
  netPnl: number
  winRate: number
  profitFactor: number
  disciplineScore: number | null
  trades: number
}

/**
 * Lightweight chip fallback from just the headline metrics (no report needed) —
 * used by the list card / email when the row has no stored worked/toImprove text.
 */
export function metricChips(m: MetricChipInput): { worked: string[]; toImprove: string[] } {
  const worked: string[] = []
  const toImprove: string[] = []
  if (m.trades === 0) return { worked, toImprove }

  if (m.netPnl > 0) worked.push(`P&L ${money(m.netPnl)}`)
  if (m.winRate >= 55) worked.push(`Win rate ${Math.round(m.winRate)}%`)
  if (m.profitFactor >= 1.5) worked.push(`Profit factor ${m.profitFactor}`)
  if (m.disciplineScore != null && m.disciplineScore >= 80) worked.push(`Disciplina ${m.disciplineScore}`)

  if (m.netPnl < 0) toImprove.push(`P&L ${money(m.netPnl)}`)
  if (m.winRate < 45) toImprove.push(`Win rate ${Math.round(m.winRate)}%`)
  if (m.profitFactor < 1 && m.profitFactor > 0) toImprove.push(`Profit factor ${m.profitFactor}`)
  if (m.disciplineScore != null && m.disciplineScore < 60) toImprove.push(`Disciplina ${m.disciplineScore}`)

  return { worked: worked.slice(0, 3), toImprove: toImprove.slice(0, 3) }
}

/** Minimal structural shape shared by the weekly & monthly reports. */
export interface ChipReport {
  kpis: { winRate: number; trades: number; profitFactor: number }
  setups: { name: string; pnl: number }[]
  discipline: { violations: number; costo: number }
  bestDay: { pnl: number } | null
}

/**
 * Deterministic ✓worked / ✗toImprove chips derived from a computed report (weekly or
 * monthly). Used at auto-finalization and in the email to populate concrete chips when
 * the user/AI left them empty, so cards and email always have something to show.
 */
export function deriveChipsFromReport(report: ChipReport): { worked: string[]; toImprove: string[] } {
  const worked: string[] = []
  const toImprove: string[] = []

  const byPnl = [...report.setups].sort((a, b) => b.pnl - a.pnl)
  const best = byPnl[0]
  const worst = byPnl[byPnl.length - 1]
  if (best && best.pnl > 0) worked.push(`${best.name} ${money(best.pnl)}`)
  if (report.kpis.winRate >= 55) worked.push(`Win rate ${Math.round(report.kpis.winRate)}%`)
  if (report.discipline.violations === 0 && report.kpis.trades > 0) worked.push("Sin violaciones de riesgo")
  if (report.bestDay) worked.push(`Mejor día ${money(report.bestDay.pnl)}`)

  if (worst && worst.pnl < 0 && worst !== best) toImprove.push(`${worst.name} ${money(worst.pnl)}`)
  if (report.discipline.violations > 0) toImprove.push(`${report.discipline.violations} violación${report.discipline.violations > 1 ? "es" : ""} · ${money(report.discipline.costo)}`)
  if (report.kpis.winRate < 40 && report.kpis.trades > 0) toImprove.push(`Win rate bajo ${Math.round(report.kpis.winRate)}%`)
  if (report.kpis.profitFactor < 1 && report.kpis.trades > 0) toImprove.push(`Profit factor ${report.kpis.profitFactor}`)

  return { worked: worked.slice(0, 3), toImprove: toImprove.slice(0, 3) }
}

// Monthly "Carta del Gestor" content derivation. Pure. The editorial headline is a
// deterministic metric line; the structured themes are derived from the month's report;
// the prose body reuses the existing AI analysis (rendered as markdown by the page), and
// the one-line causal verdict reuses the shared verdict helper. Nothing renders blank.

export type ThemeSentiment = "up" | "down" | "warn"
export interface MonthlyTheme { title: string; sentiment: ThemeSentiment; impact: string }

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`

/** Editorial one-line headline for the month (metric-based, distinct from the verdict). */
export function deriveLetterTitle(
  monthLabel: string,
  k: { netPnl: number; winRate: number; disciplineScore: number | null; trades: number },
): string {
  if (k.trades === 0) return `${monthLabel}: sin operaciones`
  const result = k.netPnl > 0 ? "mes rentable" : k.netPnl < 0 ? "mes en rojo" : "mes neutro"
  const disc = k.disciplineScore
  const tail = disc == null ? "" : disc >= 80 ? " con disciplina sólida" : disc < 60 ? ", pero la disciplina flojeó" : ""
  return `${monthLabel}: ${result}${tail}`
}

interface ThemeReport {
  kpis: { winRate: number; profitFactor: number; trades: number }
  deltas: { winRate: number }
  setups: { name: string; pnl: number; trades: number }[]
  discipline: { violations: number; costo: number }
}

/** Structured key themes (title + sentiment + impact line) derived from the report. */
export function deriveStructuredThemes(r: ThemeReport): MonthlyTheme[] {
  if (r.kpis.trades === 0) return []
  const themes: MonthlyTheme[] = []
  const byPnl = [...r.setups].sort((a, b) => b.pnl - a.pnl)
  const best = byPnl[0]
  const worst = byPnl[byPnl.length - 1]

  if (best && best.pnl > 0) themes.push({ title: `${best.name} fue tu motor`, sentiment: "up", impact: `${money(best.pnl)} en ${best.trades} operaciones.` })
  if (r.kpis.profitFactor >= 2) themes.push({ title: "Calidad sobre cantidad", sentiment: "up", impact: `Profit factor ${r.kpis.profitFactor}.` })
  if (r.deltas.winRate >= 5) themes.push({ title: "Mejor efectividad", sentiment: "up", impact: `Win rate +${r.deltas.winRate}pp vs. el mes anterior.` })
  else if (r.deltas.winRate <= -5) themes.push({ title: "Efectividad a la baja", sentiment: "warn", impact: `Win rate ${r.deltas.winRate}pp vs. el mes anterior.` })

  if (r.discipline.violations > 0) themes.push({ title: "Operativa impulsiva", sentiment: "down", impact: `${r.discipline.violations} violación${r.discipline.violations > 1 ? "es" : ""} · ${money(r.discipline.costo)}.` })
  if (worst && worst.pnl < 0 && worst !== best) themes.push({ title: `${worst.name} drenó capital`, sentiment: "down", impact: `${money(worst.pnl)}.` })

  return themes.slice(0, 4)
}

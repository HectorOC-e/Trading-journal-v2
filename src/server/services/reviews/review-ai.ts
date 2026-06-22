// AI analysis for review reports. Pure prompt builder (testable) + a thin runner
// that streams the user's configured provider. Shared by the generateAnalysis
// mutations and the cron auto-generate path.

import { streamChat } from "@/lib/ai/chat"
import type { usableCandidates } from "@/lib/ai/resolve-provider"
import type { WeeklyReport } from "@/domains/analytics/services/weekly-report"
import type { MonthlyReport } from "@/domains/analytics/services/monthly-report"

type Candidate = ReturnType<typeof usableCandidates>[number]
type AnyReport = WeeklyReport | MonthlyReport

const fmt = (n: number) => n.toFixed(2)

/** Build the analysis prompt from the computed report model. Pure. */
export function buildAnalysisPrompt(periodLabel: string, kind: "weekly" | "monthly", r: AnyReport): string {
  const setups = r.setups.slice(0, 6).map(s => `  • ${s.name}: $${fmt(s.pnl)} (${s.trades} trades)`).join("\n") || "  (sin setups)"
  const sessions = r.sessions.map(s => `  • ${s.session}: $${fmt(s.pnl)} (${s.trades} trades)`).join("\n") || "  (sin datos)"
  const dscore = r.kpis.disciplineScore ?? "n/d"
  const periodWord = kind === "weekly" ? "la semana" : "el mes"

  return `Eres un coach de trading experto. Analiza el desempeño de ${periodWord} (${periodLabel}) y entrega un análisis accionable.

Métricas:
- Net P&L: $${fmt(r.kpis.netPnl)} (Δ vs periodo previo: ${r.deltas.netPnl >= 0 ? "+" : ""}${fmt(r.deltas.netPnl)})
- Win rate: ${r.kpis.winRate}% (Δ ${r.deltas.winRate >= 0 ? "+" : ""}${r.deltas.winRate}pp)
- Profit factor: ${r.kpis.profitFactor}
- Trades: ${r.kpis.trades}
- Disciplina: ${dscore} | Violaciones: ${r.discipline.violations} | Costo de violaciones: $${fmt(r.discipline.costo)}

P&L por setup:
${setups}

P&L por sesión:
${sessions}

Responde en español, en markdown breve, con EXACTAMENTE estas tres secciones y esos encabezados:
### Hallazgos clave
### Banderas de riesgo
### Foco para el próximo periodo
Cada sección con 2-4 viñetas concisas, específicas a los números anteriores. No inventes datos que no estén arriba.`
}

/** Stream the analysis from the first usable provider candidate. Throws on failure. */
export async function runReviewAnalysis(candidates: Candidate[], prompt: string): Promise<string> {
  let stream: ReadableStream<Uint8Array> | null = null
  let streamErr: unknown
  for (const c of candidates) {
    try {
      stream = await streamChat({ provider: c.provider, apiKey: c.apiKey, model: c.model, messages: [{ role: "user", content: prompt }] })
      break
    } catch (e) {
      streamErr = e
    }
  }
  if (!stream) throw streamErr ?? new Error("AI stream failed")

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let raw = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    raw += decoder.decode(value, { stream: true })
  }
  return raw.trim()
}

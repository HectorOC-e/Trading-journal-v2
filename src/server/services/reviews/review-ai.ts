// AI analysis for review reports. Pure prompt builder (testable) + a thin runner
// that streams the user's configured provider. Shared by the generateAnalysis
// mutations and the cron auto-generate path.

import { streamChat } from "@/lib/ai/chat"
import type { usableCandidates } from "@/lib/ai/resolve-provider"
import type { WeeklyReport } from "@/domains/analytics/services/weekly-report"
import type { MonthlyReport } from "@/domains/analytics/services/monthly-report"
import type { Insight } from "@/domains/analytics/services/insights-engine"

type Candidate = ReturnType<typeof usableCandidates>[number]
type AnyReport = WeeklyReport | MonthlyReport

const fmt = (n: number) => n.toFixed(2)

/**
 * Build the analysis prompt from the computed report model + the deterministic
 * signals detected by the insights engine. Mirrors the Analytics "Inteligencia
 * IA" voice (WHY + WHAT NEXT, structured with callouts) so the review analysis
 * reads like the analytics one. Pure. Output uses callouts + 3 sections and NO
 * tables (the email/PDF renderers stay faithful that way).
 */
export function buildAnalysisPrompt(periodLabel: string, kind: "weekly" | "monthly", r: AnyReport, insights: Insight[] = []): string {
  const setups = r.setups.slice(0, 6).map(s => `  • ${s.name}: $${fmt(s.pnl)} (${s.trades} trades)`).join("\n") || "  (sin setups)"
  const sessions = r.sessions.map(s => `  • ${s.session}: $${fmt(s.pnl)} (${s.trades} trades)`).join("\n") || "  (sin datos)"
  const dscore = r.kpis.disciplineScore ?? "n/d"
  const periodWord = kind === "weekly" ? "la semana" : "el mes"

  const signals = insights.length
    ? "\n\n=== SEÑALES DETECTADAS (motor determinista) ===\n" +
      insights.map(i => `- [${i.severity}/${i.category}] ${i.title} — ${i.detail}${i.recommendation ? ` → ${i.recommendation}` : ""}`).join("\n")
    : "\n\n(El motor determinista no detectó señales fuertes; analiza el contexto general.)"

  return `Eres el motor de inteligencia de un trading journal profesional. Tu trabajo NO es repetir las métricas (la plataforma ya las muestra), sino explicar POR QUÉ ocurrió el desempeño de ${periodWord} (${periodLabel}) y QUÉ debe hacer el trader después. Usa SOLO los datos de abajo; no inventes nada.

=== CONTEXTO DEL PERIODO (datos reales) ===
- Net P&L: $${fmt(r.kpis.netPnl)} (Δ vs periodo previo: ${r.deltas.netPnl >= 0 ? "+" : ""}${fmt(r.deltas.netPnl)})
- Win rate: ${r.kpis.winRate}% (Δ ${r.deltas.winRate >= 0 ? "+" : ""}${r.deltas.winRate}pp)
- Profit factor: ${r.kpis.profitFactor}
- Trades: ${r.kpis.trades}
- Disciplina: ${dscore}/100 | Violaciones: ${r.discipline.violations} | Costo de violaciones: $${fmt(r.discipline.costo)}

P&L por setup:
${setups}

P&L por sesión:
${sessions}${signals}

Responde en español, markdown compacto, en TRES secciones con estos encabezados exactos:
### Qué está pasando
### Por qué ocurre
### Qué hacer

Reglas de formato:
- Usa 2-4 viñetas por sección, concretas y con números del contexto.
- Resalta lo importante con bloques de callout cuando aporten. Cada callout va en SU PROPIA LÍNEA, empezando con "> [!TIPO]" (nunca a media viñeta ni a media frase):
  > [!INSIGHT] hallazgo clave
  > [!WARNING] riesgo a vigilar
  > [!RECOMMENDATION] acción priorizada y concreta
- En "Qué hacer", al menos una recomendación debe ir como una línea > [!RECOMMENDATION].
- NO uses tablas ni la etiqueta <br>. Importes de dinero como texto normal ($100).
- NO uses LaTeX ni notación matemática (nada de $...$, \\frac, \\times, etc.). Escribe fórmulas y divisiones en texto plano (p. ej. "ganancias/pérdidas", "2.1x").`
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

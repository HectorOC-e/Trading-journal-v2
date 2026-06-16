import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generatePsychologyInsights } from "@/domains/analytics/services/psychology-insights"
import { streamChat } from "./chat"
import { resolveAiCall, usableCandidates, NoApiKeyError } from "./resolve-provider"

export interface PsychologyAiOptions {
  userId: string
  prisma: PrismaClient
  period?: "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"
}

function windowFor(period: PsychologyAiOptions["period"]): { from: Date; to: Date } | undefined {
  if (!period || period === "ALL") return undefined
  const to = new Date(), from = new Date()
  if (period === "7d") from.setDate(to.getDate() - 7)
  else if (period === "1M") from.setMonth(to.getMonth() - 1)
  else if (period === "3M") from.setMonth(to.getMonth() - 3)
  else if (period === "6M") from.setMonth(to.getMonth() - 6)
  else if (period === "1Y") from.setFullYear(to.getFullYear() - 1)
  return { from, to }
}

const SYSTEM = `Eres un experto en psicología del trading analizando a un trader con sus datos reales.
Tu objetivo: detectar patrones psicológicos, sesgos cognitivos, riesgos conductuales, hábitos positivos y negativos, y dar acciones concretas.
Usa SOLO los datos del contexto. Responde en español, en markdown, usando bloques de callout cuando aporten:
> [!INSIGHT] para hallazgos
> [!WARNING] para riesgos conductuales
> [!RECOMMENDATION] para acciones concretas
Estructura: 1) Patrones detectados, 2) Sesgos/riesgos, 3) Hábitos (positivos y negativos), 4) Plan de acción priorizado.
Formato: para saltos de línea usa líneas o listas reales, NUNCA la etiqueta <br> (ni dentro de celdas de tabla: usa una lista o separa con "·"). Para fórmulas usa LaTeX ($...$ / $$...$$), nunca símbolos sueltos; los importes de dinero ($100) déjalos como texto normal.
No inventes datos. Sé directo y empático, como un coach experto.`

export async function streamPsychologyInsights(opts: PsychologyAiOptions): Promise<ReadableStream<Uint8Array>> {
  const bundle = await buildAnalyticsBundle(opts.userId, opts.prisma, windowFor(opts.period))
  const insights = generatePsychologyInsights(bundle.raw.trades)
  const ps = bundle.psychology

  const resolved = await resolveAiCall(opts.prisma, opts.userId, "psychology_analysis")
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) throw new NoApiKeyError(resolved.primary.provider)

  const ctx = [
    "=== CONTEXTO PSICOLÓGICO (datos reales) ===",
    `Disciplina: ${ps.disciplineScore}/100 · violaciones ${ps.violationRate}% · FOMO ${ps.fomoCount} · revancha ${ps.revengeCount}`,
    `P&L por emoción: ${ps.byEmotion.map(e => `${e.emotion}(${e.trades}t, avgPnl ${e.avgPnl}, WR ${e.winRate}%)`).join("; ")}`,
    `Performance global: ${bundle.performance.totalTrades} trades, WR ${bundle.performance.winRate}%, expectancy ${bundle.performance.expectancy}`,
    insights.length
      ? "\n=== SEÑALES DETECTADAS ===\n" + insights.map(i => `- [${i.severity}] ${i.title} — ${i.detail}${i.recommendation ? ` → ${i.recommendation}` : ""}`).join("\n")
      : "\n(El motor determinista no detectó señales fuertes; analiza el contexto general.)",
    "\nGenera el análisis psicológico de este trader.",
  ].join("\n")

  let lastErr: unknown
  for (const c of candidates) {
    try {
      return await streamChat({ provider: c.provider, apiKey: c.apiKey, model: c.model, system: SYSTEM, messages: [{ role: "user", content: ctx }], maxTokens: 4096 })
    } catch (err) { lastErr = err }
  }
  throw lastErr
}

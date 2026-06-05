import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generateInsights } from "@/domains/analytics/services/insights-engine"
import { streamChat } from "./chat"
import { resolveAiCall, usableCandidates, NoApiKeyError } from "./resolve-provider"

export interface AnalyticsAiOptions {
  userId: string
  prisma: PrismaClient
  period?: "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"
}

function windowFor(period: AnalyticsAiOptions["period"]): { from: Date; to: Date } | undefined {
  if (!period || period === "ALL") return undefined
  const to = new Date(), from = new Date()
  if (period === "7d") from.setDate(to.getDate() - 7)
  else if (period === "1M") from.setMonth(to.getMonth() - 1)
  else if (period === "3M") from.setMonth(to.getMonth() - 3)
  else if (period === "6M") from.setMonth(to.getMonth() - 6)
  else if (period === "1Y") from.setFullYear(to.getFullYear() - 1)
  return { from, to }
}

function buildContext(bundle: Awaited<ReturnType<typeof buildAnalyticsBundle>>): string {
  const p = bundle.performance
  const topSetup = bundle.setups[0]
  const topMarket = bundle.markets[0]
  const lines: string[] = []
  lines.push("=== CONTEXTO ANALYTICS DEL TRADER (datos reales) ===")
  lines.push(`Performance: ${p.totalTrades} trades · WR ${p.winRate}% · PF ${p.profitFactor ?? "n/a"} · Expectancy ${p.expectancy} · avgR ${p.avgR} · Net P&L ${p.netPnl}`)
  lines.push(`Riesgo: peor drawdown ${bundle.risk.worstDrawdownPct}% · cuentas: ${bundle.risk.accounts.map(a => `${a.name}(${a.netPnl >= 0 ? "+" : ""}${a.netPnl}, dd ${a.maxDrawdownPct}%${a.locked ? ", BLOQUEADA" : ""})`).join("; ")}`)
  if (topSetup) lines.push(`Mejor setup: ${topSetup.name} · ${topSetup.trades} trades · WR ${topSetup.winRate}% · netPnl ${topSetup.netPnl}`)
  if (topMarket) lines.push(`Mejor mercado: ${topMarket.symbol} · ${topMarket.trades} trades · netPnl ${topMarket.netPnl} · WR ${topMarket.winRate}%`)
  lines.push(`Psicología: disciplina ${bundle.psychology.disciplineScore}/100 · violaciones ${bundle.psychology.violationRate}% · FOMO ${bundle.psychology.fomoCount} · revancha ${bundle.psychology.revengeCount}`)
  lines.push(`Emociones: ${bundle.psychology.byEmotion.slice(0, 4).map(e => `${e.emotion}(${e.trades}t, avgPnl ${e.avgPnl}, WR ${e.winRate}%)`).join("; ")}`)
  lines.push(`Retiros: ${bundle.withdrawals.count} por ${bundle.withdrawals.total} (impacto ${bundle.withdrawals.impactPct}% del P&L)`)
  lines.push(`Objetivos: P&L semanal ${bundle.goals.weekPnl}/${bundle.goals.weeklyPnlGoal ?? "—"} · trades ${bundle.goals.weekTrades}/${bundle.goals.weeklyTradesGoal ?? "—"} · disciplina objetivo ${bundle.goals.disciplineGoal ?? "—"}`)
  return lines.join("\n")
}

const SYSTEM = `Eres el motor de inteligencia analítica de un trading journal profesional.
Tu trabajo NO es repetir las métricas (eso ya lo muestra la plataforma). Tu trabajo es responder POR QUÉ están ocurriendo y QUÉ debería hacer el trader después.
Usa SOLO los datos del contexto. Sé concreto, directo y accionable. Responde en español, en markdown compacto, con estas secciones:
1. **Qué está pasando** (2-3 hallazgos clave, con números).
2. **Por qué** (correlaciones/causas probables).
3. **Qué hacer** (2-4 recomendaciones accionables y priorizadas).
No inventes datos. Si faltan datos, dilo brevemente.`

export async function streamAnalyticsInsights(opts: AnalyticsAiOptions): Promise<ReadableStream<Uint8Array>> {
  const bundle = await buildAnalyticsBundle(opts.userId, opts.prisma, windowFor(opts.period))
  const insights = generateInsights({
    trades: bundle.raw.trades, setups: bundle.raw.setupsMeta,
    accounts: bundle.raw.accountsMeta, withdrawals: bundle.raw.withdrawals,
  })

  const resolved = await resolveAiCall(opts.prisma, opts.userId, "analytics_insights")
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) throw new NoApiKeyError(resolved.primary.provider)

  const detected = insights.length
    ? "\n\n=== SEÑALES DETECTADAS (motor determinista) ===\n" +
      insights.map(i => `- [${i.severity}/${i.category}] ${i.title} — ${i.detail}${i.recommendation ? ` → ${i.recommendation}` : ""}`).join("\n")
    : "\n\n(El motor determinista no detectó señales fuertes; analiza el contexto general.)"

  const userMsg = `${buildContext(bundle)}${detected}\n\nGenera el análisis de inteligencia para este trader.`

  let lastErr: unknown
  for (const c of candidates) {
    try {
      return await streamChat({
        provider: c.provider, apiKey: c.apiKey, model: c.model,
        system: SYSTEM, messages: [{ role: "user", content: userMsg }],
      })
    } catch (err) { lastErr = err }
  }
  throw lastErr
}

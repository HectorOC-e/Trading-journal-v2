import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildTraderContext } from "@/domains/analytics/ai-context"
import { streamChat }         from "./chat"
import { resolveModelForFeature } from "./resolve-model"

export type MessageParam = { role: "user" | "assistant"; content: string }

export interface CoachStreamOptions {
  userId:   string
  messages: MessageParam[]
  prisma:   PrismaClient
}

function buildSystemPrompt(ctx: Awaited<ReturnType<typeof buildTraderContext>>): string {
  const { performance, behavior, learning, goals, recentTrades, patterns } = ctx

  const goalLines: string[] = []
  if (goals.weeklyPnlGoal != null)     goalLines.push(`- Meta P&L semanal: $${goals.weeklyPnlGoal} (actual: $${goals.weekPnl})`)
  if (goals.weeklyTradesGoal != null)  goalLines.push(`- Meta trades/semana: ${goals.weeklyTradesGoal} (actual: ${goals.weekTrades})`)
  if (goals.disciplineGoal != null)    goalLines.push(`- Meta disciplina: ${goals.disciplineGoal}%`)
  if (goals.weeklyGoalMinutes != null) goalLines.push(`- Meta aprendizaje: ${goals.weeklyGoalMinutes} min/semana`)
  const goalsSummary = goalLines.length > 0 ? goalLines.join("\n") : "  - El trader no ha configurado metas personales."

  const recentSummary = recentTrades
    .slice(0, 5)
    .map(t =>
      `  - ${t.date} ${t.symbol} ${t.direction}: PnL $${t.pnl.toFixed(2)}` +
      `${t.rMultiple != null ? ` (${t.rMultiple.toFixed(2)}R)` : ""}` +
      `${t.tags.length ? ` [${t.tags.join(", ")}]` : ""}`,
    )
    .join("\n")

  const patternSummary = patterns.length > 0
    ? patterns.map(p => `  - [${p.confidence.toUpperCase()}] ${p.title}: ${p.description}`).join("\n")
    : "  - No hay patrones detectados con datos suficientes."

  return `Eres un coach de trading profesional que ayuda a un trader a mejorar su desempeño y disciplina. Hablas en español, eres directo, empático y basas tus observaciones en datos reales.

## Datos del Trader

### Rendimiento
- Trades totales: ${performance.totalTrades}
- Win Rate: ${performance.winRate}%
- Avg R: ${performance.avgR >= 0 ? "+" : ""}${performance.avgR.toFixed(4)}R
- P&L neto: $${performance.netPnl.toFixed(2)}
- P&L este mes: $${performance.pnlMonth.toFixed(2)}
${performance.sharpeRatio != null ? `- Sharpe Ratio: ${performance.sharpeRatio.toFixed(4)}` : ""}
${performance.bestSetup ? `- Mejor setup: ${performance.bestSetup.name} (${performance.bestSetup.winRate}% WR, ${performance.bestSetup.trades} trades)` : ""}
${performance.worstSetup ? `- Peor setup: ${performance.worstSetup.name} (${performance.worstSetup.winRate}% WR, ${performance.worstSetup.trades} trades)` : ""}

### Comportamiento / Disciplina
- Violaciones totales: ${behavior.violationCount}
- Por tag: ${Object.entries(behavior.violationsByTag).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Costo indisciplina: $${behavior.costoIndisciplina.toFixed(2)}
- Racha días limpios: ${behavior.rachaDiasLimpios} días
- % Off-plan: ${behavior.offPlanPct}%

### Aprendizaje
- Recursos pendientes de revisión: ${learning.pendingReviews}
- Revisiones completadas este mes: ${learning.reviewsDoneThisMonth}
- Recursos dominados: ${learning.masteredResources}

### Metas personales
${goalsSummary}

### Últimos trades
${recentSummary || "  - Sin trades recientes."}

### Patrones detectados
${patternSummary}

## Instrucciones
- Responde siempre en español.
- Basa tus respuestas en los datos anteriores cuando sea relevante.
- Sé conciso pero completo. Usa bullet points cuando ayude a la claridad.
- Si el trader pregunta algo fuera del trading, redirige amablemente.
- No inventes datos que no estén en el contexto.`
}

/**
 * Builds the trader context and returns a ReadableStream of the coach reply.
 * Called from the HTTP route handler after auth and rate-limit checks.
 */
export async function streamCoachReply(opts: CoachStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const [traderCtx, resolved] = await Promise.all([
    buildTraderContext(opts.userId, opts.prisma),
    resolveModelForFeature(opts.prisma, opts.userId, "ai_chat"),
  ])
  const systemPrompt = buildSystemPrompt(traderCtx)

  // Per-feature model for chat, with a global fallback model on init failure.
  const { primary, fallback } = resolved
  try {
    return await streamChat({ model: primary.model, messages: opts.messages, system: systemPrompt })
  } catch (err) {
    if (fallback) {
      return await streamChat({ model: fallback.model, messages: opts.messages, system: systemPrompt })
    }
    throw err
  }
}

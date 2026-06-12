import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildTraderContext } from "@/domains/analytics/ai-context"
import { streamChat }         from "./chat"
import { APP_KNOWLEDGE }      from "./app-knowledge"
import { resolveAiCall, usableCandidates, NoApiKeyError } from "./resolve-provider"

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

  const accountsSummary = ctx.accounts.length > 0
    ? ctx.accounts.map(a =>
        `  - ${a.name} (${a.type}, ${a.currency}${a.phase && a.phase !== "NONE" ? `, ${a.phase}` : ""}): ` +
        `balance ${a.balance} ${ctx.baseCurrency}` +
        `${a.locked ? ` — BLOQUEADA (${a.lockReason})` : ""}` +
        `${a.ddTotalPct != null ? `, límite DD total ${a.ddTotalPct}%` : ""}` +
        `${a.targetPct != null ? `, objetivo ${a.targetPct}%` : ""}`,
      ).join("\n")
    : "  - El trader no tiene cuentas registradas."

  const setupsSummary = ctx.setups.length > 0
    ? ctx.setups.map(s =>
        `  - ${s.name} (${s.abbreviation}): WR ${s.winRate}% / avgR ${s.avgR >= 0 ? "+" : ""}${s.avgR}R en ${s.tradeCount} trades [${s.health}]` +
        `${s.expectedWr != null ? `, esperado ${s.expectedWr}% WR` : ""}`,
      ).join("\n")
    : "  - El trader no tiene setups en su Playbook."

  const wdEntries = Object.entries(ctx.withdrawals)
  const withdrawalsSummary = wdEntries.length > 0
    ? wdEntries.map(([cur, byStatus]) =>
        `  - ${cur}: ` + Object.entries(byStatus).map(([st, v]) => `${st} ${v.amount} (${v.count})`).join(", "),
      ).join("\n")
    : "  - Sin retiros registrados."

  const rulesSummary = ctx.rules.length > 0
    ? ctx.rules.map(r => `  - ${r.name} (${r.severity})`).join("\n")
    : "  - Sin reglas de disciplina activas."

  const psychSummary = ctx.psychology.sessions > 0
    ? `  - ${ctx.psychology.sessions} sesiones registradas. Mood pre promedio: ${ctx.psychology.avgPreMood ?? "—"}/5, energía: ${ctx.psychology.avgEnergy ?? "—"}/5.`
    : "  - Sin registros de psicología (mood/energía)."

  const marketsSummary = ctx.markets.length > 0 ? ctx.markets.map(m => m.symbol).join(", ") : "ninguno en watchlist"

  return `Eres un coach de trading profesional que ayuda a un trader a mejorar su desempeño y disciplina. Hablas en español, eres directo, empático y basas tus observaciones en datos reales. Conoces a fondo la app (un trading journal) y puedes guiar al trader sobre cómo usarla y por qué.

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

### Cuentas (moneda base: ${ctx.baseCurrency})
${accountsSummary}

### Setups (Playbook)
${setupsSummary}

### Retiros
${withdrawalsSummary}

### Reglas de disciplina activas
${rulesSummary}

### Psicología
${psychSummary}

### Mercados en watchlist
  - ${marketsSummary}

${APP_KNOWLEDGE}

## Instrucciones
- Responde siempre en español.
- Basa tus respuestas en los datos anteriores cuando sea relevante. Puedes referirte a las cuentas y setups del trader por su nombre.
- Cuando el trader pregunte cómo hacer algo, explica los pasos usando el mapa de pantallas y señala (en texto) la página o el botón correcto. No puedes navegar ni ejecutar acciones por tu cuenta — solo guías.
- Cuando ayude, explica el *porqué* detrás de las métricas y recomendaciones.
- Sé conciso pero completo. Usa bullet points cuando ayude a la claridad.
- Si el trader pregunta algo fuera del trading o del uso de la app, redirige amablemente.
- No inventes datos que no estén en el contexto. Nunca reveles claves de API ni credenciales (no las tienes en el contexto).`
}

/**
 * Builds the trader context and returns a ReadableStream of the coach reply.
 * Called from the HTTP route handler after auth and rate-limit checks.
 */
export async function streamCoachReply(opts: CoachStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const [traderCtx, resolved] = await Promise.all([
    buildTraderContext(opts.userId, opts.prisma),
    resolveAiCall(opts.prisma, opts.userId, "ai_chat"),
  ])
  const systemPrompt = buildSystemPrompt(traderCtx)

  // Use the user's resolved provider + key (primary, then fallback). Each candidate
  // already carries its own provider/model/apiKey — no env guessing.
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) {
    throw new NoApiKeyError(resolved.primary.provider)
  }

  let lastErr: unknown
  for (const c of candidates) {
    try {
      return await streamChat({
        provider: c.provider,
        apiKey:   c.apiKey,
        model:    c.model,
        messages: opts.messages,
        system:   systemPrompt,
      })
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

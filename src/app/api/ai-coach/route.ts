import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { buildTraderContext } from "@/domains/analytics/ai-context"

type MessageParam = { role: "user" | "assistant"; content: string }

function buildSystemPrompt(ctx: Awaited<ReturnType<typeof buildTraderContext>>): string {
  const { performance, behavior, learning, recentTrades, patterns } = ctx

  const recentSummary = recentTrades
    .slice(0, 5)
    .map(t => `  - ${t.date} ${t.symbol} ${t.direction}: PnL $${t.pnl.toFixed(2)}${t.rMultiple != null ? ` (${t.rMultiple.toFixed(2)}R)` : ""}${t.tags.length ? ` [${t.tags.join(", ")}]` : ""}`)
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // ── API key check ───────────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 200 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let messages: MessageParam[]
  try {
    const body = await req.json() as { messages?: MessageParam[] }
    messages = body.messages ?? []
    if (!Array.isArray(messages)) throw new Error("invalid messages")
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
  }

  // ── Build trader context ────────────────────────────────────────────────────
  const traderCtx = await buildTraderContext(user.id, prisma)
  const systemPrompt = buildSystemPrompt(traderCtx)

  // ── Stream from Anthropic ───────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = await client.messages.stream({
    model:      "claude-sonnet-4-5",
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   messages.map(m => ({ role: m.role, content: m.content })),
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new NextResponse(readable, {
    headers: {
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}

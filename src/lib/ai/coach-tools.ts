// Read-only tools the AI coach can call on demand to drill into specifics.
// Never writes; always scoped to the requesting user. Used by the Anthropic
// agentic path (coach-agent.ts).

import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { proposeRuleForCommitment } from "@/domains/behavior/rule-linking"
import { proposeCommitment } from "@/server/services/behavior/commitment-service"
import { isWin, calcWinRate, calcProfitFactor } from "@/lib/formulas"
import { calcSetupHealth } from "@/lib/formulas/setup"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { isPracticeType } from "@/domains/trading/account-reality"
import { search } from "@/server/services/retrieval/pipeline"
import { CORPUS_KEYS, isCorpusKey } from "@/server/services/retrieval/types"
import type { Citation, CorpusKey, CorpusOutcome } from "@/server/services/retrieval/types"

const PERIOD_DAYS: Record<string, number | null> = { "7d": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": null }

/** Anthropic tool definitions (also reused to build OpenAI tool specs). */
export const COACH_TOOLS = [
  {
    name: "get_account_detail",
    description: "Detalle de UNA cuenta del trader por nombre: tipo, fase, divisa, balance, bloqueo, límites prop-firm, P&L y win rate. Úsalo cuando el trader pregunte por una cuenta específica.",
    input_schema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Nombre o parte del nombre de la cuenta" } },
      required: ["name"],
    },
  },
  {
    name: "get_setup_detail",
    description: "Detalle de UN setup del Playbook por nombre: edge esperado vs real (win rate, avg R), nº de trades y salud. Úsalo cuando el trader pregunte por un setup específico.",
    input_schema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Nombre o parte del nombre del setup" } },
      required: ["name"],
    },
  },
  {
    name: "search_trades",
    description: "Busca trades cerrados del trader por símbolo, setup, resultado, dirección, tag (p.ej. Impulsivo/Revanche/Off-plan) y/o emoción previa (calm/anxious/excited/fearful/overconfident). Devuelve una lista compacta con id. Úsalo para preguntas específicas sobre operaciones.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol:    { type: "string", description: "Símbolo, p.ej. EURUSD (opcional)" },
        setup:     { type: "string", description: "Nombre o parte del setup (opcional)" },
        outcome:   { type: "string", enum: ["win", "loss", "all"], description: "Filtrar por resultado (opcional)" },
        direction: { type: "string", enum: ["LONG", "SHORT"], description: "Dirección (opcional)" },
        tag:       { type: "string", description: "Tag exacto, p.ej. Impulsivo, Revanche, Off-plan (opcional)" },
        emotion:   { type: "string", description: "Emoción previa: calm/anxious/excited/fearful/overconfident (opcional)" },
        limit:     { type: "number", description: "Máx. resultados (default 10, máx 25)" },
      },
    },
  },
  {
    name: "get_trade_detail",
    description: "Detalle completo de UN trade por su id (obtenido de search_trades o semantic_search): precios, tamaño, P&L, R, setup, tags, notas, psicología y eventos (scale-ins/parciales).",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "id del trade" } },
      required: ["id"],
    },
  },
  {
    name: "get_period_stats",
    description: "KPIs agregados del trader para un periodo (en moneda base): nº trades, win rate, profit factor, P&L neto, avg R, expectancy, mejor y peor día.",
    input_schema: {
      type: "object" as const,
      properties: { period: { type: "string", enum: ["7d", "1M", "3M", "6M", "1Y", "ALL"], description: "Periodo (default 3M)" } },
    },
  },
  {
    name: "semantic_search",
    description: "Búsqueda semántica por SIGNIFICADO sobre lo que el trader ha escrito. Corpus: 'trade_notes' (lo que anotó DESPUÉS de cada trade), 'trade_plans' (el plan que se fijó ANTES de entrar) y 'learning_notes' (apuntes de libros/cursos). Omite 'corpus' para buscar en todos. Útil para 'trades donde rompí mi plan por FOMO', 'qué me dije que iba a hacer' o 'dónde anoté algo sobre gestión de riesgo'.",
    input_schema: {
      type: "object" as const,
      properties: {
        query:  { type: "string", description: "Qué buscar, en lenguaje natural" },
        corpus: { type: "string", enum: [...CORPUS_KEYS], description: "Opcional. Omitir para buscar en todos." },
        limit:  { type: "number", description: "Máx. resultados (1-10, default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_learning_resources",
    description: "Lista los recursos de aprendizaje del trader (libros, cursos, vídeos…) con su progreso, estado, si están marcados para repaso y los setups del Playbook vinculados. Úsalo para '¿qué estoy estudiando?' o para recomendar qué retomar.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "MASTERED", "ABANDONED"], description: "Filtrar por estado (opcional)" },
        type:   { type: "string", description: "Tipo de recurso, p.ej. book/course/video (opcional)" },
        limit:  { type: "number", description: "Máx. resultados (default 20, máx 50)" },
      },
    },
  },
  {
    name: "get_study_agenda",
    description: "Agenda de aprendizaje: repasos (SRS) que vencen y sesiones de estudio recientes/planificadas en los próximos N días y los últimos N días. Úsalo para '¿qué tengo que repasar/estudiar esta semana?'.",
    input_schema: {
      type: "object" as const,
      properties: { days: { type: "number", description: "Ventana en días hacia delante y atrás (default 14, máx 60)" } },
    },
  },
  {
    name: "suggest_study",
    description: "Cruza las debilidades del trader (peor setup por win rate, tag de indisciplina más frecuente) con sus recursos vinculados para sugerir QUÉ estudiar para mejorar. Devuelve 1-3 recomendaciones con su razón. Úsalo cuando el trader pida 'qué debería estudiar' o 'cómo mejoro X'.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_recent_notifications",
    description: "Notificaciones recientes del trader (eventos del centro: cuenta bloqueada, regla disparada, review vencida, importación, reporte semanal). Útil para referenciar qué pasó ('te bloquearon la cuenta el martes'). Solo lectura.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit:      { type: "number", description: "Máx. resultados (default 10, máx 25)" },
        unreadOnly: { type: "boolean", description: "Solo no leídas (opcional)" },
      },
    },
  },
  {
    name: "propose_commitment",
    description: "PROPONE (no crea activo) un compromiso conductual verificable que el trader debe ACEPTAR. NO lo activas: queda como propuesta que el trader confirma o descarta. Úsalo cuando un compromiso concreto le ayudaría (más blando que una regla: una promesa que el sistema verifica al cierre de la ventana, no un bloqueo). Explica que la propuesta espera su confirmación.",
    input_schema: {
      type: "object" as const,
      properties: {
        commitment: { type: "string", enum: ["limit_trades", "no_revenge", "respect_risk", "stay_on_plan"], description: "Tipo: máx. 2 trades/día | cero revancha tras pérdida | respetar límite de riesgo | operar solo dentro del plan (todos, esta semana)." },
        reason:     { type: "string", description: "Por qué se lo propones, en una frase (se muestra al trader)." },
      },
      required: ["commitment", "reason"],
    },
  },
  {
    name: "propose_rule",
    description: "PROPONE (no aplica) una regla protectora de pre-trade para el trader. NO la activa: crea una sugerencia que el trader ve y debe ACEPTAR o descartar — tú nunca activas reglas por tu cuenta. Úsalo cuando, tras analizar su comportamiento, una protección concreta le ayudaría (p. ej. tras detectar revenge-trading o sobredimensionamiento). Explica al trader que la propuesta está esperando su confirmación.",
    input_schema: {
      type: "object" as const,
      properties: {
        protection: { type: "string", enum: ["max_trades_per_day", "cooldown_after_loss", "max_risk_per_trade"], description: "Tipo de protección: máx. 2 trades/día | enfriamiento anti-revenge tras pérdida | límite de riesgo por trade." },
        risk_pct:   { type: "number", description: "Solo para max_risk_per_trade: % de riesgo máximo por trade (p. ej. 1)." },
        reason:     { type: "string", description: "Por qué se la propones, en una frase (se muestra al trader)." },
      },
      required: ["protection", "reason"],
    },
  },
] as const

export type CoachToolName = (typeof COACH_TOOLS)[number]["name"]

// propose_rule (D1): map the coach's protection choice → a known safe rule template.
const PROTECTION_TO_METRIC: Record<string, string> = {
  max_trades_per_day: "tradesPerDayBeyond2",
  cooldown_after_loss: "revengeTradesAfterLoss",
  max_risk_per_trade: "oversizedTrades",
}

export interface ToolCtx { userId: string; prisma: PrismaClient }

/**
 * Resultado de una tool con DOS destinos y necesidades distintas:
 * `text` va al modelo (compacto, presupuesto de contexto — FREEZE-D10) y
 * `cites` va al cliente para pintar las tarjetas de evidencia.
 */
export interface ToolResult { text: string; cites?: Citation[] }

/**
 * Traduce el estado a algo que el modelo pueda narrar sin mentir.
 *
 * REGLA VINCULANTE (spec §6): sólo EMPTY_CORPUS y NO_MATCHES pueden redactarse
 * como ausencia. NO_KEY / EMBED_FAILED / NOT_INDEXED dicen "no pude buscar".
 * Colapsarlos es lo que hacía que el coach afirmara "no has anotado nada sobre
 * eso" sobre un trader que sí lo había anotado.
 */
function explainState(o: CorpusOutcome): { pudeBuscar: boolean; explicacion: string } {
  switch (o.state) {
    case "NO_KEY":
      return { pudeBuscar: false, explicacion: "No pude buscar: no hay clave de embeddings configurada. Dile al trader que la configure en /perfil. NO afirmes que no ha escrito nada." }
    case "EMBED_FAILED":
      return { pudeBuscar: false, explicacion: "No pude buscar: fallo transitorio del proveedor de embeddings. Sugiere reintentar. NO afirmes que no ha escrito nada." }
    case "NOT_INDEXED":
      return { pudeBuscar: false, explicacion: `No pude buscar en todo: quedan ${o.remaining} textos sin indexar. NO afirmes que no ha escrito nada sobre el tema.` }
    case "EMPTY_CORPUS":
      return { pudeBuscar: true, explicacion: "El trader todavía no ha escrito nada en este corpus." }
    case "NO_MATCHES":
      return { pudeBuscar: true, explicacion: "Busqué sobre todo lo indexado y no hay nada parecido." }
    default:
      return { pudeBuscar: true, explicacion: o.remaining > 0 ? `Encontré resultados, pero quedan ${o.remaining} textos sin indexar.` : "Encontré resultados." }
  }
}

/**
 * Ejecuta una tool por nombre. `text` alimenta al modelo; `cites` al cliente.
 *
 * El cuerpo interno sigue devolviendo string y sólo la rama que produce
 * evidencia llama a `emitCites` — así las 30 salidas restantes no se tocan.
 */
export async function executeCoachTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  let cites: Citation[] | undefined
  const text = await runCoachTool(name, input, ctx, (c) => { cites = c })
  return cites?.length ? { text, cites } : { text }
}

async function runCoachTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolCtx,
  emitCites: (c: Citation[]) => void,
): Promise<string> {
  const { userId, prisma } = ctx
  try {
    if (name === "get_account_detail") {
      const q = String(input.name ?? "").trim()
      const acc = await prisma.account.findFirst({
        where:  { userId, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, type: true, currency: true, phase: true, status: true, locked: true, lockReason: true, initialBalance: true, ddDailyPct: true, ddTotalPct: true, targetPct: true },
      })
      if (!acc) return JSON.stringify({ error: `No encontré una cuenta que coincida con "${q}".` })
      const trades = await prisma.trade.findMany({ where: { userId, accountId: acc.id, status: "CLOSED" }, select: { pnl: true } })
      const net  = trades.reduce((s, t) => s + (t.pnl != null ? Number(t.pnl) : 0), 0)
      const wins = trades.filter(t => (t.pnl != null ? Number(t.pnl) : 0) > 0).length
      return JSON.stringify({
        name: acc.name, type: acc.type, currency: acc.currency, phase: acc.phase, status: acc.status,
        locked: acc.locked, lockReason: acc.lockReason || null,
        initialBalance: Number(acc.initialBalance), balance: Number(acc.initialBalance) + net,
        netPnl: parseFloat(net.toFixed(2)), trades: trades.length, winRate: parseFloat(calcWinRate(wins, trades.length).toFixed(1)),
        ddDailyPct: acc.ddDailyPct != null ? Number(acc.ddDailyPct) : null,
        ddTotalPct: acc.ddTotalPct != null ? Number(acc.ddTotalPct) : null,
        targetPct:  acc.targetPct  != null ? Number(acc.targetPct)  : null,
      })
    }

    if (name === "get_setup_detail") {
      const q = String(input.name ?? "").trim()
      const setup = await prisma.setup.findFirst({
        where:  { userId, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, abbreviation: true, market: true, direction: true, status: true, expectedWr: true, expectedAvgR: true },
      })
      if (!setup) return JSON.stringify({ error: `No encontré un setup que coincida con "${q}".` })
      const trades = await prisma.trade.findMany({ where: { userId, setupId: setup.id, status: "CLOSED" }, select: { pnl: true, rMultiple: true } })
      const wins   = trades.filter(t => isWin({ pnl: t.pnl != null ? Number(t.pnl) : 0 })).length
      const withR  = trades.filter(t => t.rMultiple != null)
      const winRate = parseFloat(calcWinRate(wins, trades.length).toFixed(2))
      const avgR    = withR.length ? parseFloat((withR.reduce((s, t) => s + Number(t.rMultiple), 0) / withR.length).toFixed(3)) : 0
      const expWr = setup.expectedWr != null ? Number(setup.expectedWr) : null
      const expR  = setup.expectedAvgR != null ? Number(setup.expectedAvgR) : null
      return JSON.stringify({
        name: setup.name, abbreviation: setup.abbreviation, market: setup.market, direction: setup.direction, status: setup.status,
        expectedWr: expWr, expectedAvgR: expR, winRate, avgR, trades: trades.length,
        health: calcSetupHealth({ winRate, avgR, expectedWr: expWr, expectedAvgR: expR, tradeCount: trades.length }),
      })
    }

    if (name === "search_trades") {
      const symbol  = input.symbol ? String(input.symbol).trim() : undefined
      const setupQ  = input.setup ? String(input.setup).trim() : undefined
      const outcome = input.outcome === "win" || input.outcome === "loss" ? input.outcome : "all"
      const direction = input.direction === "LONG" || input.direction === "SHORT" ? input.direction : undefined
      const tag     = input.tag ? String(input.tag).trim() : undefined
      const emotion = input.emotion ? String(input.emotion).trim().toLowerCase() : undefined
      const limit   = Math.min(25, Math.max(1, Number(input.limit) || 10))

      let setupIds: string[] | undefined
      if (setupQ) {
        const setups = await prisma.setup.findMany({ where: { userId, name: { contains: setupQ, mode: "insensitive" } }, select: { id: true } })
        setupIds = setups.map(s => s.id)
        if (setupIds.length === 0) return JSON.stringify({ error: `Ningún setup coincide con "${setupQ}".`, trades: [] })
      }
      const rows = await prisma.trade.findMany({
        where: {
          userId, status: "CLOSED",
          ...(symbol ? { symbol: { contains: symbol, mode: "insensitive" } } : {}),
          ...(setupIds ? { setupId: { in: setupIds } } : {}),
          ...(direction ? { direction } : {}),
          ...(tag ? { tags: { has: tag } } : {}),
          ...(emotion ? { emotionBefore: emotion } : {}),
          ...(outcome === "win"  ? { pnl: { gt: 0 } } : {}),
          ...(outcome === "loss" ? { pnl: { lt: 0 } } : {}),
        },
        select: { id: true, date: true, symbol: true, direction: true, pnl: true, rMultiple: true, tags: true },
        orderBy: { date: "desc" },
        take: limit,
      })
      return JSON.stringify({
        count: rows.length,
        trades: rows.map(t => ({
          id: t.id, date: (t.date as Date).toISOString().slice(0, 10), symbol: t.symbol, direction: t.direction,
          pnl: t.pnl != null ? parseFloat(Number(t.pnl).toFixed(2)) : 0,
          rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null, tags: t.tags as string[],
        })),
      })
    }

    if (name === "get_trade_detail") {
      const id = String(input.id ?? "").trim()
      const t = await prisma.trade.findFirst({
        where:   { id, userId },
        include: { setup: { select: { name: true } }, account: { select: { name: true, currency: true } }, events: { orderBy: { timestamp: "asc" }, select: { type: true, price: true, contracts: true, notes: true } } },
      })
      if (!t) return JSON.stringify({ error: `No encontré un trade con id "${id}".` })
      return JSON.stringify({
        date: (t.date as Date).toISOString().slice(0, 10), symbol: t.symbol, direction: t.direction,
        account: t.account?.name, currency: t.account?.currency, setup: t.setup?.name ?? null,
        entry: Number(t.entry), stop: Number(t.stop), target: Number(t.target), size: Number(t.size),
        closePrice: t.closePrice != null ? Number(t.closePrice) : null,
        pnl: t.pnl != null ? parseFloat(Number(t.pnl).toFixed(2)) : null,
        rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null, commission: t.commission != null ? Number(t.commission) : null,
        tags: t.tags as string[], notes: t.notes || null,
        psychology: { emotionBefore: t.emotionBefore, confidence: t.confidenceRating, executionQuality: t.executionQuality, fomo: t.fomoFlag, revenge: t.revengeFlag },
        events: t.events.map(e => ({ type: e.type, price: e.price != null ? Number(e.price) : null, contracts: e.contracts != null ? Number(e.contracts) : null, notes: e.notes || undefined })),
      })
    }

    if (name === "get_period_stats") {
      const period = typeof input.period === "string" && input.period in PERIOD_DAYS ? input.period : "3M"
      const days   = PERIOD_DAYS[period]
      const from   = days != null ? new Date(Date.now() - days * 86_400_000) : undefined
      const [user, accounts, allRows] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
        prisma.account.findMany({ where: { userId }, select: { id: true, currency: true, type: true } }),
        prisma.trade.findMany({ where: { userId, status: "CLOSED", ...(from ? { date: { gte: from } } : {}) }, select: { accountId: true, pnl: true, rMultiple: true, date: true } }),
      ])
      const base   = user?.baseCurrency ?? "USD"
      const rates  = parseFxRates(user?.fxRates)
      const fxOf   = new Map(accounts.map(a => [a.id, fxFactor(a.currency, base, rates)]))
      // Financial performance excludes practice (demo/backtest): unreal money must
      // not inflate the real track record. The model is told what was excluded.
      const practiceIds = new Set(accounts.filter(a => isPracticeType(a.type)).map(a => a.id))
      const rows   = allRows.filter(t => !practiceIds.has(t.accountId))
      const excludedPracticeTrades = allRows.length - rows.length
      const ps     = rows.map(t => (t.pnl != null ? Number(t.pnl) : 0) * (fxOf.get(t.accountId) ?? 1))
      const total  = ps.length
      const wins   = ps.filter(p => p > 0).length
      const net    = ps.reduce((a, b) => a + b, 0)
      const gW = ps.filter(p => p > 0).reduce((a, b) => a + b, 0), gL = Math.abs(ps.filter(p => p < 0).reduce((a, b) => a + b, 0))
      const withR  = rows.filter(t => t.rMultiple != null).map(t => Number(t.rMultiple))
      const dayMap: Record<string, number> = {}
      rows.forEach((t, i) => { const d = (t.date as Date).toISOString().slice(0, 10); dayMap[d] = (dayMap[d] ?? 0) + ps[i] })
      const dayEntries = Object.entries(dayMap)
      const best = dayEntries.length ? dayEntries.reduce((a, b) => b[1] > a[1] ? b : a) : null
      const worst = dayEntries.length ? dayEntries.reduce((a, b) => b[1] < a[1] ? b : a) : null
      return JSON.stringify({
        period, baseCurrency: base, scope: "real_accounts_only", excludedPracticeTrades, trades: total,
        winRate: parseFloat(calcWinRate(wins, total).toFixed(2)),
        profitFactor: parseFloat(calcProfitFactor(gW, gL).toFixed(2)),
        netPnl: parseFloat(net.toFixed(2)),
        avgR: withR.length ? parseFloat((withR.reduce((a, b) => a + b, 0) / withR.length).toFixed(3)) : 0,
        expectancy: total ? parseFloat((net / total).toFixed(2)) : 0,
        bestDay:  best  ? { date: best[0],  pnl: parseFloat(best[1].toFixed(2))  } : null,
        worstDay: worst ? { date: worst[0], pnl: parseFloat(worst[1].toFixed(2)) } : null,
      })
    }

    if (name === "semantic_search") {
      const query = String(input.query ?? "").trim()
      if (!query) return JSON.stringify({ error: "Falta la consulta." })
      if (input.corpus != null && !isCorpusKey(input.corpus)) {
        return JSON.stringify({ error: `Corpus desconocido: ${String(input.corpus)}` })
      }
      const corpus = input.corpus as CorpusKey | undefined
      const result = await search(prisma, userId, { query, corpus, limit: Number(input.limit) || undefined })
      emitCites(result.citations)
      return JSON.stringify({
        resultados: result.citations.map(c => ({
          corpus: c.corpus, etiqueta: c.label, cuando: c.sublabel,
          desenlace: c.outcome, nota: c.snippet, similitud: c.similarity,
        })),
        // Un estado POR corpus, sin colapsar: un corpus mudo no puede esconderse
        // detrás de otro sano.
        estado: result.outcomes.map(o => ({ corpus: o.corpus, ...explainState(o) })),
      })
    }

    if (name === "get_learning_resources") {
      const status = typeof input.status === "string" ? input.status : undefined
      const type   = input.type ? String(input.type).trim() : undefined
      const limit  = Math.min(50, Math.max(1, Number(input.limit) || 20))
      const rows = await prisma.learningResource.findMany({
        where: { userId, ...(status ? { status } : {}), ...(type ? { type: { contains: type, mode: "insensitive" } } : {}) },
        select: { id: true, title: true, type: true, status: true, progressPct: true, markedForReview: true, nextReviewAt: true, linkedSetups: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: limit,
      })
      return JSON.stringify({
        count: rows.length,
        resources: rows.map(r => ({
          id: r.id, title: r.title, type: r.type, status: r.status,
          progressPct: r.progressPct, markedForReview: r.markedForReview,
          nextReviewAt: r.nextReviewAt ? (r.nextReviewAt as Date).toISOString().slice(0, 10) : null,
          linkedSetups: r.linkedSetups.map(s => s.name),
        })),
      })
    }

    if (name === "get_study_agenda") {
      const days = Math.min(60, Math.max(1, Number(input.days) || 14))
      const now = new Date()
      const todayISO = now.toISOString().slice(0, 10)
      const ahead = new Date(now); ahead.setDate(now.getDate() + days)
      const back  = new Date(now); back.setDate(now.getDate() - days)
      const [resources, sessions] = await Promise.all([
        prisma.learningResource.findMany({
          where: { userId, status: { not: "ABANDONED" }, nextReviewAt: { not: null, lte: ahead } },
          select: { id: true, title: true, type: true, nextReviewAt: true, status: true },
        }),
        prisma.studySession.findMany({
          where: { userId, status: { in: ["completed", "planned"] }, startedAt: { gte: back, lte: ahead } },
          select: { status: true, startedAt: true, durationMin: true, plannedMin: true, resource: { select: { title: true, type: true } } },
          orderBy: { startedAt: "asc" },
        }),
      ])
      const dueReviews = resources
        .filter(r => r.status !== "MASTERED" && r.nextReviewAt)
        .map(r => ({ date: (r.nextReviewAt as Date).toISOString().slice(0, 10), title: r.title, type: r.type, overdue: (r.nextReviewAt as Date).toISOString().slice(0, 10) <= todayISO }))
      return JSON.stringify({
        windowDays: days,
        dueReviews,
        sessions: sessions.map(s => ({
          status: s.status, date: (s.startedAt as Date).toISOString().slice(0, 10),
          minutes: s.status === "planned" ? s.plannedMin : s.durationMin,
          resource: s.resource.title, type: s.resource.type,
        })),
      })
    }

    if (name === "suggest_study") {
      const [setups, resources] = await Promise.all([
        prisma.setup.findMany({ where: { userId }, select: { id: true, name: true } }),
        prisma.learningResource.findMany({
          where: { userId, status: { notIn: ["ABANDONED", "MASTERED"] } },
          select: { id: true, title: true, type: true, status: true, progressPct: true, linkedSetups: { select: { id: true } } },
        }),
      ])
      const trades = await prisma.trade.findMany({
        where: { userId, status: "CLOSED", setupId: { not: null } },
        select: { setupId: true, pnl: true },
      })
      const stats = new Map<string, { wins: number; trades: number }>()
      for (const t of trades) {
        if (!t.setupId) continue
        const s = stats.get(t.setupId) ?? { wins: 0, trades: 0 }
        s.trades++
        if (t.pnl != null && Number(t.pnl) > 0) s.wins++
        stats.set(t.setupId, s)
      }
      const nameById = new Map(setups.map(s => [s.id, s.name]))
      // Rank linked resources by the win rate of their weakest linked setup (asc).
      const ranked = resources
        .map(r => {
          let worstWr: number | null = null, worstSetup = ""
          for (const ls of r.linkedSetups) {
            const st = stats.get(ls.id)
            if (!st || st.trades < 3) continue
            const wr = Math.round((st.wins / st.trades) * 100)
            if (worstWr == null || wr < worstWr) { worstWr = wr; worstSetup = nameById.get(ls.id) ?? "" }
          }
          return worstWr == null ? null : { id: r.id, title: r.title, type: r.type, status: r.status, progressPct: r.progressPct, setup: worstSetup, setupWinRate: worstWr }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .sort((a, b) => a.setupWinRate - b.setupWinRate)
        .slice(0, 3)
      if (ranked.length === 0) {
        return JSON.stringify({ suggestions: [], note: "No hay recursos vinculados a setups con suficientes trades para detectar una debilidad clara. Sugiere vincular recursos a setups en el Playbook." })
      }
      return JSON.stringify({
        suggestions: ranked.map(r => ({
          resourceId: r.id, title: r.title, type: r.type, status: r.status, progressPct: r.progressPct,
          reason: `Refuerza el setup "${r.setup}" (${r.setupWinRate}% WR).`,
        })),
      })
    }

    if (name === "get_recent_notifications") {
      const limit = Math.min(25, Math.max(1, Number(input.limit) || 10))
      const unreadOnly = input.unreadOnly === true
      const rows = await prisma.notification.findMany({
        where: { userId, archivedAt: null, ...(unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { title: true, body: true, type: true, priority: true, category: true, readAt: true, createdAt: true },
      })
      return JSON.stringify({
        notifications: rows.map(r => ({
          title: r.title, body: r.body, type: r.type, priority: r.priority, category: r.category,
          read: r.readAt != null, date: (r.createdAt as Date).toISOString().slice(0, 10),
        })),
      })
    }

    if (name === "propose_commitment") {
      // WRITE tool (D1·b) — proposes a verifiable commitment the user must CONFIRM.
      // Lands as `proposed` (inert until accepted), never auto-active.
      const proposal = await proposeCommitment(prisma, userId, String(input.commitment ?? ""))
      if (!proposal) return JSON.stringify({ error: `Compromiso no soportado: ${input.commitment}` })
      return JSON.stringify({
        proposed: true, commitmentId: proposal.id, text: proposal.text,
        message: `Compromiso propuesto y pendiente de confirmación del trader: "${proposal.text}". Informa al trader de que lo verá para aceptarlo o descartarlo; tú no lo has activado.`,
      })
    }

    if (name === "propose_rule") {
      // WRITE tool (D1) — proposes a protective rule the user must CONFIRM. Never
      // auto-applies (permission frontier): creates a pending RuleSuggestion.
      const protection = String(input.protection ?? "")
      const metricKey = PROTECTION_TO_METRIC[protection]
      if (!metricKey) return JSON.stringify({ error: `Protección no soportada: ${protection}` })
      const riskPct = Number(input.risk_pct)
      const proposed = proposeRuleForCommitment(metricKey, Number.isFinite(riskPct) && riskPct > 0 ? { oversizeThresholdPct: riskPct } : {})
      if (!proposed) return JSON.stringify({ error: "No se pudo construir la regla." })
      const reason = String(input.reason ?? "").slice(0, 300) || "Propuesta del coach."
      const sug = await prisma.ruleSuggestion.create({
        data: { userId, insightId: null, proposedRule: proposed as unknown as Prisma.InputJsonValue, reason, status: "pending" },
        select: { id: true },
      })
      return JSON.stringify({
        proposed: true, suggestionId: sug.id, ruleName: proposed.name,
        message: `Propuesta creada y pendiente de confirmación del trader: "${proposed.name}". Informa al trader de que la verá para aceptarla o descartarla; tú no la has activado.`,
      })
    }

    return JSON.stringify({ error: `Herramienta desconocida: ${name}` })
  } catch (err) {
    return JSON.stringify({ error: `Error ejecutando ${name}: ${err instanceof Error ? err.message : String(err)}` })
  }
}

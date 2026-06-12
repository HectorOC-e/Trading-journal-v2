// Read-only tools the AI coach can call on demand to drill into specifics.
// Never writes; always scoped to the requesting user. Used by the Anthropic
// agentic path (coach-agent.ts).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate, calcProfitFactor } from "@/lib/formulas"
import { calcSetupHealth } from "@/lib/formulas/setup"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { embedText } from "@/lib/ai/embeddings"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"

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
    description: "Búsqueda semántica sobre las NOTAS de los trades (significado, no filtros exactos). Útil para 'trades donde rompí mi plan por FOMO' o 'cuando dudé del setup'. Requiere que el trader tenga notas y una clave de embeddings configurada.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string", description: "Qué buscar, en lenguaje natural" }, limit: { type: "number", description: "Máx. resultados (default 8)" } },
      required: ["query"],
    },
  },
] as const

export type CoachToolName = (typeof COACH_TOOLS)[number]["name"]

export interface ToolCtx { userId: string; prisma: PrismaClient }

/** Execute a tool by name. Returns a JSON string fed back to the model. */
export async function executeCoachTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<string> {
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
      const [user, accounts, rows] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
        prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
        prisma.trade.findMany({ where: { userId, status: "CLOSED", ...(from ? { date: { gte: from } } : {}) }, select: { accountId: true, pnl: true, rMultiple: true, date: true } }),
      ])
      const base   = user?.baseCurrency ?? "USD"
      const rates  = parseFxRates(user?.fxRates)
      const fxOf   = new Map(accounts.map(a => [a.id, fxFactor(a.currency, base, rates)]))
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
        period, baseCurrency: base, trades: total,
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
      const limit = Math.min(20, Math.max(1, Number(input.limit) || 8))
      const emb = await resolveEmbeddingCall(prisma, userId)
      if (emb.source === "none") return JSON.stringify({ error: "El trader no tiene una clave de embeddings configurada para búsqueda semántica.", trades: [] })
      const vec = await embedText(query, { model: emb.model, apiKey: emb.apiKey })
      if (!vec) return JSON.stringify({ error: "No se pudo generar el embedding de la consulta.", trades: [] })
      type Row = { id: string; similarity: number }
      const hits = await prisma.$queryRaw<Row[]>`
        SELECT id, (1 - (notes_embedding <=> ${`[${vec.join(",")}]`}::vector)) AS similarity
        FROM trades WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
        ORDER BY notes_embedding <=> ${`[${vec.join(",")}]`}::vector LIMIT ${limit}`
      if (!hits.length) return JSON.stringify({ trades: [], note: "Sin trades con notas embebidas que coincidan." })
      const ids = hits.map(h => h.id)
      const found = await prisma.trade.findMany({ where: { id: { in: ids }, userId }, select: { id: true, date: true, symbol: true, direction: true, pnl: true, tags: true, notes: true } })
      const simById = new Map(hits.map(h => [h.id, h.similarity]))
      return JSON.stringify({
        trades: ids.map(id => found.find(t => t.id === id)).filter(Boolean).map(t => ({
          id: t!.id, date: (t!.date as Date).toISOString().slice(0, 10), symbol: t!.symbol, direction: t!.direction,
          pnl: t!.pnl != null ? parseFloat(Number(t!.pnl).toFixed(2)) : 0, tags: t!.tags as string[],
          notes: (t!.notes || "").slice(0, 200), similarity: parseFloat((simById.get(t!.id) ?? 0).toFixed(3)),
        })),
      })
    }

    return JSON.stringify({ error: `Herramienta desconocida: ${name}` })
  } catch (err) {
    return JSON.stringify({ error: `Error ejecutando ${name}: ${err instanceof Error ? err.message : String(err)}` })
  }
}

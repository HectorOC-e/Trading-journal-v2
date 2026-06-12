// Read-only tools the AI coach can call on demand to drill into specifics.
// Never writes; always scoped to the requesting user. Used by the Anthropic
// agentic path (coach-agent.ts).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate } from "@/lib/formulas"
import { calcSetupHealth } from "@/lib/formulas/setup"

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
    description: "Busca trades cerrados del trader filtrando por símbolo, nombre de setup y/o resultado. Devuelve una lista compacta. Úsalo para preguntas específicas sobre operaciones.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol:  { type: "string", description: "Símbolo, p.ej. EURUSD (opcional)" },
        setup:   { type: "string", description: "Nombre o parte del setup (opcional)" },
        outcome: { type: "string", enum: ["win", "loss", "all"], description: "Filtrar por resultado (opcional)" },
        limit:   { type: "number", description: "Máx. resultados (default 10, máx 25)" },
      },
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
          ...(outcome === "win"  ? { pnl: { gt: 0 } } : {}),
          ...(outcome === "loss" ? { pnl: { lt: 0 } } : {}),
        },
        select: { date: true, symbol: true, direction: true, pnl: true, rMultiple: true, tags: true },
        orderBy: { date: "desc" },
        take: limit,
      })
      return JSON.stringify({
        count: rows.length,
        trades: rows.map(t => ({
          date: (t.date as Date).toISOString().slice(0, 10), symbol: t.symbol, direction: t.direction,
          pnl: t.pnl != null ? parseFloat(Number(t.pnl).toFixed(2)) : 0,
          rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null, tags: t.tags as string[],
        })),
      })
    }

    return JSON.stringify({ error: `Herramienta desconocida: ${name}` })
  } catch (err) {
    return JSON.stringify({ error: `Error ejecutando ${name}: ${err instanceof Error ? err.message : String(err)}` })
  }
}

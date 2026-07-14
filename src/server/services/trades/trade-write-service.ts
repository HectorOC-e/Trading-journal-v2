// ─────────────────────────────────────────────────────────────────────────────
// Trade write service (TD-018) — the create/update/close/event/delete workflows
// moved out of the trades router. This is the I/O shell: guards (risk limits,
// prop-firm constraints, budget, rules engine), persistence and post-trade
// effects. Pure decisions stay in domains/ (risk-enforcement, budget-guard,
// trade-service math, rules engine). Errors (TRPCError/AppError) are thrown
// exactly as the router did — same codes, same messages.
// ─────────────────────────────────────────────────────────────────────────────
import { TRPCError } from "@trpc/server"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { checkTradeCountLimit, checkSymbolAllowlist } from "@/domains/trading/services/prop-firm-guard"
import { assertTradeable, evaluateAndLock, type EnforceableAccount } from "@/domains/trading/services/risk-enforcement"
import { evaluateBudgetGuard } from "@/domains/analytics/risk/budget-guard"
import { deriveRiskPct } from "@/domains/trading/services/trade-derivation"
import { runRules } from "@/domains/rules/engine"
import { buildContext } from "@/domains/rules/context"
import { ensureTagRows } from "@/server/services/tags/seed"
import { evaluateRuledCommitmentsOnTrade } from "@/server/services/behavior/commitment-service"
import { isCacheEnabled, invalidateCache } from "@/domains/analytics/services/analytics-cache"
import { AppError } from "@/lib/errors/app-error"
import { serializeTrade, type SerializedTrade } from "./serializers"
import { scheduleEmbedding } from "./embedding-service"

export type CreateTradeInput = {
  accountId:        string
  setupId?:         string
  direction:        "LONG" | "SHORT"
  symbol:           string
  entry:            number
  stop:             number
  target:           number
  size:             number
  date:             string
  openTime:         string
  session:          "London" | "New York" | "Asia" | "London Close"
  tags:             string[]
  notes:            string
  screenshotUrls:   string[]
  pnl?:             number
  closePrice?:      number
  closeTime?:       string
  commission?:      number
  status:           "OPEN" | "CLOSED" | "CANCELLED"
  emotionBefore?:   "calm" | "anxious" | "excited" | "fearful" | "overconfident" | null
  confidenceRating?: number | null
  executionQuality?: number | null
  fomoFlag?:        boolean
  revengeFlag?:     boolean
  planNotes?:       string | null
  riskPct?:         number | null
  maeR?:            number | null
  mfeR?:            number | null
  regime?:          "trend" | "range" | "volatile" | null
}

export async function createTrade(prisma: PrismaClient, userId: string, input: CreateTradeInput): Promise<SerializedTrade> {
  // ── Account + risk-limit enforcement (HALLAZGO 1B) ─────────────────────
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: input.accountId, userId },
    select: {
      type:            true,
      locked:          true,
      lockReason:      true,
      ddDailyPct:      true,
      ddWeeklyPct:     true,
      ddMonthlyPct:    true,
      ddTotalPct:      true,
      ddModel:         true,
      maxTradesPerDay: true,
      allowedSymbols:  true,
      initialBalance:  true,
      enforceMode:     true,
    },
  })

  // 1) Risk-limit pre-trade guard (all account types). Throws ACCOUNT_LOCKED
  //    on an active lock; auto-reactivates an elapsed temporal lock.
  const enforceAccount: EnforceableAccount = {
    id:             input.accountId,
    type:           account.type,
    ddModel:        account.ddModel,
    ddDailyPct:     account.ddDailyPct   != null ? Number(account.ddDailyPct)   : null,
    ddWeeklyPct:    account.ddWeeklyPct  != null ? Number(account.ddWeeklyPct)  : null,
    ddMonthlyPct:   account.ddMonthlyPct != null ? Number(account.ddMonthlyPct) : null,
    ddTotalPct:     account.ddTotalPct   != null ? Number(account.ddTotalPct)   : null,
    initialBalance: Number(account.initialBalance),
    locked:         account.locked,
    lockReason:     account.lockReason,
    enforceMode:    account.enforceMode,
  }
  await assertTradeable(prisma, userId, enforceAccount, input.date)

  // 2) Setup must be selectable (HALLAZGO 2 — backend guard)
  if (input.setupId) {
    const setup = await prisma.setup.findUnique({
      where:  { id: input.setupId, userId },
      select: { status: true },
    })
    if (!setup) throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_FOUND" })
    if (setup.status === "PAUSADO" || setup.status === "DESCARTADO") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_AVAILABLE" })
    }
  }

  // 3) Prop-firm-only constraints: max trades/day + symbol allowlist
  if (account.type === "PROP_FIRM" || account.type === "DEMO_PROP") {
    const tradeDate = new Date(input.date)
    if (account.maxTradesPerDay != null) {
      const todayCount = await prisma.trade.count({
        where: { accountId: input.accountId, userId, date: tradeDate },
      })
      if (checkTradeCountLimit(todayCount, account.maxTradesPerDay)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_MAX_TRADES" })
      }
    }
    if (checkSymbolAllowlist(input.symbol, account.allowedSymbols as string[])) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_SYMBOL_NOT_ALLOWED" })
    }
  }

  // 3.5) Forward-looking daily-budget guard (A1, closure). The breach-lock
  //      (HALLAZGO 1B) is post-hoc; this blocks BEFORE a trade whose own risk
  //      would cross the room left to today's daily-loss floor.
  if (account.ddDailyPct != null) {
    const tradeDate = new Date(input.date)
    const [allAgg, todayAgg] = await Promise.all([
      prisma.trade.aggregate({ where: { accountId: input.accountId, userId, status: "CLOSED" }, _sum: { pnl: true } }),
      prisma.trade.aggregate({ where: { accountId: input.accountId, userId, status: "CLOSED", date: tradeDate }, _sum: { pnl: true } }),
    ])
    const initialBalance = Number(account.initialBalance)
    const totalPnl = Number(allAgg._sum.pnl ?? 0)
    const dayPnl = Number(todayAgg._sum.pnl ?? 0)
    const dayBase = initialBalance + (totalPnl - dayPnl)
    if (dayBase > 0) {
      const remainingPct = Number(account.ddDailyPct) / 100 + dayPnl / dayBase
      const tradeRiskPct = (deriveRiskPct({ entry: input.entry, stop: input.stop, size: input.size, balance: initialBalance + totalPnl }) ?? 0) / 100
      const guard = evaluateBudgetGuard({ remainingPct, tradeRiskPct, exhausted: remainingPct <= 0 })
      if (guard.block) throw new AppError("BUDGET_EXCEEDED", { detail: guard.message ?? "" })
    }
  }

  // 4) User automations — PRE-trade (may block the operation / mutate tags)
  const preRules = await runRules(prisma, userId, "TRADE_PRE_CREATE", () =>
    buildContext(prisma, userId, { id: input.accountId, initialBalance: Number(account.initialBalance) }, {
      symbol: input.symbol, direction: input.direction, session: input.session ?? null,
      setupId: input.setupId ?? null, size: input.size, entry: input.entry, stop: input.stop,
      tags: input.tags, date: input.date,
    }),
  )
  if (preRules.blocked) throw new AppError("RULE_BLOCKED", { detail: preRules.blockMessage ?? "" })
  const effectiveTags = (preRules.addTags.length || preRules.removeTags.length)
    ? [...new Set([...input.tags, ...preRules.addTags])].filter((t) => !preRules.removeTags.includes(t))
    : input.tags

  // riskPct fallback (#27, S2 DT-1): derive server-side when the client did not
  // send it (e.g. imports / API), so the column is never silently null.
  const riskPctValue =
    input.riskPct ??
    deriveRiskPct({ entry: input.entry, stop: input.stop, size: input.size, balance: Number(account.initialBalance) })

  const trade = await prisma.trade.create({
    data: { ...input, riskPct: riskPctValue, tags: effectiveTags, userId, date: new Date(input.date) },
    include: { account: true, setup: true, events: true },
  })

  // Keep the tag catalog in sync with any new tag names used here.
  if (effectiveTags.length) await ensureTagRows(prisma, userId, effectiveTags)

  // User automations — POST-trade (best-effort; never break the write).
  try {
    const postTrigger = trade.status === "CLOSED" ? "TRADE_CLOSED" : "TRADE_CREATED"
    const postRules = await runRules(prisma, userId, postTrigger, () =>
      buildContext(prisma, userId, { id: trade.accountId, initialBalance: Number(account.initialBalance) }, {
        symbol: trade.symbol, direction: trade.direction, session: trade.session as string | null,
        setupId: trade.setupId, size: Number(trade.size), entry: Number(trade.entry), stop: Number(trade.stop),
        tags: trade.tags as string[], date: input.date,
        pnl: trade.pnl != null ? Number(trade.pnl) : null,
        rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
      }),
    )
    if (postRules.addTags.length || postRules.removeTags.length) {
      const newTags = [...new Set([...(trade.tags as string[]), ...postRules.addTags])].filter((t) => !postRules.removeTags.includes(t))
      await prisma.trade.update({ where: { id: trade.id }, data: { tags: newTags } })
      if (postRules.addTags.length) await ensureTagRows(prisma, userId, postRules.addTags)
    }
  } catch (err) {
    console.warn("[rules] post-trade automations failed:", err instanceof Error ? err.message : err)
  }

  const openTimeSafe = input.openTime || "00:00"
  await prisma.tradeEvent.create({
    data: {
      userId,
      tradeId:   trade.id,
      type:      "OPEN",
      price:     input.entry,
      contracts: input.size,
      notes:     `${input.direction} · SL ${input.stop} · TP ${input.target}`,
      timestamp: new Date(`${input.date}T${openTimeSafe}:00`),
    },
  })

  // Post-trade: a trade registered already-closed can itself breach a limit
  // → auto-lock immediately (locked was just cleared/false by assertTradeable).
  if (input.status === "CLOSED" && input.pnl != null) {
    await evaluateAndLock(prisma, userId, { ...enforceAccount, locked: false, lockReason: "" }, input.date)
  }

  const full = await prisma.trade.findUniqueOrThrow({
    where:   { id: trade.id },
    include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
  })

  if (isCacheEnabled()) await invalidateCache(prisma, userId)
  scheduleEmbedding(prisma, userId, trade.id, input.notes ?? "")
  // Continuous eval of rule-backed commitments (S5, best-effort).
  await evaluateRuledCommitmentsOnTrade(prisma, userId).catch(() => {})
  return serializeTrade(full)
}

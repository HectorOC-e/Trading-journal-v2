// ─────────────────────────────────────────────────────────────────────────────
// Trade write service (TD-018) — the create/update/close/event/delete workflows
// moved out of the trades router. This is the I/O shell: guards (risk limits,
// prop-firm constraints, budget, rules engine), persistence and post-trade
// effects. Pure decisions stay in domains/ (risk-enforcement, budget-guard,
// trade-service math, rules engine). Errors (TRPCError/AppError) are thrown
// exactly as the router did — same codes, same messages.
// ─────────────────────────────────────────────────────────────────────────────
import { parseFxRates } from "@/lib/fx"
import { classifyAccountType } from "@/domains/trading/operational-mode"
import { localDateISO } from "@/lib/datetime/local"
import { TRPCError } from "@trpc/server"
import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { checkTradeCountLimit, checkSymbolAllowlist } from "@/domains/trading/services/prop-firm-guard"
import { assertTradeable, evaluateAndLock, type EnforceableAccount } from "@/domains/trading/services/risk-enforcement"
import { evaluateBudgetGuard } from "@/domains/analytics/risk/budget-guard"
import { loadRealizedPnlHistory } from "@/domains/trading/services/realized-history"
import { loadAccountCashAdjustments } from "@/server/services/accounts/cash-adjustments"
import { deriveRiskPct } from "@/domains/trading/services/trade-derivation"
import { runRules } from "@/domains/rules/engine"
import { buildContext } from "@/domains/rules/context"
import { ensureTagRows } from "@/server/services/tags/seed"
import { evaluateRuledCommitmentsOnTrade } from "@/server/services/behavior/commitment-service"
import { isCacheEnabled, invalidateCache } from "@/domains/analytics/services/analytics-cache"
import { AppError } from "@/lib/errors/app-error"
import { computeClosedTradePnl, computeScaleInAvgEntry, parsePointValue } from "@/domains/trading/services/trade-service"
import { evaluateChecklist } from "@/domains/trading/services/capture-rules"
import { runIntervention } from "@/server/services/intervention/intervention-service"
import { serializeTrade, type SerializedTrade } from "./serializers"
import { scheduleEmbedding } from "@/server/services/retrieval/pipeline"
import type { EmotionBefore } from "@/domains/trading/emotions"
import { isWithinEmotionWindow, EMOTION_BACKFILL_WINDOW_DAYS } from "@/domains/trading/services/emotion-provenance"
import { assertCaptureStatus, marketTimestamp, explicitMarketTimestamp, validateMarketSequence, emotionProvenance, type CaptureContext, type EmotionContext } from "@/domains/trading/historical-capture"
import { loadHistoricalEquity } from "./historical-equity-service"

/** La ventana la impone el SERVIDOR. La UI que esconde los chips es cortesía. */
function assertEmotionWindowOpen(tradeDate: Date, now: Date): void {
  if (!isWithinEmotionWindow(tradeDate, now)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `EMOTION_WINDOW_CLOSED:${EMOTION_BACKFILL_WINDOW_DAYS}`,
    })
  }
}

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
  emotionBefore?:   EmotionBefore | null
  confidenceRating?: number | null
  executionQuality?: number | null
  fomoFlag?:        boolean
  revengeFlag?:     boolean
  planNotes?:       string | null
  riskPct?:         number | null
  maeR?:            number | null
  mfeR?:            number | null
  regime?:          "trend" | "range" | "volatile" | null
  captureContext?: CaptureContext
  marketOpenedAt?: string
  marketClosedAt?: string
  marketTimeZone?: string
  closeDate?: string
  emotionContext?: EmotionContext
  emotionReferenceAt?: string
}

export async function createTrade(prisma: PrismaClient, userId: string, input: CreateTradeInput): Promise<SerializedTrade> {
  const captureContext = input.captureContext ?? "LIVE"
  const historical = captureContext === "HISTORICAL"
  assertCaptureStatus(captureContext, input.status)
  if (input.status === "OPEN" && input.pnl != null && input.pnl !== 0) throw new TRPCError({ code: "BAD_REQUEST", message: "OPEN_PNL_NOT_REALIZED" })
  // ── Account + risk-limit enforcement (HALLAZGO 1B) ─────────────────────
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: input.accountId, userId },
    select: {
      currency:        true,
      timezone:        true,
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
      status:          true,
    },
  })

  if (!historical && account.status && account.status !== "ACTIVE") throw new TRPCError({ code: "BAD_REQUEST", message: "ACCOUNT_NOT_AVAILABLE" })
  const marketTimeZone = input.marketTimeZone ?? account.timezone ?? "UTC"
  const operationalMode = classifyAccountType(account.type)
  const riskDate = localDateISO(new Date(), account.timezone ?? "UTC")
  const marketOpenedAt = input.marketOpenedAt ? explicitMarketTimestamp(input.marketOpenedAt) : marketTimestamp(input.date, input.openTime || "00:00", marketTimeZone)
  if (localDateISO(marketOpenedAt, marketTimeZone) !== input.date) throw new TRPCError({ code: "BAD_REQUEST", message: "MARKET_DATE_MISMATCH" })
  const marketClosedAt = input.marketClosedAt ? explicitMarketTimestamp(input.marketClosedAt)
    : input.closeTime ? marketTimestamp(input.closeDate ?? input.date, input.closeTime, marketTimeZone) : null
  if (historical && !marketClosedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "HISTORICAL_CLOSE_REQUIRED" })
  if (historical && input.pnl == null) throw new TRPCError({ code: "BAD_REQUEST", message: "HISTORICAL_PNL_REQUIRED" })
  validateMarketSequence(marketOpenedAt, marketClosedAt)

  // Account equity = initial balance + realised P&L. Resolved at most once, and
  // only when something actually needs it (today: the riskPct fallback below).
  const profile = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fxRates: true } })
  const cash = historical ? undefined : (await loadAccountCashAdjustments(prisma, userId, [{ id: input.accountId, currency: account.currency }], parseFxRates(profile.fxRates))).get(input.accountId)
  let equity: Promise<number> | null = null
  const accountEquity = () => (equity ??= prisma.trade
    .aggregate({ where: { accountId: input.accountId, userId, status: { in: ["OPEN", "CLOSED"] }, date: { lte: new Date(riskDate) } }, _sum: { pnl: true } })
    .then((agg) => Number(account.initialBalance) + Number(agg._sum.pnl ?? 0) + (cash?.correction ?? 0) - (cash?.paid ?? 0)))

  // Dollar value of one point for this instrument. Risk in money is meaningless
  // without it — the same lookup the close path already does for P&L. Resolved
  // at most once; defaults to 1 when the symbol is not in the user's catalog.
  let pv: Promise<number> | null = null
  const pointValue = () => (pv ??= prisma.market
    .findFirst({ where: { userId, symbol: input.symbol }, select: { pointValue: true } })
    .then((m) => parsePointValue(m?.pointValue)))

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
  if (!historical) await assertTradeable(prisma, userId, enforceAccount, riskDate)

  // 2) Setup must be selectable (HALLAZGO 2 — backend guard)
  if (input.setupId) {
    const setup = await prisma.setup.findUnique({
      where:  { id: input.setupId, userId },
      select: { status: true },
    })
    if (!setup) throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_FOUND" })
    if (!historical && (setup.status === "PAUSADO" || setup.status === "DESCARTADO")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_AVAILABLE" })
    }
  }

  // 3) Prop-firm-only constraints: max trades/day + symbol allowlist
  if (!historical && (account.type === "PROP_FIRM" || account.type === "DEMO_PROP")) {
    const tradeDate = new Date(riskDate)
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
  if (!historical && account.ddDailyPct != null) {
    const tradeDate = new Date(riskDate)
    const history = await loadRealizedPnlHistory(prisma, userId, [input.accountId])
    const initialBalance = Number(account.initialBalance)
    const priorPnl = history.filter(row => row.date < tradeDate).reduce((sum, row) => sum + row.pnl, 0)
    const dayPnl = history.filter(row => row.date.toISOString().slice(0,10) === riskDate).reduce((sum, row) => sum + row.pnl, 0)
    const dayBase = initialBalance + priorPnl
    if (dayBase > 0) {
      const remainingPct = Number(account.ddDailyPct) / 100 + dayPnl / dayBase
      const tradeRiskPct = Math.abs(input.entry - input.stop) * input.size * await pointValue() / dayBase
      const guard = evaluateBudgetGuard({ remainingPct, tradeRiskPct, exhausted: remainingPct <= 0 })
      if (guard.block) throw new AppError("BUDGET_EXCEEDED", { detail: guard.message ?? "" })
    }
  }

  // 4) User automations — PRE-trade (may block the operation / mutate tags)
  const preRules = historical || operationalMode == null || operationalMode === "INTERNAL" ? { blocked: false, blockMessage: null, addTags: [] as string[], removeTags: [] as string[] } : await runRules(prisma, userId, "TRADE_PRE_CREATE", async () =>
    buildContext(prisma, userId, { id: input.accountId, initialBalance: Number(account.initialBalance) }, {
      symbol: input.symbol, direction: input.direction, session: input.session ?? null,
      setupId: input.setupId ?? null, size: input.size, entry: input.entry, stop: input.stop,
      tags: input.tags, date: input.date, pointValue: await pointValue(),
    }), operationalMode,
  )
  if (preRules.blocked) throw new AppError("RULE_BLOCKED", { detail: preRules.blockMessage ?? "" })
  const effectiveTags = (preRules.addTags.length || preRules.removeTags.length)
    ? [...new Set([...input.tags, ...preRules.addTags])].filter((t) => !preRules.removeTags.includes(t))
    : input.tags

  // riskPct fallback (#27, S2 DT-1): derive server-side when the client did not
  // send it (e.g. imports / API), so the column is never silently null.
  //
  // Measured against EQUITY, the same basis the daily-budget guard above uses.
  // Deriving against `initialBalance` alone returns null on every account whose
  // initial balance was never set (0) — which is how `risk_pct` ended up null on
  // 53 of 53 trades in production, silently disabling `verifyOversizedTrades`:
  // it skips null rows, so it reported zero offenders no matter how the user
  // traded, and a "stop oversizing" commitment always verified as met.
  const historicalBalance = historical ? await loadHistoricalEquity(prisma, userId, { accountId: input.accountId, asOf: marketOpenedAt, fxRates: parseFxRates(profile.fxRates) }) : null
  const riskPctValue = historical ? (historicalBalance == null ? null : deriveRiskPct({ entry: input.entry, stop: input.stop, size: input.size, pointValue: await pointValue(), balance: historicalBalance })) :
    input.riskPct ??
    deriveRiskPct({
      entry: input.entry, stop: input.stop, size: input.size,
      pointValue: await pointValue(),
      balance: await accountEquity(),
    })

  const storedInput = { ...input }
  delete storedInput.closeDate
  delete storedInput.marketOpenedAt
  delete storedInput.marketClosedAt
  delete storedInput.emotionReferenceAt
  delete storedInput.emotionContext
  const emotionData = input.emotionBefore != null ? emotionProvenance({
    referenceAt: input.emotionContext === "PRACTICE" ? (input.emotionReferenceAt ? explicitMarketTimestamp(input.emotionReferenceAt) : (() => { throw new TRPCError({ code: "BAD_REQUEST", message: "EMOTION_PRACTICE_REFERENCE_REQUIRED" }) })()) : marketOpenedAt,
    context: input.emotionContext ?? "MARKET", mode: classifyAccountType(account.type), now: new Date(),
  }) : { emotionSource: null }
  const trade = await prisma.trade.create({
    data: {
      ...storedInput, operationalMode: classifyAccountType(account.type), riskPct: riskPctValue, tags: effectiveTags, userId, date: new Date(input.date),
      captureContext, marketOpenedAt, marketClosedAt, marketTimeZone,
      realizedPnl: 0, originalSize: input.size,
      originalRiskMoney: Math.abs(input.entry - input.stop) * input.size * await pointValue(),
      // Activity time determines provenance, independently of the registration time.
      ...emotionData,
      events: { create: { userId, type: "OPEN", price: input.entry, contracts: input.size, notes: `${input.direction} · SL ${input.stop} · TP ${input.target}`, timestamp: marketOpenedAt } },
    },
    include: { account: true, setup: true, events: true },
  })

  // Keep the tag catalog in sync with any new tag names used here.
  if (effectiveTags.length) await ensureTagRows(prisma, userId, effectiveTags)

  // User automations — POST-trade (best-effort; never break the write).
  try {
    const postTrigger = trade.status === "CLOSED" ? "TRADE_CLOSED" : "TRADE_CREATED"
    const postRules = operationalMode == null || operationalMode === "INTERNAL" ? { addTags: [] as string[], removeTags: [] as string[] } : await runRules(prisma, userId, postTrigger, async () =>
      buildContext(prisma, userId, { id: trade.accountId, initialBalance: Number(account.initialBalance) }, {
        symbol: trade.symbol, direction: trade.direction, session: trade.session as string | null,
        setupId: trade.setupId, size: Number(trade.size), entry: Number(trade.entry), stop: Number(trade.stop),
        tags: trade.tags as string[], date: input.date, pointValue: await pointValue(),
        pnl: trade.pnl != null ? Number(trade.pnl) : null,
        rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
      }), operationalMode,
    )
    if (postRules.addTags.length || postRules.removeTags.length) {
      const newTags = [...new Set([...(trade.tags as string[]), ...postRules.addTags])].filter((t) => !postRules.removeTags.includes(t))
      await prisma.trade.update({ where: { id: trade.id }, data: { tags: newTags } })
      if (postRules.addTags.length) await ensureTagRows(prisma, userId, postRules.addTags)
    }
  } catch (err) {
    console.warn("[rules] post-trade automations failed:", err instanceof Error ? err.message : err)
  }

  // Post-trade: a trade registered already-closed can itself breach a limit
  // → auto-lock immediately (locked was just cleared/false by assertTradeable).
  if (input.status === "CLOSED" && input.pnl != null && !(historical && account.locked)) {
    await evaluateAndLock(prisma, userId, { ...enforceAccount, locked: false, lockReason: "" }, riskDate)
  }

  const full = await prisma.trade.findUniqueOrThrow({
    where:   { id: trade.id },
    include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
  })

  if (isCacheEnabled()) await invalidateCache(prisma, userId)
  scheduleEmbedding(prisma, userId, "trade_notes", trade.id, input.notes ?? "")
  scheduleEmbedding(prisma, userId, "trade_plans", trade.id, input.planNotes ?? "")
  // Continuous eval of rule-backed commitments (S5, best-effort).
  await evaluateRuledCommitmentsOnTrade(prisma, userId, { accountId: trade.accountId, tradeId: trade.id }).catch(() => {})
  return serializeTrade(full)
}

export type UpdateTradeInput = {
  id:                string
  notes?:            string
  tags?:             string[]
  pnl?:              number
  rMultiple?:        number
  screenshotUrls?:   string[]
  entry?:            number
  stop?:             number
  target?:           number
  size?:             number
  session?:          string
  setupId?:          string | null
  emotionBefore?:    "calm" | "anxious" | "excited" | "fearful" | "overconfident" | null
  confidenceRating?: number | null
  executionQuality?: number | null
  fomoFlag?:         boolean
  revengeFlag?:      boolean
  planNotes?:        string | null
  maeR?:             number | null
  mfeR?:             number | null
  regime?:           "trend" | "range" | "volatile" | null
  date?: string
  openTime?: string
  marketOpenedAt?: string
  marketClosedAt?: string
  marketTimeZone?: string
  eventTimestamps?: { id: string; timestamp: string }[]
  emotionContext?: EmotionContext
  emotionReferenceAt?: string
}

export async function updateTrade(prisma: PrismaClient, userId: string, input: UpdateTradeInput): Promise<SerializedTrade> {
  const { id, ...rest } = input
  // El spread ciego no deja interceptar nada: la emoción se extrae para que la
  // regla de procedencia y la ventana no dependan de quién llame.
  const { emotionBefore, date, openTime, marketOpenedAt, marketClosedAt, marketTimeZone, eventTimestamps, emotionContext, emotionReferenceAt, ...data } = rest
  const temporalEdit = date !== undefined || openTime !== undefined || marketOpenedAt !== undefined || marketClosedAt !== undefined || marketTimeZone !== undefined || eventTimestamps !== undefined
  let emotionData: Prisma.TradeUncheckedUpdateInput = {}
  if (emotionBefore !== undefined) {
    const current = await prisma.trade.findUniqueOrThrow({ where: { id, userId } })
    const context = emotionContext ?? (current.emotionContext === "PRACTICE" ? "PRACTICE" : "MARKET")
    const referenceAt = context === "PRACTICE" ? (emotionReferenceAt ? explicitMarketTimestamp(emotionReferenceAt) : current.emotionReferenceAt) : current.marketOpenedAt ?? current.date
    if (!referenceAt) throw new TRPCError({ code: "BAD_REQUEST", message: "EMOTION_PRACTICE_REFERENCE_REQUIRED" })
    emotionData = emotionBefore == null ? { emotionBefore: null, emotionSource: null, emotionRecordedAt: null, emotionReferenceAt: null, emotionContext: null } : {
      emotionBefore, ...emotionProvenance({ referenceAt, context, mode: current.operationalMode as ReturnType<typeof classifyAccountType>, now: new Date(), correction: true }),
    }
  }

  const write = async (db: Pick<PrismaClient, "trade">, snapshots: Prisma.TradeUncheckedUpdateInput = {}) => db.trade.update({
    where: { id, userId },
    data: {
      ...data, ...snapshots, ...emotionData,
      // Toda escritura posterior al momento es reconstrucción — incluida la
      // corrección de una emoción ya registrada: no hay forma de distinguir
      // "me equivoqué de chip" de un recuerdo revisado a la luz del resultado.
    },
    include: { account: true, setup: true, events: true },
  })
  const monetaryEdit = input.pnl !== undefined || input.rMultiple !== undefined || input.entry !== undefined || input.stop !== undefined || input.size !== undefined
  const trade = monetaryEdit || temporalEdit ? await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = (SELECT account_id FROM trades WHERE id = ${id}::uuid AND user_id = ${userId}::uuid) AND user_id = ${userId}::uuid FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM trades WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
    const current = await tx.trade.findUniqueOrThrow({ where: { id, userId }, include: { events: true, account: true } })
    if (monetaryEdit && current.events.some(e => e.type === "PARTIAL_CLOSE" || e.type === "SCALE_IN")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "PARTIAL_ACCOUNTING_EDIT" })
    }
    if (current.status === "OPEN" && input.pnl !== undefined) throw new TRPCError({ code: "BAD_REQUEST", message: "OPEN_PNL_NOT_REALIZED" })
    if (current.status === "OPEN") assertKnownHistory(current)
    const snapshots: Prisma.TradeUncheckedUpdateInput = {}
    const basisEdit = input.entry !== undefined || input.stop !== undefined || input.size !== undefined
    const managed = current.events.some(e => e.type === "STOP_MOVE" || e.type === "TRAIL_STOP")
    if (monetaryEdit && (current.originalRiskMoney == null || (basisEdit && !managed))) {
      const market = await tx.market.findFirst({ where: { userId, symbol: current.symbol }, select: { pointValue: true } })
      snapshots.originalRiskMoney = Math.abs(Number(input.entry ?? current.entry) - Number(input.stop ?? current.stop)) * Number(input.size ?? current.size) * parsePointValue(market?.pointValue)
      snapshots.originalSize = Number(input.size ?? current.size)
      snapshots.realizedPnl = 0
    }
    if (temporalEdit) {
      const zone = marketTimeZone ?? current.marketTimeZone ?? current.account?.timezone ?? "UTC"
      const marketDate = date ?? current.date.toISOString().slice(0, 10)
      const openedAt = marketOpenedAt ? explicitMarketTimestamp(marketOpenedAt) : marketTimestamp(marketDate, openTime ?? current.openTime, zone)
      if (localDateISO(openedAt, zone) !== marketDate) throw new TRPCError({ code: "BAD_REQUEST", message: "MARKET_DATE_MISMATCH" })
      const closedAt = marketClosedAt ? explicitMarketTimestamp(marketClosedAt) : current.marketClosedAt
      const replacements = new Map((eventTimestamps ?? []).map(event => [event.id, explicitMarketTimestamp(event.timestamp)]))
      if (replacements.size !== (eventTimestamps?.length ?? 0) || [...replacements.keys()].some(eventId => !current.events.some(event => event.id === eventId))) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_EVENT_CORRECTION" })
      const eventTimes = current.events.filter(event => event.type !== "NOTE").map(event => event.type === "OPEN" ? openedAt : event.type === "CLOSE" && closedAt ? closedAt : replacements.get(event.id) ?? event.timestamp)
      validateMarketSequence(openedAt, closedAt ?? null, eventTimes)
      const before = { date: current.date, openedAt: current.marketOpenedAt, closedAt: current.marketClosedAt, timeZone: current.marketTimeZone, events: current.events.filter(event => replacements.has(event.id)).map(event => ({ id: event.id, timestamp: event.timestamp })) }
      for (const event of current.events) {
        const timestamp = event.type === "OPEN" ? openedAt : event.type === "CLOSE" && closedAt ? closedAt : replacements.get(event.id)
        if (timestamp) await tx.tradeEvent.update({ where: { id: event.id, userId, tradeId: id }, data: { timestamp } })
      }
      snapshots.date = new Date(marketDate)
      snapshots.openTime = openTime ?? current.openTime
      snapshots.marketOpenedAt = openedAt
      snapshots.marketClosedAt = closedAt
      snapshots.marketTimeZone = zone
      if (closedAt) snapshots.closeTime = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(closedAt)
      if (emotionBefore != null && (emotionContext ?? current.emotionContext) !== "PRACTICE") emotionData.emotionReferenceAt = openedAt
      if (current.captureContext === "HISTORICAL") {
        const balance = await loadHistoricalEquity(tx, userId, { accountId: current.accountId, asOf: openedAt, excludeTradeId: id })
        const market = await tx.market.findFirst({ where: { userId, symbol: current.symbol }, select: { pointValue: true } })
        snapshots.riskPct = balance == null ? null : deriveRiskPct({ entry: Number(current.entry), stop: Number(current.stop), size: Number(current.originalSize ?? current.size), pointValue: parsePointValue(market?.pointValue), balance })
      }
      if (emotionBefore == null && current.emotionContext !== "PRACTICE" && current.emotionBefore) {
        snapshots.emotionReferenceAt = openedAt
        snapshots.emotionSource = "reconstructed"
      }
      await tx.tradeEvent.create({ data: { userId, tradeId: id, type: "NOTE", timestamp: new Date(), notes: JSON.stringify({ kind: "MARKET_TIME_CORRECTION", before, after: { date: marketDate, openedAt, closedAt, timeZone: zone, events: eventTimestamps ?? [] } }) } })
    }
    return write(tx, snapshots)
  }) : await write(prisma)

  if (input.tags?.length) await ensureTagRows(prisma, userId, input.tags)

  // User automations — post-update (best-effort; never break the write).
  try {
    const postTrigger = trade.status === "CLOSED" ? "TRADE_CLOSED" : "TRADE_UPDATED"
    const dateStr = (trade.date as Date).toISOString().slice(0, 10)
    const operationalMode = classifyAccountType(trade.account.type)
    const postRules = operationalMode == null || operationalMode === "INTERNAL" ? { addTags: [] as string[], removeTags: [] as string[] } : await runRules(prisma, userId, postTrigger, async () =>
      buildContext(prisma, userId, { id: trade.accountId, initialBalance: Number(trade.account.initialBalance) }, {
        symbol: trade.symbol, direction: trade.direction, session: trade.session as string | null,
        setupId: trade.setupId, size: Number(trade.size), entry: Number(trade.entry), stop: Number(trade.stop),
        tags: trade.tags as string[], date: dateStr,
        pointValue: parsePointValue(
          (await prisma.market.findFirst({ where: { userId, symbol: trade.symbol }, select: { pointValue: true } }))?.pointValue,
        ),
        pnl: trade.pnl != null ? Number(trade.pnl) : null,
        rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
      }), operationalMode,
    )
    if (postRules.addTags.length || postRules.removeTags.length) {
      const newTags = [...new Set([...(trade.tags as string[]), ...postRules.addTags])].filter((t) => !postRules.removeTags.includes(t))
      await prisma.trade.update({ where: { id: trade.id }, data: { tags: newTags } })
      if (postRules.addTags.length) await ensureTagRows(prisma, userId, postRules.addTags)
    }
  } catch (err) {
    console.warn("[rules] post-update automations failed:", err instanceof Error ? err.message : err)
  }

  // Editing realized P&L can push the account over a limit → re-evaluate lock.
  if (input.pnl !== undefined || temporalEdit) {
    const a = trade.account
    if (!(trade.captureContext === "HISTORICAL" && a.locked)) await evaluateAndLock(prisma, userId, {
      id:             a.id,
      type:           a.type,
      ddModel:        a.ddModel,
      ddDailyPct:     a.ddDailyPct   != null ? Number(a.ddDailyPct)   : null,
      ddWeeklyPct:    a.ddWeeklyPct  != null ? Number(a.ddWeeklyPct)  : null,
      ddMonthlyPct:   a.ddMonthlyPct != null ? Number(a.ddMonthlyPct) : null,
      ddTotalPct:     a.ddTotalPct   != null ? Number(a.ddTotalPct)   : null,
      initialBalance: Number(a.initialBalance),
      locked:         a.locked,
      lockReason:     a.lockReason,
    }, localDateISO(new Date(), a.timezone ?? "UTC"))
    if (isCacheEnabled()) await invalidateCache(prisma, userId)
  }
  if (input.notes !== undefined) scheduleEmbedding(prisma, userId, "trade_notes", trade.id, input.notes ?? "")
  if (input.planNotes !== undefined) scheduleEmbedding(prisma, userId, "trade_plans", trade.id, input.planNotes ?? "")
  await evaluateRuledCommitmentsOnTrade(prisma, userId, { accountId: trade.accountId, tradeId: trade.id }).catch(() => {})
  return serializeTrade(trade)
}

export type CloseTradeInput = {
  id:         string
  closePrice: number
  closeTime?: string
  commission: number
  maeR?:      number | null
  mfeR?:      number | null
  regime?:    "trend" | "range" | "volatile" | null
  emotionBefore?: EmotionBefore | null
  captureContext?: CaptureContext
  marketClosedAt?: string
  closeDate?: string
}

export async function closeTrade(prisma: PrismaClient, userId: string, input: CloseTradeInput) {
  const { trade, updated } = await prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM accounts WHERE id = (SELECT account_id FROM trades WHERE id = ${input.id}::uuid AND user_id = ${userId}::uuid) AND user_id = ${userId}::uuid FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM trades WHERE id = ${input.id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
  const trade = await tx.trade.findUniqueOrThrow({ where: { id: input.id, userId }, include: { events: true, account: true } })
  assertOpenTrade(trade.status)
  assertPositive(input.closePrice)
  if (!Number.isFinite(input.commission) || input.commission < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_COMMISSION" })
  assertKnownHistory(trade)
  const historical = input.captureContext === "HISTORICAL" || trade.captureContext === "HISTORICAL"
  const closedAt = input.marketClosedAt ? explicitMarketTimestamp(input.marketClosedAt)
    : input.closeDate && input.closeTime ? marketTimestamp(input.closeDate, input.closeTime, trade.marketTimeZone ?? trade.account?.timezone ?? "UTC")
      : historical ? null : trade.marketOpenedAt ? new Date() : null
  if (historical && !closedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "HISTORICAL_CLOSE_REQUIRED" })
  if (trade.marketOpenedAt && closedAt) validateMarketSequence(trade.marketOpenedAt, closedAt, trade.events.filter(event => event.type !== "NOTE").map(event => event.timestamp))
  const entry               = Number(trade.entry)
  const size                = Number(trade.size)
  // Dollar P&L needs the instrument's point value (e.g. NQ = $20/pt); without
  // it, futures/FX P&L is wrong by that factor. Look it up from the user's
  // market catalog by symbol; default to 1 when no market is registered.
  const market              = await tx.market.findFirst({
    where:  { userId, symbol: trade.symbol },
    select: { pointValue: true },
  })
  const pointValue          = parsePointValue(market?.pointValue)
  const portion = computeClosedTradePnl(trade.direction as "LONG" | "SHORT", entry, input.closePrice, size, input.commission, pointValue)
  const rawPnl = Number(trade.realizedPnl ?? 0) + portion.rawPnl
  // Zero is also the existing close-form default: retain an already booked charge.
  // A positive close commission supplies the cumulative trade total.
  const commission = input.commission > 0 ? input.commission : Number(trade.commission ?? 0)
  const netPnl = rawPnl - commission
  const risk = trade.originalRiskMoney != null ? Number(trade.originalRiskMoney) : Math.abs(entry - Number(trade.stop)) * size * pointValue
  const rMultiple = risk > 0 ? rawPnl / risk : null

  const updated = await tx.trade.update({
    where:   { id: input.id, userId },
    data:    {
      realizedPnl: rawPnl, originalRiskMoney: risk, originalSize: trade.originalSize ?? size,
      status: "CLOSED", closePrice: input.closePrice, closeTime: input.closeTime, commission, pnl: netPnl, rMultiple,
      ...(closedAt ? { marketClosedAt: closedAt } : {}),
      ...(historical ? { captureContext: "HISTORICAL" } : {}),
      // Capture v3 (S2): persist excursions/regime only when provided (don't clobber with null).
      ...(input.maeR != null ? { maeR: input.maeR } : {}),
      ...(input.mfeR != null ? { mfeR: input.mfeR } : {}),
      ...(input.regime != null ? { regime: input.regime } : {}),
      // S2/OI-2: el cierre no revela nada nuevo sobre el estado con el que se
      // ENTRÓ, así que nunca puede pisar una emoción ya registrada al abrir.
      // El comentario prometía esto desde S2; el código sólo miraba el input.
      // Como consecuencia, si escribe, siempre es primera escritura ⇒ capturada.
      ...(input.emotionBefore != null && trade.emotionBefore == null
        ? { emotionBefore: input.emotionBefore, ...emotionProvenance({ referenceAt: trade.emotionContext === "PRACTICE" && trade.emotionReferenceAt ? trade.emotionReferenceAt : trade.marketOpenedAt ?? trade.date, context: trade.emotionContext === "PRACTICE" ? "PRACTICE" : "MARKET", mode: trade.operationalMode as ReturnType<typeof classifyAccountType>, now: new Date() }) }
        : {}),
    },
    include: { account: true, setup: true, events: true },
  })

  return { trade, updated }
  })

  // ── Post-trade risk evaluation (all account types) ────────────────────
  // Closing a trade realizes P&L that may breach any limit. Temporal limits
  // lock until their period rolls over; total drawdown locks permanently.
  const acct = await prisma.account.findUnique({
    where:  { id: trade.accountId },
    select: {
      type: true, ddModel: true, timezone: true,
      ddDailyPct: true, ddWeeklyPct: true, ddMonthlyPct: true, ddTotalPct: true,
      initialBalance: true, locked: true, lockReason: true,
    },
  })
  let breach: Awaited<ReturnType<typeof evaluateAndLock>> = null
  if (acct && !(updated.captureContext === "HISTORICAL" && acct.locked)) {
    breach = await evaluateAndLock(prisma, userId, {
      id:             trade.accountId,
      type:           acct.type,
      ddModel:        acct.ddModel,
      ddDailyPct:     acct.ddDailyPct   != null ? Number(acct.ddDailyPct)   : null,
      ddWeeklyPct:    acct.ddWeeklyPct  != null ? Number(acct.ddWeeklyPct)  : null,
      ddMonthlyPct:   acct.ddMonthlyPct != null ? Number(acct.ddMonthlyPct) : null,
      ddTotalPct:     acct.ddTotalPct   != null ? Number(acct.ddTotalPct)   : null,
      initialBalance: Number(acct.initialBalance),
      locked:         acct.locked,
      lockReason:     acct.lockReason,
    }, localDateISO(new Date(), acct.timezone ?? "UTC"))
  }

  if (isCacheEnabled()) await invalidateCache(prisma, userId)
  // Continuous eval of rule-backed commitments (S5, best-effort).
  await evaluateRuledCommitmentsOnTrade(prisma, userId, { accountId: trade.accountId, tradeId: trade.id }).catch(() => {})
  // S7 fast-path: realize losses → run the intervention engine (best-effort, ≤2s).
  // The row is persisted here; the client reads it via intervention.active.
  if (updated.captureContext === "LIVE") {
    await runIntervention(prisma, userId, trade.accountId, localDateISO(new Date(), acct?.timezone ?? trade.account?.timezone ?? "UTC")).catch(() => {})
  }
  return { trade: serializeTrade(updated), accountLocked: breach != null, lockReason: breach?.reason ?? null }
}

export type AddTradeEventInput = {
  tradeId:    string
  type:       "STOP_MOVE" | "TRAIL_STOP" | "TAKE_PROFIT_MOVE" | "PARTIAL_CLOSE" | "SCALE_IN" | "NOTE"
  price?:     number
  contracts?: number
  notes:      string
  timestamp?: string
}

function assertOpenTrade(status: string) {
  if (status !== "OPEN") throw new TRPCError({ code: "BAD_REQUEST", message: "TRADE_NOT_OPEN" })
}
function assertPositive(value: number | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_TRADE_EVENT_VALUE" })
}
function assertKnownHistory(trade: { realizedPnl: unknown; pnl?: unknown; events?: { type: string }[] }) {
  if (trade.realizedPnl == null && (Number(trade.pnl ?? 0) !== 0 || trade.events?.some(e => e.type === "PARTIAL_CLOSE" || e.type === "SCALE_IN"))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "PARTIAL_HISTORY_REQUIRES_REVIEW" })
  }
}

export async function addTradeEvent(prisma: PrismaClient, userId: string, input: AddTradeEventInput) {
  const { event, trade, realized } = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM accounts WHERE id = (SELECT account_id FROM trades WHERE id = ${input.tradeId}::uuid AND user_id = ${userId}::uuid) AND user_id = ${userId}::uuid FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM trades WHERE id = ${input.tradeId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
    const trade = await tx.trade.findUniqueOrThrow({ where: { id: input.tradeId, userId }, include: { account: true, events: true } })
    const historical = trade.captureContext === "HISTORICAL"
    if (historical && input.type !== "NOTE" && !input.timestamp) throw new TRPCError({ code: "BAD_REQUEST", message: "HISTORICAL_EVENT_TIME_REQUIRED" })
    const timestamp = input.timestamp ? explicitMarketTimestamp(input.timestamp) : new Date()
    if (!Number.isFinite(timestamp.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_EVENT_TIMESTAMP" })
    if (input.type !== "NOTE" && trade.marketOpenedAt) validateMarketSequence(trade.marketOpenedAt, trade.marketClosedAt, [timestamp])
    if (historical && input.type !== "NOTE") {
      if (trade.status !== "CLOSED" || input.type !== "PARTIAL_CLOSE") throw new TRPCError({ code: "BAD_REQUEST", message: "HISTORICAL_EVENT_REQUIRES_REVIEW" })
      assertPositive(input.price)
      assertPositive(input.contracts)
      const alreadyClosed = trade.events.filter(event => event.type === "PARTIAL_CLOSE").reduce((sum, event) => sum + Number(event.contracts ?? 0), 0)
      if (alreadyClosed + input.contracts! > Number(trade.originalSize ?? trade.size)) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_PARTIAL_SIZE" })
      const market = await tx.market.findFirst({ where: { userId, symbol: trade.symbol }, select: { pointValue: true } })
      const realizedPnl = computeClosedTradePnl(trade.direction as "LONG" | "SHORT", Number(trade.entry), input.price!, input.contracts!, 0, parsePointValue(market?.pointValue)).rawPnl
      const event = await tx.tradeEvent.create({ data: { userId, tradeId: input.tradeId, type: input.type, price: input.price, contracts: input.contracts, notes: input.notes, timestamp, realizedPnl } })
      return { event, trade, realized: true }
    }
    if (input.type !== "NOTE") assertOpenTrade(trade.status)
    const data: Record<string, unknown> = {}
    let realizedPnl: number | undefined
    const financial = input.type === "PARTIAL_CLOSE" || input.type === "SCALE_IN"
    if (input.type !== "NOTE") {
      assertPositive(input.price)
      assertKnownHistory(trade)
      const market = await tx.market.findFirst({ where: { userId, symbol: trade.symbol }, select: { pointValue: true } })
      const pv = parsePointValue(market?.pointValue)
      const risk = trade.originalRiskMoney != null ? Number(trade.originalRiskMoney) : Math.abs(Number(trade.entry) - Number(trade.stop)) * Number(trade.size) * pv
      data.originalRiskMoney = risk
      data.originalSize = trade.originalSize ?? Number(trade.size)
      data.realizedPnl = Number(trade.realizedPnl ?? 0)
      if (financial) assertPositive(input.contracts)
      if (input.type === "STOP_MOVE" || input.type === "TRAIL_STOP") data.stop = input.price
      if (input.type === "TAKE_PROFIT_MOVE") data.target = input.price
      if (input.type === "SCALE_IN") {
        const a = trade.account
        if (a.status && a.status !== "ACTIVE") throw new TRPCError({ code: "BAD_REQUEST", message: "ACCOUNT_NOT_AVAILABLE" })
        // Live exposure checks cannot be shifted by a journal event timestamp.
        const date = localDateISO(new Date(), a.timezone ?? "UTC")
        await assertTradeable(tx as PrismaClient, userId, {
          id: trade.accountId, type: a.type, ddModel: a.ddModel,
          initialBalance: Number(a.initialBalance), locked: a.locked, lockReason: a.lockReason, enforceMode: a.enforceMode,
          ddDailyPct: a.ddDailyPct == null ? null : Number(a.ddDailyPct),
          ddWeeklyPct: a.ddWeeklyPct == null ? null : Number(a.ddWeeklyPct),
          ddMonthlyPct: a.ddMonthlyPct == null ? null : Number(a.ddMonthlyPct),
          ddTotalPct: a.ddTotalPct == null ? null : Number(a.ddTotalPct),
        }, date)
        if (a.ddDailyPct != null) {
          const history = await loadRealizedPnlHistory(tx, userId, [trade.accountId])
          const dayBase = Number(a.initialBalance) + history.filter(r => r.date.toISOString().slice(0,10) < date).reduce((sum,r) => sum + r.pnl,0)
          const dayPnl = history.filter(r => r.date.toISOString().slice(0,10) === date).reduce((sum,r) => sum + r.pnl,0)
          if (dayBase > 0) {
            const remainingPct = Number(a.ddDailyPct) / 100 + dayPnl / dayBase
            const tradeRiskPct = Math.abs(input.price! - Number(trade.stop)) * input.contracts! * pv / dayBase
            const guard = evaluateBudgetGuard({remainingPct, tradeRiskPct, exhausted: remainingPct <= 0})
            if (guard.block) throw new AppError("BUDGET_EXCEEDED", { detail: guard.message ?? "" })
          }
        }
        data.entry = computeScaleInAvgEntry(Number(trade.entry), Number(trade.size), input.price!, input.contracts!)
        data.size = Number(trade.size) + input.contracts!
        // Added exposure adds risk at its entry; subsequent stop moves cannot rewrite prior risk.
        data.originalRiskMoney = risk + Math.abs(input.price! - Number(trade.stop)) * input.contracts! * pv
        data.originalSize = Number(data.originalSize) + input.contracts!
      }
      if (input.type === "PARTIAL_CLOSE") {
        if (input.contracts! > Number(trade.size)) throw new TRPCError({ code: "BAD_REQUEST", message: "INVALID_PARTIAL_SIZE" })
        const gross = Number(trade.realizedPnl ?? 0) + computeClosedTradePnl(trade.direction as "LONG" | "SHORT", Number(trade.entry), input.price!, input.contracts!, 0, pv).rawPnl
        data.size = Number(trade.size) - input.contracts!
        data.realizedPnl = gross
        // commission is the cumulative trade charge, deducted once from cumulative gross.
        data.pnl = gross - Number(trade.commission ?? 0)
        realizedPnl = Number(data.pnl) - Number(trade.pnl ?? 0)
        data.rMultiple = risk > 0 ? gross / risk : null
        if (data.size === 0) { data.status = "CLOSED"; data.closePrice = input.price; data.marketClosedAt = timestamp }
      }
    }
    if (Object.keys(data).length) await tx.trade.update({ where: { id: input.tradeId, userId }, data })
    const event = await tx.tradeEvent.create({ data: { userId, tradeId: input.tradeId, type: input.type, price: input.price, contracts: input.contracts, notes: input.notes, timestamp, realizedPnl } })
    return { event, trade, realized: input.type === "PARTIAL_CLOSE" }
  })
  if (realized) {
    const a = trade.account
    if (a && !(trade.captureContext === "HISTORICAL" && a.locked)) await evaluateAndLock(prisma, userId, { id: trade.accountId, type: a.type, ddModel: a.ddModel, initialBalance: Number(a.initialBalance), locked: a.locked, lockReason: a.lockReason,
      ddDailyPct: a.ddDailyPct == null ? null : Number(a.ddDailyPct), ddWeeklyPct: a.ddWeeklyPct == null ? null : Number(a.ddWeeklyPct), ddMonthlyPct: a.ddMonthlyPct == null ? null : Number(a.ddMonthlyPct), ddTotalPct: a.ddTotalPct == null ? null : Number(a.ddTotalPct) }, localDateISO(new Date(), a.timezone ?? "UTC"))
    if (isCacheEnabled()) await invalidateCache(prisma, userId)
    await evaluateRuledCommitmentsOnTrade(prisma, userId, { accountId: trade.accountId, tradeId: trade.id }).catch(() => {})
    if (trade.captureContext === "LIVE") {
      await runIntervention(prisma, userId, trade.accountId, localDateISO(new Date(), a.timezone ?? "UTC")).catch(() => {})
    }
  }
  scheduleEmbedding(prisma, userId, "trade_events", event.id, input.notes ?? "")
  return event
}

type SupabaseServer = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>

export async function deleteTrade(prisma: PrismaClient, supabase: SupabaseServer, userId: string, id: string) {
  // Fetch first to get screenshot URLs for storage cleanup
  const trade = await prisma.trade.findUniqueOrThrow({
    where:  { id, userId },
    select: { screenshotUrls: true },
  })
  const result = await prisma.trade.delete({ where: { id, userId } })
  // Delete screenshots from Supabase Storage (best-effort, non-blocking)
  if (trade.screenshotUrls.length > 0) {
    const paths = trade.screenshotUrls.map(url => {
      try { return new URL(url).pathname.replace(/^\/storage\/v1\/object\/public\/trade-screenshots\//, "") }
      catch { return null }
    }).filter((p): p is string => p !== null)
    if (paths.length > 0) {
      await supabase.storage.from("trade-screenshots").remove(paths).catch(() => undefined)
    }
  }
  if (isCacheEnabled()) await invalidateCache(prisma, userId)
  return result
}

export type SaveChecklistResultInput = {
  tradeId:      string
  setupId?:     string
  itemsChecked: string[]
  itemsTotal:   number
}

export async function saveTradeChecklistResult(prisma: PrismaClient, userId: string, input: SaveChecklistResultInput) {
  const trade = await prisma.trade.findUniqueOrThrow({
    where:  { id: input.tradeId, userId },
    select: { tags: true },
  })

  // Off-plan auto-tag (E5.C3, S2 DT-5): a setup checklist left incomplete tags
  // the trade "Off-plan" automatically. Additive — never removes existing tags.
  const { offPlan } = evaluateChecklist({
    setupHasChecklist: input.itemsTotal > 0,
    itemsChecked:      input.itemsChecked.length,
    itemsTotal:        input.itemsTotal,
  })
  const currentTags = trade.tags as string[]
  if (offPlan && !currentTags.includes("Off-plan")) {
    const newTags = [...currentTags, "Off-plan"]
    await prisma.trade.update({ where: { id: input.tradeId }, data: { tags: newTags } })
    await ensureTagRows(prisma, userId, ["Off-plan"])
  }

  return prisma.tradeChecklistResult.upsert({
    where:  { tradeId: input.tradeId },
    create: {
      userId,
      tradeId:      input.tradeId,
      setupId:      input.setupId,
      itemsChecked: input.itemsChecked,
      itemsTotal:   input.itemsTotal,
    },
    update: {
      itemsChecked: input.itemsChecked,
      itemsTotal:   input.itemsTotal,
    },
  })
}

export type CaptureEmotionInput = {
  tradeId: string
  emotion: EmotionBefore
}

/**
 * La vía dedicada de las superficies de backfill (panel del trade y review
 * semanal). No se reutiliza `updateTrade`: allí la emoción viaja entre otros
 * veinte campos y la regla se diluiría.
 */
export async function captureEmotion(prisma: PrismaClient, userId: string, input: CaptureEmotionInput): Promise<SerializedTrade> {
  const current = await prisma.trade.findUniqueOrThrow({
    where:  { id: input.tradeId, userId },
    select: { date: true, marketOpenedAt: true },
  })
  const now = new Date()
  assertEmotionWindowOpen(current.date, now)

  const trade = await prisma.trade.update({
    where:   { id: input.tradeId, userId },
    data:    { emotionBefore: input.emotion, emotionSource: "reconstructed", emotionRecordedAt: now, emotionReferenceAt: current.marketOpenedAt ?? current.date, emotionContext: "MARKET" },
    include: { account: true, setup: true, events: true },
  })
  return serializeTrade(trade)
}

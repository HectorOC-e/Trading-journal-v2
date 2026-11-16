/**
 * riskPct server-side fallback (#27, S2 DT-1) — first direct coverage of
 * `createTrade`, which had none.
 *
 * The fallback promised that "the column is never silently null", but derived
 * risk against `account.initialBalance` alone. On any account whose initial
 * balance was never set (0 — 3 of 5 in production), `deriveRiskPct` returns
 * null by contract, so `risk_pct` landed null: 53 of 53 trades in prod.
 *
 * That is not cosmetic. `verifyOversizedTrades` filters on `riskPct != null`,
 * so a null column makes it report zero offenders forever — a commitment to
 * stop oversizing verifies as PERFECT COMPLIANCE no matter how the user trades,
 * manufacturing false positive reinforcement.
 *
 * Risk is therefore derived against account EQUITY (initial balance + realised
 * P&L), the same basis the daily-budget guard in this file already uses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/domains/trading/services/risk-enforcement", () => ({
  assertTradeable: vi.fn().mockResolvedValue(undefined),
  evaluateAndLock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/domains/rules/engine", () => ({
  runRules: vi.fn().mockResolvedValue({ blocked: false, blockMessage: null, addTags: [], removeTags: [] }),
}))
vi.mock("@/domains/rules/context", () => ({ buildContext: vi.fn().mockResolvedValue({}) }))
vi.mock("@/server/services/tags/seed", () => ({ ensureTagRows: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/server/services/behavior/commitment-service", () => ({
  evaluateRuledCommitmentsOnTrade: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/server/services/intervention/intervention-service", () => ({
  runIntervention: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/domains/analytics/services/analytics-cache", () => ({
  isCacheEnabled: vi.fn().mockReturnValue(false),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/server/services/trades/serializers", () => ({ serializeTrade: (t: unknown) => t }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: vi.fn() }))

import { assertTradeable, evaluateAndLock } from "@/domains/trading/services/risk-enforcement"
import { createTrade, captureEmotion } from "@/server/services/trades/trade-write-service"
import type { PrismaClient } from "@/lib/generated/prisma/client"

const USER = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const ACCOUNT = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"

/** entry−stop = 70, size 0.02 → 1.40 at risk. */
const INPUT = {
  accountId: ACCOUNT, symbol: "NQ", direction: "LONG", date: "2026-07-20",
  openTime: "09:35", entry: 21450, stop: 21380, target: 21590, size: 0.02,
  status: "OPEN", tags: [] as string[],
}

function mockPrisma(opts: { initialBalance: number; closedPnl: number; pointValue?: string | null }) {
  const created = { id: "t-1", accountId: ACCOUNT, symbol: "NQ", direction: "LONG",
    session: null, setupId: null, size: 0.02, entry: 21450, stop: 21380,
    status: "OPEN", tags: [] as string[], pnl: null, rMultiple: null }
  return {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({fxRates:null}) },
    accountLog: { findMany: vi.fn().mockResolvedValue([]) },
    withdrawal: { findMany: vi.fn().mockResolvedValue([]) },
    account: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        type: "PERSONAL", locked: false, lockReason: "", ddDailyPct: null,
        ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null, ddModel: null,
        maxTradesPerDay: null, allowedSymbols: [], enforceMode: "OFF",
        initialBalance: opts.initialBalance,
      }),
    },
    setup: { findUnique: vi.fn() },
    trade: {
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { pnl: opts.closedPnl } }),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue(created),
      count: vi.fn().mockResolvedValue(0),
      findUniqueOrThrow: vi.fn().mockResolvedValue(created),
    },
    tradeEvent: { create: vi.fn().mockResolvedValue({}) },
    // Symbol not in the catalog → pointValue 1 (price-difference instrument).
    market: { findFirst: vi.fn().mockResolvedValue(opts.pointValue ? { pointValue: opts.pointValue } : null) },
  } as unknown as PrismaClient
}

const riskPctPassedTo = (prisma: PrismaClient) =>
  (prisma.trade.create as unknown as { mock: { calls: [{ data: { riskPct: number | null } }][] } })
    .mock.calls[0][0].data.riskPct

it("keeps dedicated emotion backfill reconstructed and records both clocks", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-16T12:00:00Z"))
  try {
    const db=mockPrisma({initialBalance:1000,closedPnl:0})
    const current={id:"t-1",date:new Date("2026-11-15"),marketOpenedAt:new Date("2026-11-15T07:00:00Z")}
    vi.mocked(db.trade.findUniqueOrThrow).mockResolvedValue(current as never)
    vi.mocked(db.trade.update).mockImplementation((async({data}:any)=>({...current,...data})) as never)
    expect(await captureEmotion(db,USER,{tradeId:"t-1",emotion:"calm"})).toMatchObject({emotionSource:"reconstructed",emotionRecordedAt:new Date("2026-11-16T12:00:00Z"),emotionReferenceAt:new Date("2026-11-15T07:00:00Z"),emotionContext:"MARKET"})
  } finally { vi.useRealTimers() }
})

describe("historical capture cannot create live exposure", () => {
  beforeEach(() => vi.clearAllMocks())
  it("records closed history on a locked account using equity at entry", async () => {
    const db = mockPrisma({ initialBalance: 1000, closedPnl: 9000 })
    vi.mocked(assertTradeable).mockRejectedValueOnce(new Error("ACCOUNT_LOCKED:MANUAL"))
    vi.mocked(db.trade.findMany).mockResolvedValue([{ status: "CLOSED", pnl: 9000, marketClosedAt: new Date("2025-01-01T12:00Z"), events: [] }] as never)
    await createTrade(db, USER, { ...INPUT, date: "2024-01-02", openTime: "01:00", entry: 100, stop: 90, size: 1,
      captureContext: "HISTORICAL", marketTimeZone: "America/Tegucigalpa", marketClosedAt: "2024-01-03T07:00:00Z", status: "CLOSED", pnl: 100, riskPct: 50 } as never)
    expect(vi.mocked(db.trade.create).mock.calls[0][0].data).toMatchObject({ riskPct: 1, marketOpenedAt: new Date("2024-01-02T07:00Z"), marketClosedAt: new Date("2024-01-03T07:00Z"), captureContext: "HISTORICAL" })
    vi.mocked(assertTradeable).mockReset()
  })
  it("rejects an OPEN trade falsely declared historical", async () => {
    const db = mockPrisma({ initialBalance: 1000, closedPnl: 0 })
    await expect(createTrade(db, USER, { ...INPUT, captureContext: "HISTORICAL" } as never)).rejects.toThrow("HISTORICAL_REQUIRES_CLOSED")
    expect(db.trade.create).not.toHaveBeenCalled()
  })
  it("requires an explicit historical close timestamp", async () => {
    const db = mockPrisma({ initialBalance: 1000, closedPnl: 0 })
    await expect(createTrade(db, USER, { ...INPUT, status: "CLOSED", pnl: 100, captureContext: "HISTORICAL" } as never)).rejects.toThrow("HISTORICAL_CLOSE_REQUIRED")
  })
  it("does not require present FX to exclude a future historical cash payment", async () => {
    const db = mockPrisma({ initialBalance: 1000, closedPnl: 0 })
    vi.mocked(db.account.findUniqueOrThrow).mockResolvedValue({currency:"USD",timezone:"UTC",initialBalance:1000,type:"PERSONAL",ddDailyPct:null,allowedSymbols:[]} as never)
    vi.mocked(db.withdrawal.findMany).mockResolvedValue([{id:"w",accountId:ACCOUNT,amount:500,currency:"UNCONVERTIBLE",status:"PAGADO"}] as never)
    vi.mocked(db.accountLog.findMany).mockResolvedValue([{event:"WITHDRAWAL_STATUS",payload:{withdrawalId:"w",status:"PAGADO"},createdAt:new Date("2025-01-01T12:00Z")}] as never)
    await createTrade(db,USER,{...INPUT,date:"2024-01-02",entry:100,stop:90,size:1,status:"CLOSED",pnl:100,captureContext:"HISTORICAL",marketClosedAt:"2024-01-03T12:00:00Z"} as never)
    expect(riskPctPassedTo(db)).toBe(1)
  })
})

describe("createTrade — riskPct fallback", () => {
  beforeEach(() => vi.clearAllMocks())

  it("derives riskPct from equity when the account has no initial balance (the prod bug)", async () => {
    // Cuenta Sana: initialBalance 0, +2115 realised → equity 2115.
    // 1.40 / 2115 * 100 = 0.0662 → 0.07
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2115 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.07, 2)
  })

  it("still derives correctly on a funded account with no closed trades", async () => {
    // 1.40 / 10000 * 100 = 0.014 → 0.01
    const prisma = mockPrisma({ initialBalance: 10000, closedPnl: 0 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.01, 2)
  })

  it("counts realised losses against equity, not just the initial balance", async () => {
    // 10000 − 5000 = 5000 equity → 1.40 / 5000 * 100 = 0.028 → 0.03
    const prisma = mockPrisma({ initialBalance: 10000, closedPnl: -5000 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.03, 2)
  })

  it("honours a client-sent riskPct without querying for equity", async () => {
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2115 })
    await createTrade(prisma, USER, { ...INPUT, riskPct: 1.5 } as never)
    expect(riskPctPassedTo(prisma)).toBe(1.5)
    expect(prisma.trade.aggregate).not.toHaveBeenCalled()
  })

  it("applies the instrument's point value — a 70pt NQ stop risks $28, not $1.40", async () => {
    // Cuenta Sana reproducida: equity 2150, NQ a $20/pt, 70 pts, 0.02 contratos.
    // Riesgo real 70 × 0.02 × 20 = $28 → 1.30 %. Sin pointValue salía 0.07 %,
    // veinte veces menos, y el umbral de oversizing (1.5 %) quedaba inalcanzable.
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2150, pointValue: "$20" })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(1.3, 2)
  })

  it("leaves riskPct null when equity is genuinely zero (nothing to divide by)", async () => {
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 0 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeNull()
  })
})


describe("daily money budget", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-20T12:00:00Z")) })
  afterEach(() => vi.useRealTimers())
  it.each([{day:100,risk:160,blocked:true},{day:100,risk:150,blocked:false},{day:-20,risk:30,blocked:false},{day:-20,risk:30.01,blocked:true}])("day $day risk $risk blocked $blocked", async ({day,risk,blocked}) => {
    const prisma = mockPrisma({initialBalance:1000,closedPnl:day})
    vi.mocked(prisma.account.findUniqueOrThrow).mockResolvedValue({type:"PERSONAL",locked:false,lockReason:"",ddDailyPct:5,initialBalance:1000,allowedSymbols:[]} as never)
    vi.mocked(prisma.trade.aggregate).mockResolvedValue({_sum:{pnl:day}} as never)
    vi.mocked(prisma.trade.findMany).mockResolvedValue([{accountId:ACCOUNT,pnl:day,date:new Date(INPUT.date),status:"CLOSED",events:[]}] as never)
    const result=createTrade(prisma,USER,{...INPUT,entry:100,stop:90,size:risk/10} as never)
    if(blocked) await expect(result).rejects.toThrow()
    else await expect(result).resolves.toBeDefined()
  })
})

it("rejects arbitrary OPEN P&L on create",async()=>{const db=mockPrisma({initialBalance:1000,closedPnl:0});await expect(createTrade(db,USER,{...INPUT,pnl:100} as never)).rejects.toThrow("OPEN_PNL_NOT_REALIZED");expect(db.trade.create).not.toHaveBeenCalled()})

it("cannot move an OPEN trade's timestamp to escape today's preventive risk budget", async()=>{
 const db=mockPrisma({initialBalance:1000,closedPnl:0})
 vi.mocked(db.account.findUniqueOrThrow).mockResolvedValue({type:"PERSONAL",timezone:"UTC",ddDailyPct:5,initialBalance:1000,allowedSymbols:[]} as never)
 vi.mocked(db.trade.findMany).mockResolvedValue([{accountId:ACCOUNT,pnl:-20,date:new Date(new Date().toISOString().slice(0,10)),status:"CLOSED",events:[]}] as never)
 await expect(createTrade(db,USER,{...INPUT,date:"2099-01-01",entry:100,stop:90,size:3.1} as never)).rejects.toThrow()
 expect(db.trade.create).not.toHaveBeenCalled()
})

it('uses native balance corrections when sizing new trade risk',async()=>{const db=mockPrisma({initialBalance:1000,closedPnl:0});vi.mocked(db.accountLog.findMany).mockResolvedValue([{accountId:ACCOUNT,payload:{variance:-500}}] as never);await createTrade(db,USER,{...INPUT} as never);expect(riskPctPassedTo(db)).toBe(.28)})

it('future CLOSED loss does not lock the current account or prevent a trade today',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T00:30:00Z'))
 const actual=await vi.importActual<typeof import('@/domains/trading/services/risk-enforcement')>('@/domains/trading/services/risk-enforcement')
 vi.mocked(assertTradeable).mockImplementation(actual.assertTradeable);vi.mocked(evaluateAndLock).mockImplementation(actual.evaluateAndLock)
 try{
  const db=mockPrisma({initialBalance:1000,closedPnl:0})
  const account={type:'PERSONAL',timezone:'America/Tegucigalpa',initialBalance:1000,locked:false,lockReason:'',ddDailyPct:null,ddWeeklyPct:null,ddMonthlyPct:null,ddTotalPct:5,ddModel:'FIXED',allowedSymbols:[]}
  vi.mocked(db.account.findUniqueOrThrow).mockImplementation((async()=>account) as unknown as typeof db.account.findUniqueOrThrow)
  Object.assign(db.account,{update:vi.fn(async({data}:any)=>Object.assign(account,data,{name:'A'}))})
  Object.assign(db.accountLog,{create:vi.fn()})
  const rows:any[]=[]
  vi.mocked(db.trade.findMany).mockImplementation((async()=>rows) as unknown as typeof db.trade.findMany)
  vi.mocked(db.trade.create).mockImplementation((async({data}:any)=>{const row={id:'t-'+rows.length,...data,events:data.events?.create ? [data.events.create] : []};rows.push(row);return row}) as unknown as typeof db.trade.create)
  vi.mocked(db.trade.findUniqueOrThrow).mockImplementation((async()=>rows.at(-1)) as unknown as typeof db.trade.findUniqueOrThrow)
  await createTrade(db,USER,{...INPUT,date:'2026-11-06',status:'CLOSED',pnl:-100} as never)
  expect(account.locked).toBe(false)
  await expect(createTrade(db,USER,{...INPUT,date:'2026-11-05'} as never)).resolves.toBeDefined()
  expect(db.account.update).not.toHaveBeenCalled()
  Object.assign(account,{ddTotalPct:null,ddDailyPct:5,locked:true,lockReason:'DAILY_LOSS_LIMIT'})
  rows.push({accountId:ACCOUNT,status:'CLOSED',pnl:-100,date:new Date('2026-11-05'),events:[]})
  await expect(createTrade(db,USER,{...INPUT,date:'2026-11-10'} as never)).rejects.toThrow('ACCOUNT_LOCKED:DAILY_LOSS_LIMIT')
  expect(rows).toHaveLength(3)
 }finally{vi.mocked(assertTradeable).mockReset();vi.mocked(evaluateAndLock).mockReset();vi.useRealTimers()}
})

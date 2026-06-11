import { describe, it, expect, beforeEach, vi } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  accountFindUnique: vi.fn(),
  tradeFindMany: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: h.getUser } })),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findUnique: h.accountFindUnique },
    trade:   { findMany: h.tradeFindMany },
  },
}))

import { POST } from "@/app/api/import/mt4/route"

const USER_ID = "user-1"
const ACCOUNT_ID = "acc-1"

const HEADER = "Ticket,Open Time,Type,Lots,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit"
const ROW_1001 = "1001,2024.03.15 14:30:00,buy,1.00,EURUSD,1.08500,1.08000,1.09000,2024.03.15 16:00:00,1.08900,-7.00,0.00,400.00"
const ROW_1002 = "1002,2024.03.16 09:15:00,sell,0.50,GBPUSD,1.27000,1.27500,1.26000,2024.03.16 11:30:00,1.26500,-3.50,0.00,250.00"

function makeReq(csv: string, confirm = false): Request {
  const fd = new FormData()
  fd.append("file", new File([csv], "stmt.csv", { type: "text/csv" }))
  fd.append("accountId", ACCOUNT_ID)
  if (confirm) fd.append("confirm", "true")
  return new Request("http://localhost/api/import/mt4", { method: "POST", body: fd })
}

describe("POST /api/import/mt4 — dedup (dry run)", () => {
  beforeEach(() => {
    h.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    h.accountFindUnique.mockResolvedValue({ id: ACCOUNT_ID, locked: false, lockReason: null })
    h.tradeFindMany.mockResolvedValue([])
  })

  it("returns 401 when unauthenticated", async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(makeReq([HEADER, ROW_1001].join("\n")) as never)
    expect(res.status).toBe(401)
  })

  it("403 when the account is locked", async () => {
    h.accountFindUnique.mockResolvedValue({ id: ACCOUNT_ID, locked: true, lockReason: "DAILY_LOSS_LIMIT" })
    const res = await POST(makeReq([HEADER, ROW_1001].join("\n")) as never)
    expect(res.status).toBe(403)
  })

  it("previews all new rows when nothing exists yet", async () => {
    const res = await POST(makeReq([HEADER, ROW_1001, ROW_1002].join("\n")) as never)
    const json = await res.json()
    expect(json.toCreate).toHaveLength(2)
    expect(json.skipped).toBe(0)
  })

  it("skips a row already imported by ticket", async () => {
    h.tradeFindMany.mockResolvedValue([
      { symbol: "EURUSD", date: new Date("2024-03-15"), openTime: "14:30", size: 1, importTicket: "1001" },
    ])
    const res = await POST(makeReq([HEADER, ROW_1001, ROW_1002].join("\n")) as never)
    const json = await res.json()
    expect(json.skipped).toBe(1)
    expect(json.toCreate.map((t: { ticket: string }) => t.ticket)).toEqual(["1002"])
  })

  it("skips a row matching by (symbol,date,HH:MM,size) even with a different/absent ticket — dedup bug fix", async () => {
    // Stored trade has NO importTicket; only the composite key can catch the dup.
    h.tradeFindMany.mockResolvedValue([
      { symbol: "EURUSD", date: new Date("2024-03-15"), openTime: "14:30", size: 1, importTicket: null },
    ])
    const res = await POST(makeReq([HEADER, ROW_1001, ROW_1002].join("\n")) as never)
    const json = await res.json()
    expect(json.skipped).toBe(1)
    expect(json.toCreate.map((t: { ticket: string }) => t.ticket)).toEqual(["1002"])
  })

  it("dedups identical rows within the same file", async () => {
    const res = await POST(makeReq([HEADER, ROW_1001, ROW_1001].join("\n")) as never)
    const json = await res.json()
    expect(json.toCreate).toHaveLength(1)
    expect(json.skipped).toBe(1)
  })
})

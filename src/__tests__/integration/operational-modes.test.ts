import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"

let owner: string, other: string, accountId: string
beforeAll(async () => {
  // Only the guarded local harness needs policies when bootstrapped from Prisma.
  // A real Supabase local stack already supplies the project's owner policies.
  for (const table of ["accounts", "trades"]) {
    const rows = await prisma.$queryRawUnsafe<{relrowsecurity:boolean}[]>(`SELECT relrowsecurity FROM pg_class WHERE oid='public.${table}'::regclass`)
    if (!rows[0].relrowsecurity) {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
      await prisma.$executeRawUnsafe(`CREATE POLICY qa_owned_rows ON public.${table} TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id)`)
    }
    await prisma.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE,DELETE ON public.${table} TO authenticated`)
  }
  await prisma.$executeRawUnsafe("GRANT USAGE ON SCHEMA public,auth TO authenticated")
})
const tradeData = () => ({
  userId: owner, accountId, direction: "LONG", symbol: "EURUSD",
  entry: 1.1, stop: 1.09, target: 1.12, size: 1,
  date: new Date("2024-02-10T00:00:00Z"), openTime: "09:30", session: "London",
  tags: [], screenshotUrls: [], status: "CLOSED", pnl: 100,
})

beforeEach(async () => {
  owner = await makeUser(); other = await makeUser()
  const account = await prisma.account.create({data:{userId:owner,name:"Demo isolated",broker:"QA",type:"DEMO_PERSONAL",initialBalance:1000,allowedSymbols:[]}})
  accountId = account.id
})
afterEach(async () => { await dropUser(owner); await dropUser(other) })
afterAll(async () => { await prisma.$disconnect() })

describe("operational provenance enforced by PostgreSQL", () => {
  it("derives demo provenance even for a writer from the previous deployment", async () => {
    const trade = await prisma.trade.create({data:tradeData()})
    const rows = await prisma.$queryRaw<{operational_mode:string}[]>`SELECT operational_mode FROM trades WHERE id = ${trade.id}::uuid`
    expect(rows[0].operational_mode).toBe("DEMO")
  })
  it("rejects a trade referencing another user's account even through a privileged writer", async () => {
    await expect(prisma.trade.create({data:{...tradeData(),userId:other}})).rejects.toThrow()
  })
  it("prevents account type changes from silently moving existing history to real", async () => {
    await prisma.trade.create({data:tradeData()})
    await expect(prisma.account.update({where:{id:accountId},data:{type:"PERSONAL"}})).rejects.toThrow()
    expect((await prisma.account.findUniqueOrThrow({where:{id:accountId}})).type).toBe("DEMO_PERSONAL")
  })
  it("allows correcting a type within the same operational modality", async () => {
    await prisma.trade.create({data:tradeData()})
    expect((await prisma.account.update({where:{id:accountId},data:{type:"DEMO_PROP"}})).type).toBe("DEMO_PROP")
  })
  it("rejects forged modes and cross-owner references with an authenticated user's claims", async () => {
    const trade = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated")
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${owner},true)`
      return tx.trade.create({data:tradeData()})
    })
    expect(trade.operationalMode).toBe("DEMO")
    await expect(prisma.$executeRaw`UPDATE public.trades SET operational_mode='REAL' WHERE id=${trade.id}::uuid`).rejects.toThrow()
    const visible = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated")
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${other},true)`
      return tx.trade.findMany({where:{id:trade.id}})
    })
    expect(visible).toEqual([])
    await expect(prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated")
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${other},true)`
      return tx.trade.create({data:{...tradeData(),userId:other}})
    })).rejects.toThrow()
  })
})

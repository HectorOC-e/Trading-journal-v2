import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import { dropUser, makeUser, prisma } from "./_helpers"

let owner: string
let other: string

beforeEach(async () => {
  owner = await makeUser()
  other = await makeUser()
})

afterEach(async () => {
  await dropUser(owner)
  await dropUser(other)
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function setup(userId = owner) {
  return prisma.setup.create({
    data: {
      userId,
      name: "Ruptura QA",
      abbreviation: "RB",
      market: "FX",
      direction: "LONG",
      description: "Ruptura y retroceso",
      aplusChecklist: ["Confirmación"],
      standardChecklist: [],
      expectedAvgR: 0.4,
    },
  })
}

async function asUser<T>(userId: string, action: (tx: typeof prisma) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated")
    await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`
    return action(tx as typeof prisma)
  })
}

describe("setup validation persistence", () => {
  it("keeps exactly one policy per owned setup and rejects a mismatched owner", async () => {
    const owned = await setup()
    const foreign = await setup(other)
    const policy = await prisma.setupValidationPolicy.create({ data: { userId: owner, setupId: owned.id } })

    expect(policy).toMatchObject({
      version: 1,
      backtestMinClosed: 30,
      backtestMinRCoveragePct: 80,
      backtestMinChecklistCoveragePct: 70,
      demoMinClosed: 20,
      demoMinDistinctWeeks: 4,
      demoMinChecklistCompliancePct: 80,
      realMonitorMinClosed: 20,
      realMonitorMinDistinctWeeks: 4,
    })
    await expect(prisma.setupValidationPolicy.create({ data: { userId: owner, setupId: owned.id } })).rejects.toThrow()
    await expect(prisma.setupValidationPolicy.create({ data: { userId: owner, setupId: foreign.id } })).rejects.toThrow()
  })

  it("lets authenticated users read only their rows and denies direct Data API writes", async () => {
    const owned = await setup()
    const policy = await prisma.setupValidationPolicy.create({ data: { userId: owner, setupId: owned.id } })

    expect(await asUser(owner, (tx) => tx.setupValidationPolicy.findMany())).toHaveLength(1)
    expect(await asUser(other, (tx) => tx.setupValidationPolicy.findMany())).toEqual([])
    await expect(asUser(owner, (tx) => tx.setupValidationPolicy.update({ where: { id: policy.id }, data: { version: 2 } }))).rejects.toThrow()
    await expect(asUser(owner, (tx) => tx.setupValidationDecision.create({
      data: {
        userId: owner,
        setupId: owned.id,
        fromStage: "HYPOTHESIS",
        toStage: "BACKTEST",
        action: "PROMOTE",
        policyVersion: 1,
        evidenceSnapshot: {},
        evidenceSignature: "forged",
        idempotencyKey: randomUUID(),
      },
    }))).rejects.toThrow()
  })

  it("stores idempotent immutable decisions while preserving setup deletion cascades", async () => {
    const owned = await setup()
    await prisma.setupValidationPolicy.create({ data: { userId: owner, setupId: owned.id } })
    const idempotencyKey = randomUUID()
    const decision = await prisma.setupValidationDecision.create({
      data: {
        userId: owner,
        setupId: owned.id,
        fromStage: "HYPOTHESIS",
        toStage: "BACKTEST",
        action: "PROMOTE",
        mode: "BACKTEST",
        policyVersion: 1,
        evidenceSnapshot: { schemaVersion: 1, verdict: "ELIGIBLE" },
        evidenceSignature: "sha256:original",
        idempotencyKey,
      },
    })

    await expect(prisma.setupValidationDecision.create({
      data: {
        id: randomUUID(),
        userId: owner,
        setupId: owned.id,
        fromStage: "HYPOTHESIS",
        toStage: "BACKTEST",
        action: "PROMOTE",
        mode: "BACKTEST",
        policyVersion: 1,
        evidenceSnapshot: { schemaVersion: 1, verdict: "ELIGIBLE" },
        evidenceSignature: "sha256:retry",
        idempotencyKey,
      },
    })).rejects.toThrow()
    await expect(prisma.setupValidationDecision.update({ where: { id: decision.id }, data: { note: "reescrito" } })).rejects.toThrow(/immutable/i)
    expect(await asUser(owner, (tx) => tx.setupValidationDecision.findMany())).toHaveLength(1)
    expect(await asUser(other, (tx) => tx.setupValidationDecision.findMany())).toEqual([])
    await expect(asUser(owner, (tx) => tx.setupValidationDecision.delete({ where: { id: decision.id } }))).rejects.toThrow()

    await prisma.setup.delete({ where: { id: owned.id } })
    expect(await prisma.setupValidationDecision.count({ where: { id: decision.id } })).toBe(0)
    expect(await prisma.setupValidationPolicy.count({ where: { setupId: owned.id } })).toBe(0)
  })
})

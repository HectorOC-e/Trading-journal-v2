import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { publishEvent, dispatchPending, type HandlerMap } from "@/domains/cognitive/events/event-bus"

let userId: string
beforeEach(async () => {
  userId = await makeUser()
})
afterEach(async () => {
  await dropUser(userId)
})

describe("dispatchPending (integration, real Postgres)", () => {
  it("drena los eventos con handler, es idempotente y NO toca los tipos sin consumidor", async () => {
    await prisma.$transaction(async (tx) => {
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "a" } })
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "b" } })
      await publishEvent(tx, { userId, type: "commitment.created", payload: { commitmentId: "c" } })
    })
    expect(await prisma.domainEvent.count({ where: { userId, status: "pending" } })).toBe(3)

    const seen: string[] = []
    const handlers: HandlerMap = {
      "insight.created": [async (_p, e) => { seen.push(e.id) }],
    }

    const first = await dispatchPending(prisma, handlers, 50)
    expect(first.claimed).toBe(2) // sólo insight.created tiene handler
    expect(first.processed).toBe(2)
    expect(seen).toHaveLength(2)
    expect(await prisma.domainEvent.count({ where: { userId, type: "insight.created", status: "processed" } })).toBe(2)

    // FREEZE-D6: un tipo sin consumidor sigue pending y por tanto es replayable.
    // Antes de la inyección se marcaba processed sin que nadie lo consumiera.
    expect(await prisma.domainEvent.count({ where: { userId, type: "commitment.created", status: "pending" } })).toBe(1)

    const second = await dispatchPending(prisma, handlers, 50)
    expect(second.claimed).toBe(0)
    expect(second.processed).toBe(0)
  })

  it("un handler que lanza deja el evento reintentable, no processed", async () => {
    await prisma.$transaction(async (tx) => {
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "boom" } })
    })

    const handlers: HandlerMap = {
      "insight.created": [async () => { throw new Error("handler falló") }],
    }

    const r = await dispatchPending(prisma, handlers, 50)
    expect(r.claimed).toBe(1)
    expect(r.processed).toBe(0)

    const row = await prisma.domainEvent.findFirstOrThrow({ where: { userId, type: "insight.created" } })
    expect(row.status).toBe("pending")
    expect(row.attempts).toBe(1)
    expect(row.lastError).toContain("handler falló")
  })
})

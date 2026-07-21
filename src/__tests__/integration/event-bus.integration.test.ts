import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { publishEvent, dispatchPending, _resetHandlers } from "@/domains/cognitive/events/event-bus"

let userId: string
beforeEach(async () => {
  userId = await makeUser()
  _resetHandlers()
})
afterEach(async () => {
  await dropUser(userId)
})

describe("dispatchPending (integration, real Postgres)", () => {
  it("drains pending events, marks them processed, and is idempotent", async () => {
    await prisma.$transaction(async (tx) => {
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "a" } })
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "b" } })
    })
    expect(await prisma.domainEvent.count({ where: { userId, status: "pending" } })).toBe(2)

    const first = await dispatchPending(prisma, 50)
    expect(first.claimed).toBe(2)
    expect(first.processed).toBe(2) // no handler registered → processed no-op
    expect(await prisma.domainEvent.count({ where: { userId, status: "processed" } })).toBe(2)

    const second = await dispatchPending(prisma, 50)
    expect(second.claimed).toBe(0)
    expect(second.processed).toBe(0)
  })
})

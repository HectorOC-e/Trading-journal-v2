import { describe, it, expect, vi } from "vitest"
import { dispatchPending, type HandlerMap } from "@/domains/cognitive/events/event-bus"

type ClaimRow = { id: string; type: string; attempts?: number; maxAttempts?: number }

/**
 * prisma falso: `$queryRaw` (tagged template) devuelve el batch reclamado y
 * capturamos los `update`. Con la inyección esto es testeable sin BD ni estado global.
 */
function fakePrisma(claimed: ClaimRow[]) {
  const updates: Array<{ id: string; status: string; attempts: number }> = []
  const queryRaw = vi.fn().mockResolvedValue(
    claimed.map((c) => ({
      id: c.id, user_id: "u1", type: c.type, payload: {},
      attempts: c.attempts ?? 0, max_attempts: c.maxAttempts ?? 5,
    })),
  )
  const prisma = {
    $queryRaw: queryRaw,
    domainEvent: {
      update: vi.fn(async (args: { where: { id: string }; data: { status: string; attempts: number } }) => {
        updates.push({ id: args.where.id, status: args.data.status, attempts: args.data.attempts })
      }),
    },
  } as never
  return { prisma, updates, queryRaw }
}

describe("dispatchPending — inyección de handlers", () => {
  it("procesa un evento cuando su handler resuelve", async () => {
    const { prisma, updates } = fakePrisma([{ id: "e1", type: "commitment.broken" }])
    const handler = vi.fn().mockResolvedValue(undefined)
    const handlers: HandlerMap = { "commitment.broken": [handler] }

    const r = await dispatchPending(prisma, handlers)

    expect(r).toEqual({ claimed: 1, processed: 1, failed: 0 })
    expect(updates[0]).toMatchObject({ id: "e1", status: "processed" })
    // El handler recibe prisma inyectado + el evento con su id (clave de idempotencia).
    expect(handler).toHaveBeenCalledWith(prisma, expect.objectContaining({ id: "e1", userId: "u1", type: "commitment.broken" }))
  })

  it("corre TODOS los handlers registrados para un mismo tipo", async () => {
    const { prisma } = fakePrisma([{ id: "e1", type: "insight.created" }])
    const a = vi.fn().mockResolvedValue(undefined)
    const b = vi.fn().mockResolvedValue(undefined)

    await dispatchPending(prisma, { "insight.created": [a, b] })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it("re-encola cuando el handler lanza y quedan intentos", async () => {
    const { prisma, updates } = fakePrisma([{ id: "e1", type: "commitment.broken", attempts: 0, maxAttempts: 5 }])
    const handlers: HandlerMap = { "commitment.broken": [vi.fn().mockRejectedValue(new Error("boom"))] }

    const r = await dispatchPending(prisma, handlers)

    expect(r).toEqual({ claimed: 1, processed: 0, failed: 0 })
    expect(updates[0]).toMatchObject({ status: "pending", attempts: 1 })
  })

  it("marca failed cuando el handler lanza y se agotan los intentos", async () => {
    const { prisma, updates } = fakePrisma([{ id: "e1", type: "commitment.broken", attempts: 4, maxAttempts: 5 }])
    const handlers: HandlerMap = { "commitment.broken": [vi.fn().mockRejectedValue(new Error("boom"))] }

    const r = await dispatchPending(prisma, handlers)

    expect(r.failed).toBe(1)
    expect(updates[0]).toMatchObject({ status: "failed", attempts: 5 })
  })

  it("el claim se restringe a los tipos CON handler (un tipo sin consumidor no se reclama)", async () => {
    const { prisma, queryRaw } = fakePrisma([])
    await dispatchPending(prisma, { "insight.created": [vi.fn()], "commitment.broken": [vi.fn()] })

    // La lista de tipos viaja como parámetro del claim: sólo esos dos.
    const params = queryRaw.mock.calls[0].slice(1)
    expect(params).toContainEqual(["insight.created", "commitment.broken"])
  })

  it("con el mapa vacío no reclama nada — nada que quemar", async () => {
    const { prisma, queryRaw } = fakePrisma([])
    const r = await dispatchPending(prisma, {})

    expect(r).toEqual({ claimed: 0, processed: 0, failed: 0 })
    expect(queryRaw.mock.calls[0].slice(1)).toContainEqual([])
  })
})

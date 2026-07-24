import { describe, it, expect, vi, beforeEach } from "vitest"

const { emitNotification } = vi.hoisted(() => ({ emitNotification: vi.fn() }))
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification }))

import { notificationHandler } from "@/domains/cognitive/events/handlers/notification-handler"

const prismaWith = (insight: unknown) =>
  ({ insight: { findFirst: vi.fn().mockResolvedValue(insight) } }) as never

const evt = {
  id: "evt-3",
  userId: "u1",
  type: "insight.created" as never,
  payload: { insightId: "i1" },
}

beforeEach(() => {
  emitNotification.mockReset()
  emitNotification.mockResolvedValue({ id: "n1" })
})

describe("notificationHandler — insight.created → notificación", () => {
  it("emite INSIGHT_DETECTED con el título del insight y href a /analytics", async () => {
    await notificationHandler(prismaWith({ title: "Operas peor tras 2 pérdidas" }), evt)

    expect(emitNotification).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
      "INSIGHT_DETECTED",
      expect.objectContaining({
        params: { title: "Operas peor tras 2 pérdidas" },
        sourceId: "i1",
        href: "/analytics",
      }),
    )
  })

  it("dedupea por insight:<id>, no por el id del evento — reprocesar refresca, no apila", async () => {
    await notificationHandler(prismaWith({ title: "x" }), evt)

    const opts = emitNotification.mock.calls[0][3]
    expect(opts.dedupeKey).toBe("insight:i1")
  })

  it("no-op sin lanzar si el insight fue borrado entre publicación y consumo", async () => {
    await expect(notificationHandler(prismaWith(null), evt)).resolves.toBeUndefined()
    expect(emitNotification).not.toHaveBeenCalled()
  })

  it("NO traga el error de emitNotification — el dispatcher debe reintentar", async () => {
    emitNotification.mockRejectedValueOnce(new Error("db down"))
    await expect(notificationHandler(prismaWith({ title: "x" }), evt)).rejects.toThrow("db down")
  })
})

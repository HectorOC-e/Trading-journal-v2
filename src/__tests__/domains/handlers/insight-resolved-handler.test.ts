import { describe, it, expect, vi, beforeEach } from "vitest"

const { emitNotification } = vi.hoisted(() => ({ emitNotification: vi.fn() }))
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification }))

import {
  insightCreatedHandler,
  insightResolvedHandler,
  insightDedupeKey,
} from "@/domains/cognitive/events/handlers/notification-handler"

function fakePrisma(updated = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count: updated })
  return {
    prisma: { notification: { updateMany }, insight: { findFirst: vi.fn().mockResolvedValue({ title: "t" }) } } as never,
    updateMany,
  }
}

const evt = {
  id: "evt-7",
  userId: "u1",
  type: "insight.resolved" as never,
  payload: { insightId: "i1" },
}

beforeEach(() => {
  emitNotification.mockReset()
  emitNotification.mockResolvedValue({ id: "n1" })
})

describe("insightDedupeKey — una sola fuente para la clave", () => {
  it("los dos handlers derivan la MISMA clave del mismo insight", async () => {
    const { prisma, updateMany } = fakePrisma()

    await insightCreatedHandler(prisma, { ...evt, type: "insight.created" as never })
    await insightResolvedHandler(prisma, evt)

    const claveAlEmitir = emitNotification.mock.calls[0][3].dedupeKey
    const claveAlArchivar = updateMany.mock.calls[0][0].where.dedupeKey

    expect(claveAlEmitir).toBe(claveAlArchivar)
    expect(claveAlEmitir).toBe(insightDedupeKey("i1"))
  })
})

describe("insightResolvedHandler — el patron ya no se cumple", () => {
  it("archiva la notificacion de ese insight, del usuario del evento", async () => {
    const { prisma, updateMany } = fakePrisma()

    await insightResolvedHandler(prisma, evt)

    expect(updateMany).toHaveBeenCalledTimes(1)
    const arg = updateMany.mock.calls[0][0]
    expect(arg.where).toMatchObject({ userId: "u1", dedupeKey: "insight:i1" })
    expect(arg.data.archivedAt).toBeInstanceOf(Date)
  })

  it("solo toca las NO archivadas — un reproceso no repisa la fecha", async () => {
    const { prisma, updateMany } = fakePrisma()
    await insightResolvedHandler(prisma, evt)
    expect(updateMany.mock.calls[0][0].where.archivedAt).toBeNull()
  })

  it("NO marca como leida: archivar la saca de la campana, leerla la afirmaria vista", async () => {
    const { prisma, updateMany } = fakePrisma()
    await insightResolvedHandler(prisma, evt)
    expect(updateMany.mock.calls[0][0].data.readAt).toBeUndefined()
  })

  it("sin notificacion que archivar es no-op y NO lanza", async () => {
    const { prisma } = fakePrisma(0)
    await expect(insightResolvedHandler(prisma, evt)).resolves.toBeUndefined()
  })

  it("NO traga el error — el dispatcher debe reintentar", async () => {
    const prisma = {
      notification: { updateMany: vi.fn().mockRejectedValue(new Error("db down")) },
    } as never
    await expect(insightResolvedHandler(prisma, evt)).rejects.toThrow("db down")
  })
})

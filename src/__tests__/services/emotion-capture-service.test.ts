import { describe, it, expect, vi, beforeEach } from "vitest"
import { updateTrade, captureEmotion, closeTrade } from "@/server/services/trades/trade-write-service"

const T0 = new Date("2026-07-01T00:00:00Z")

// El mock lleva `createdAt`/`updatedAt` en el trade Y en la cuenta porque
// `serializeTrade` los pasa por `toISOString()`. Sin ellos el test revienta en
// la fontanería del serializador en vez de en la aserción, y un rojo genérico
// no prueba el defecto que se cree estar arreglando.
function prismaWith(tradeDate: string) {
  const account = {
    id: "a1", initialBalance: 1000, type: "PERSONAL", ddModel: null,
    ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null,
    targetPct: null, consistencyPct: null, lastSyncedBalance: null, lastSyncedAt: null,
    locked: false, lockReason: null, createdAt: T0, updatedAt: T0,
  }
  const update = vi.fn().mockResolvedValue({
    id: "t1", tags: [], date: new Date(tradeDate + "T00:00:00Z"), status: "CLOSED",
    accountId: "a1", symbol: "NQ", direction: "LONG", session: "New York",
    entry: 1, stop: 0.99, target: 1.02, size: 1, pnl: 10, rMultiple: 1,
    createdAt: T0, updatedAt: T0,
    account, setup: null, events: [],
  })
  return {
    prisma: {
      trade: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ date: new Date(tradeDate + "T00:00:00Z") }),
        findMany: vi.fn().mockResolvedValue([]),
        update,
      },
      account: {
        findUnique:        vi.fn().mockResolvedValue(account),
        findFirst:         vi.fn().mockResolvedValue(account),
        findUniqueOrThrow: vi.fn().mockResolvedValue(account),
        update:            vi.fn().mockResolvedValue(account),
      },
      market: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    update,
  }
}

const DENTRO = "2026-07-24"   // 3 días
const FUERA  = "2026-06-19"   // 38 días — el trade histórico más reciente de prod

describe("procedencia y ventana en el servicio de escritura", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-27T12:00:00Z")) })

  it("updateTrade marca como RECONSTRUIDA la emoción escrita después del momento", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    await updateTrade(prisma as never, "u1", { id: "t1", emotionBefore: "anxious" })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emotionBefore: "anxious", emotionSource: "reconstructed" }),
    }))
  })

  it("updateTrade RECHAZA escribir emoción fuera de ventana", async () => {
    const { prisma, update } = prismaWith(FUERA)
    await expect(updateTrade(prisma as never, "u1", { id: "t1", emotionBefore: "anxious" }))
      .rejects.toThrow(/EMOTION_WINDOW_CLOSED/)
    expect(update).not.toHaveBeenCalled()
  })

  it("captureEmotion dentro de ventana escribe marcada como reconstruida", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    await captureEmotion(prisma as never, "u1", { tradeId: "t1", emotion: "anxious" })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { emotionBefore: "anxious", emotionSource: "reconstructed" },
    }))
  })

  it("captureEmotion fuera de ventana rechaza y no escribe nada", async () => {
    const { prisma, update } = prismaWith(FUERA)
    await expect(captureEmotion(prisma as never, "u1", { tradeId: "t1", emotion: "anxious" }))
      .rejects.toThrow(/EMOTION_WINDOW_CLOSED/)
    expect(update).not.toHaveBeenCalled()
  })

  it("closeTrade no pisa la emoción registrada al abrir, y así su comentario deja de mentir", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    prisma.trade.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "t1", date: new Date(DENTRO + "T00:00:00Z"), direction: "LONG",
      entry: 1, stop: 0.99, size: 1, symbol: "NQ", accountId: "a1",
      emotionBefore: "calm",   // ya la registró al abrir
    })
    await closeTrade(prisma as never, "u1", { id: "t1", closePrice: 1.02, commission: 0, emotionBefore: "anxious" })
    const data = update.mock.calls[0][0].data
    expect(data).not.toHaveProperty("emotionBefore")
    expect(data).not.toHaveProperty("emotionSource")
  })

  it("closeTrade marca CAPTURADA la emoción que sí escribe (primera escritura, en el momento)", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    prisma.trade.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "t1", date: new Date(DENTRO + "T00:00:00Z"), direction: "LONG",
      entry: 1, stop: 0.99, size: 1, symbol: "NQ", accountId: "a1",
      emotionBefore: null,   // el nudge del cierre es la primera vez que se pregunta
    })
    await closeTrade(prisma as never, "u1", { id: "t1", closePrice: 1.02, commission: 0, emotionBefore: "anxious" })
    const data = update.mock.calls[0][0].data
    expect(data).toMatchObject({ emotionBefore: "anxious", emotionSource: "captured" })
  })
})

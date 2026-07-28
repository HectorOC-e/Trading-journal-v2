import { describe, it, expect, vi, beforeEach } from "vitest"
import { loadWeeklyReport } from "@/server/services/reviews/report-data"

/**
 * El plan declaraba que "la semana de la review ES la ventana, así que por
 * construcción todo lo que aparece ahí es rellenable". Es FALSO: una review se
 * puede abrir cuando sea, y el lunes de una semana ya pasada está a más de 7
 * días de hoy. Sin filtrar por la ventana REAL, la UI ofrecería chips que el
 * servidor rechaza con EMOTION_WINDOW_CLOSED — pedir un gesto y no dejar
 * hacerlo es exactamente el defecto que esta pieza vino a matar.
 */

const ROW = (id: string, date: string) => ({ id, symbol: "NQ", date: new Date(date + "T00:00:00Z") })

function mockPrisma(pendingRows: ReturnType<typeof ROW>[]) {
  const pendingFindMany = vi.fn().mockResolvedValue(pendingRows)
  const findMany = vi.fn()
    .mockResolvedValueOnce([])   // weekRows
    .mockResolvedValueOnce([])   // prevRows
    .mockImplementation(pendingFindMany)
  return {
    prisma: {
      user:         { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: null }) },
      account:      { findMany: vi.fn().mockResolvedValue([]) },
      setup:        { findMany: vi.fn().mockResolvedValue([]) },
      trade:        { findMany },
      weeklyReview: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never,
  }
}

describe("pendingEmotion respeta la ventana real, no la semana de la review", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-28T12:00:00Z")) })

  it("descarta el trade de la semana que ya salió de la ventana de 7 días", async () => {
    // Review de la semana del 2026-07-20, abierta el 28: el lunes está a 8 días.
    const { prisma } = mockPrisma([ROW("viejo", "2026-07-20"), ROW("reciente", "2026-07-24")])
    const bundle = await loadWeeklyReport(prisma, "u1", "2026-07-20")
    expect(bundle.pendingEmotion.map(t => t.id)).toEqual(["reciente"])
  })

  it("conserva los que siguen en plazo", async () => {
    const { prisma } = mockPrisma([ROW("hoy", "2026-07-28"), ROW("limite", "2026-07-21")])
    const bundle = await loadWeeklyReport(prisma, "u1", "2026-07-27")
    expect(bundle.pendingEmotion.map(t => t.id)).toEqual(["hoy", "limite"])
  })
})

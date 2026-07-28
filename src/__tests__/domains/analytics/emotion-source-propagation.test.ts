import { describe, it, expect, vi } from "vitest"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"

/**
 * `emotion_source` tiene que sobrevivir DOS estrechamientos antes de llegar a
 * los detectores, y cada uno lo descarta en silencio si no se lo nombra:
 *
 *  1) el `select` explícito de Prisma — lo que no se pide no llega;
 *  2) el re-mapeo campo por campo a `AnalyticsTrade` — lo que no se lista se
 *     pierde y sale `undefined`.
 *
 * Si cualquiera de los dos lo tira, `capturedEmotion()` devuelve null para
 * TODO y los tres detectores de correlación quedan mudos en producción sin que
 * ningún test de dominio se entere: allí los fixtures traen el campo a mano.
 * Por eso esto se afirma sobre el camino real, no sobre el tipo.
 */

const T = (over: Record<string, unknown> = {}) => ({
  id: "t1", accountId: "a1", symbol: "NQ", direction: "LONG", session: "New York",
  openTime: "09:30", closeTime: "10:30", pnl: 100, rMultiple: 1, tags: [],
  date: new Date("2026-07-24T00:00:00Z"), setupId: null,
  entry: 1, stop: 0.99, target: 1.02, size: 1,
  emotionBefore: "calm", emotionSource: "captured",
  fomoFlag: false, revengeFlag: false, confidenceRating: null,
  ...over,
})

function mockPrisma(rows: ReturnType<typeof T>[]) {
  const findMany = vi.fn().mockResolvedValue(rows)
  return {
    prisma: {
      trade:             { findMany },
      account:           { findMany: vi.fn().mockResolvedValue([{ id: "a1", name: "A", type: "PERSONAL", currency: "USD", initialBalance: 1000, ddTotalPct: null, locked: false }]) },
      setup:             { findMany: vi.fn().mockResolvedValue([]) },
      withdrawal:        { findMany: vi.fn().mockResolvedValue([]) },
      user:              { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: null, weeklyPnlGoal: null, weeklyTradesGoal: null, disciplineGoal: null, weeklyGoalMinutes: null }) },
      tradingSessionLog: { findMany: vi.fn().mockResolvedValue([]) },
    } as never,
    findMany,
  }
}

describe("emotion_source sobrevive el camino de la BD a los detectores", () => {
  it("se PIDE en el select de Prisma — lo que no se pide no llega", async () => {
    const { prisma, findMany } = mockPrisma([T()])
    await buildAnalyticsBundle("u1", prisma, undefined, true)
    expect(findMany.mock.calls[0][0].select).toHaveProperty("emotionSource", true)
  })

  it("se PROPAGA al AnalyticsTrade — el re-mapeo no lo descarta", async () => {
    const { prisma } = mockPrisma([T(), T({ id: "t2", emotionBefore: "calm", emotionSource: "reconstructed" })])
    const bundle = await buildAnalyticsBundle("u1", prisma, undefined, true)
    expect(bundle.raw.allTrades.map(t => t.emotionSource)).toEqual(["captured", "reconstructed"])
  })

  it("byEmotion declara cuántas del grupo son reconstruidas, sin disfrazarlas", async () => {
    const { prisma } = mockPrisma([
      T({ id: "t1", emotionSource: "captured" }),
      T({ id: "t2", emotionSource: "reconstructed" }),
      T({ id: "t3", emotionSource: "reconstructed" }),
    ])
    const bundle = await buildAnalyticsBundle("u1", prisma, undefined, true)
    const calm = bundle.psychology.byEmotion.find(e => e.emotion === "calm")
    expect(calm).toMatchObject({ trades: 3, reconstructed: 2 })
  })
})

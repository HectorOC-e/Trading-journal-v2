import { expect, it, vi } from "vitest"
import { loadMonthlyReport } from "@/server/services/reviews/report-data"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"

vi.mock("@/domains/analytics/services/discipline-service", () => ({
  computeDisciplineScore: vi.fn(),
}))

it("reopening never substitutes shared legacy scores for live scoped discipline", async () => {
  const saved = { overallScore: 62, pillarDiscipline: 75, summary: "", keyThemes: [], goalsSet: [], goalsMet: [] }
  vi.mocked(computeDisciplineScore).mockResolvedValue({ score: 100 } as never)
  const snapshot = { id: "s1", userId: "u", kind: "MONTHLY", periodKey: "2026-06", mode: "REAL", revision: 0, evidenceHash: null, analysisEvidenceHash: null, analysis: null, analysisAt: null }
  const db = {
    user: { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: {} }) },
    account: { findMany: vi.fn().mockResolvedValue([]) }, setup: { findMany: vi.fn().mockResolvedValue([]) },
    trade: { findMany: vi.fn().mockResolvedValue([]) }, weeklyReview: { findMany: vi.fn().mockResolvedValue([]) },
    monthlyReview: { findFirst: vi.fn().mockResolvedValue(saved) },
    reviewModeSnapshot: {
      upsert: vi.fn().mockResolvedValue(snapshot),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(snapshot),
    },
  } as unknown as PrismaClient
  const first = await loadMonthlyReport(db, "u", 2026, 6)
  expect(first.report.kpis.disciplineScore).toBe(100)
  saved.overallScore = 39
  expect((await loadMonthlyReport(db, "u", 2026, 6)).report.kpis.disciplineScore).toBe(100)
  vi.mocked(computeDisciplineScore).mockResolvedValue({ score: null } as never)
  expect((await loadMonthlyReport(db, "u", 2026, 6)).report.kpis.disciplineScore).toBeNull()
})

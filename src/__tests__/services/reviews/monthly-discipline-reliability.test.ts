import { expect, it, vi } from "vitest"
import { loadMonthlyReport } from "@/server/services/reviews/report-data"
import type { PrismaClient } from "@/lib/generated/prisma/client"

it("reopening and finalizing never substitutes overall for real monthly discipline", async () => {
  const saved = { overallScore: 62, pillarDiscipline: 75, summary: "", keyThemes: [], goalsSet: [], goalsMet: [] }
  const weekly = vi.fn().mockResolvedValue([{ weekStart: new Date(2026, 5, 8), disciplineScore: 100 }])
  const db = {
    user: { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: {} }) },
    account: { findMany: vi.fn().mockResolvedValue([]) }, setup: { findMany: vi.fn().mockResolvedValue([]) },
    trade: { findMany: vi.fn().mockResolvedValue([]) }, weeklyReview: { findMany: weekly },
    monthlyReview: { findFirst: vi.fn().mockResolvedValue(saved) },
  } as unknown as PrismaClient
  const first = await loadMonthlyReport(db, "u", 2026, 6)
  expect(first.report.kpis.disciplineScore).toBe(100)
  saved.overallScore = 39
  expect((await loadMonthlyReport(db, "u", 2026, 6)).report.kpis.disciplineScore).toBe(100)
  weekly.mockResolvedValue([])
  expect((await loadMonthlyReport(db, "u", 2026, 6)).report.kpis.disciplineScore).toBe(75)
  weekly.mockResolvedValue([{ weekStart: new Date(2026, 5, 8), disciplineScore: 0 }])
  expect((await loadMonthlyReport(db, "u", 2026, 6)).report.kpis.disciplineScore).toBe(0)
})

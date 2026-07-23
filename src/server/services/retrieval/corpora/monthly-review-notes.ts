// Adaptador del corpus de resúmenes de review mensual (`monthly_reviews.summary`).
//
// Simétrico a weekly-review-notes: reflexión retrospectiva del TRADER, no la IA
// (la columna ai_analysis se deja fuera por FREEZE-P6/D9). Cierra la asimetría de
// #165, que indexaba las semanales pero no las mensuales.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

export interface MonthlyReviewRow {
  id:      string
  year:    number
  month:   number   // 1–12
  status:  string
  summary: string | null
}

/** "2026-07" — el formato que espera reviews/mensual/[yearMonth]. */
const yearMonth = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`

export const monthlyReviewNotesAdapter: CorpusAdapter<MonthlyReviewRow> = {
  key:   "monthly_reviews",
  label: "Reviews mensuales",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (summary_embedding <=> ${vec}::vector)) AS similarity
      FROM monthly_reviews
      WHERE user_id = ${userId}::uuid AND summary_embedding IS NOT NULL
      ORDER BY summary_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, summary AS text FROM monthly_reviews
      WHERE user_id = ${userId}::uuid AND summary <> '' AND summary_embedding IS NULL
      ORDER BY year DESC, month DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE monthly_reviews SET summary_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE summary <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE summary_embedding IS NOT NULL)::int AS embedded
      FROM monthly_reviews WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<MonthlyReviewRow[]> {
    return prisma.monthlyReview.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, year: true, month: true, status: true, summary: true },
    }) as unknown as Promise<MonthlyReviewRow[]>
  },

  rowId: (row: MonthlyReviewRow) => row.id,

  toCitation(row: MonthlyReviewRow, similarity: number): Citation {
    const mes = MONTHS[row.month - 1] ?? String(row.month)
    return {
      corpus:     "monthly_reviews",
      id:         row.id,
      label:      `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${row.year}`,
      sublabel:   `Review mensual · ${row.status}`,
      outcome:    "",
      positive:   null,
      snippet:    truncate(row.summary ?? ""),
      similarity,
      // Ruta dinámica dedicada: /reviews/mensual/<YYYY-MM> (mensual/[yearMonth]).
      href:       `/reviews/mensual/${yearMonth(row.year, row.month)}`,
    }
  },
}

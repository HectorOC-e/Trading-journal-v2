// Adaptador del corpus de resúmenes de review semanal (`weekly_reviews.executive_summary`).
//
// Es la reflexión retrospectiva que escribe EL TRADER, no la IA: la columna
// ai_analysis se deja fuera a propósito (indexar prosa del LLM para que el LLM la
// cite como evidencia del trader es un bucle prohibido por FREEZE-P6/D9).
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface WeeklyReviewRow {
  id:               string
  weekLabel:        string
  weekStart:        Date
  status:           string
  executiveSummary: string | null
}

export const weeklyReviewNotesAdapter: CorpusAdapter<WeeklyReviewRow> = {
  key:   "weekly_reviews",
  label: "Reviews semanales",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (summary_embedding <=> ${vec}::vector)) AS similarity
      FROM weekly_reviews
      WHERE user_id = ${userId}::uuid AND summary_embedding IS NOT NULL
      ORDER BY summary_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, executive_summary AS text FROM weekly_reviews
      WHERE user_id = ${userId}::uuid AND executive_summary <> '' AND summary_embedding IS NULL
      ORDER BY week_start DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE weekly_reviews SET summary_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE executive_summary <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE summary_embedding IS NOT NULL)::int AS embedded
      FROM weekly_reviews WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<WeeklyReviewRow[]> {
    return prisma.weeklyReview.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, weekLabel: true, weekStart: true, status: true, executiveSummary: true },
    }) as unknown as Promise<WeeklyReviewRow[]>
  },

  rowId: (row: WeeklyReviewRow) => row.id,

  toCitation(row: WeeklyReviewRow, similarity: number): Citation {
    return {
      corpus:     "weekly_reviews",
      id:         row.id,
      label:      row.weekLabel,
      sublabel:   `Review · ${row.status}`,
      outcome:    "",
      positive:   null,
      snippet:    truncate(row.executiveSummary ?? ""),
      similarity,
      // Ruta dinámica dedicada que ya existe (reviews/page.tsx:165 la usa para
      // openWeek): /reviews/semanal/<weekStart>. No es un query param.
      href:       `/reviews/semanal/${new Date(row.weekStart).toISOString().slice(0, 10)}`,
    }
  },
}

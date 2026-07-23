// Adaptador del corpus de apuntes de aprendizaje. Sólo consultas LITERALES y forma.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface ResourceRow {
  id:          string
  title:       string
  type:        string
  status:      string
  progressPct: number | null
  notes:       string | null
}

export const resourceNotesAdapter: CorpusAdapter<ResourceRow> = {
  key:   "learning_notes",
  label: "Apuntes de aprendizaje",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM learning_resources
      WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM learning_resources
      WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
      ORDER BY updated_at DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE learning_resources SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE notes <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL)::int AS embedded
      FROM learning_resources WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<ResourceRow[]> {
    return prisma.learningResource.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, title: true, type: true, status: true, progressPct: true, notes: true },
    }) as unknown as Promise<ResourceRow[]>
  },

  rowId: (row: ResourceRow) => row.id,

  toCitation(row: ResourceRow, similarity: number): Citation {
    return {
      corpus:     "learning_notes",
      id:         row.id,
      label:      row.title,
      sublabel:   `${row.type} · ${row.status}`,
      outcome:    row.progressPct === null ? "" : `${row.progressPct}% completado`,
      positive:   null,
      snippet:    truncate(row.notes ?? ""),
      similarity,
      href:       `/aprendizaje?resource=${row.id}`,
    }
  },
}

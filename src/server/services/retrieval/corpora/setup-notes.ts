// Adaptador del corpus de descripciones de setup (`setups.description`).
//
// Añadido a pedido explícito del usuario. La descripción es DEFINITORIA, no
// reflexiva, y get_setup_detail ya la recupera por nombre — su aporte semántico
// es menor que el de los corpus de notas del trader. Se implementa igual, con la
// misma forma que los demás.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface SetupRow {
  id:          string
  name:        string
  abbreviation: string
  market:      string
  status:      string
  description: string | null
}

export const setupNotesAdapter: CorpusAdapter<SetupRow> = {
  key:   "setups",
  label: "Descripciones de setup",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (description_embedding <=> ${vec}::vector)) AS similarity
      FROM setups
      WHERE user_id = ${userId}::uuid AND description_embedding IS NOT NULL
      ORDER BY description_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, description AS text FROM setups
      WHERE user_id = ${userId}::uuid AND description <> '' AND description_embedding IS NULL
      ORDER BY updated_at DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE setups SET description_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE description <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE description_embedding IS NOT NULL)::int AS embedded
      FROM setups WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<SetupRow[]> {
    return prisma.setup.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, name: true, abbreviation: true, market: true, status: true, description: true },
    }) as unknown as Promise<SetupRow[]>
  },

  rowId: (row: SetupRow) => row.id,

  toCitation(row: SetupRow, similarity: number): Citation {
    return {
      corpus:     "setups",
      id:         row.id,
      label:      row.name,
      sublabel:   `Setup · ${row.market || "—"} · ${row.status}`,
      outcome:    "",
      positive:   null,
      snippet:    truncate(row.description ?? ""),
      similarity,
      // /playbook abre el drawer del setup con ?highlight=<id> (page.tsx:1204).
      href:       `/playbook?highlight=${row.id}`,
    }
  },
}

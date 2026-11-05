import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client"

/** Commit edited text and invalidate its old meaning in the same transaction. */
export async function writeReviewText<T extends { id: string }>(
  prisma: PrismaClient,
  corpus: "weekly_reviews" | "monthly_reviews",
  hasText: boolean,
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async tx => {
    const row = await write(tx)
    if (hasText) {
      if (corpus === "weekly_reviews") {
        await tx.$executeRaw`UPDATE weekly_reviews SET summary_embedding = NULL WHERE id = ${row.id}::uuid`
      } else {
        await tx.$executeRaw`UPDATE monthly_reviews SET summary_embedding = NULL WHERE id = ${row.id}::uuid`
      }
    }
    return row
  })
}

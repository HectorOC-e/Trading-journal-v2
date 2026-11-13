import type { Prisma } from "@/lib/generated/prisma/client";

/** Serialize rule publication with the final read→close validation. */
export async function lockFiscalRulePublication(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('HN-ISR-RULE-PUBLICATION'))`;
}

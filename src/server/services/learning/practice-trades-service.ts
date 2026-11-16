import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

export type PracticeTradeRole = "EXECUTED" | "REVIEWED";
type LinkInput = { practiceId: string; expectedVersion: number; links: { tradeId: string; role: PracticeTradeRole }[] };

export function validatePracticeKind(kind: string, mode: string | null, links: LinkInput["links"]) {
  if (kind === "CONCEPT" && links.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige ejecución o revisión para vincular operaciones." });
  if (kind === "EXECUTION" && mode !== "DEMO" && mode !== "BACKTEST") throw new TRPCError({ code: "BAD_REQUEST", message: "Una ejecución de práctica requiere Demo o Backtesting." });
  if (kind !== "CONCEPT" && !["REAL", "DEMO", "BACKTEST"].includes(mode ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige la modalidad de la práctica." });
  if (links.some(link => link.role !== (kind === "EXECUTION" ? "EXECUTED" : "REVIEWED"))) throw new TRPCError({ code: "BAD_REQUEST", message: "Una revisión reutiliza evidencia; no crea otra ejecución." });
}

/** Shared with create/update so fields and evidence commit atomically. */
export async function replacePracticeTradeLinksInTransaction(tx: Prisma.TransactionClient, userId: string, input: LinkInput) {
  await tx.$queryRaw`SELECT id FROM public.users WHERE id=${userId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM learning_practices WHERE id=${input.practiceId}::uuid AND user_id=${userId}::uuid FOR UPDATE`;
  const practice = await tx.learningPractice.findFirst({ where: { id: input.practiceId, userId } });
  if (!practice) throw new TRPCError({ code: "NOT_FOUND" });
  if (practice.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "La práctica cambió. Conserva tu borrador y actualiza la versión." });
  if (input.links.length > 50 || new Set(input.links.map(l => l.tradeId)).size !== input.links.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Vincula hasta 50 operaciones diferentes." });
  validatePracticeKind(practice.kind, practice.operationalMode, input.links);
  if (input.links.length) {
    const trades = await tx.trade.findMany({ where: { userId, id: { in: input.links.map(l => l.tradeId) } }, select: { id: true, userId: true, operationalMode: true } });
    if (trades.length !== input.links.length || trades.some(t => t.userId !== userId)) throw new TRPCError({ code: "NOT_FOUND", message: "Una operación no está disponible." });
    if (trades.some(t => t.operationalMode !== practice.operationalMode)) throw new TRPCError({ code: "BAD_REQUEST", message: "Todas las operaciones deben pertenecer a la modalidad de la práctica." });
    const executed = input.links.filter(l => l.role === "EXECUTED").map(l => l.tradeId);
    if (executed.length && await tx.practiceTradeLink.findFirst({ where: { userId, tradeId: { in: executed }, role: "EXECUTED", practiceId: { not: practice.id } } })) throw new TRPCError({ code: "CONFLICT", message: "Una operación ya tiene una práctica de ejecución. Úsala en una revisión." });
  }
  // The row lock serializes replacement; database link triggers advance the opaque
  // version token, including writes made outside this service.
  await tx.practiceTradeLink.deleteMany({ where: { practiceId: practice.id, userId } });
  if (input.links.length) await tx.practiceTradeLink.createMany({ data: input.links.map(link => ({ ...link, practiceId: practice.id, userId })) });
  const current = await tx.learningPractice.findFirst({ where: { id: practice.id, userId } });
  return { version: current!.version, linkedTradeCount: input.links.length };
}

export async function replacePracticeTradeLinks(prisma: PrismaClient, userId: string, input: LinkInput) {
  try { return await prisma.$transaction(tx => replacePracticeTradeLinksInTransaction(tx, userId, input)); }
  catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new TRPCError({ code: "CONFLICT", message: "Una operación ya tiene una práctica de ejecución." });
    throw error;
  }
}

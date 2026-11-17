// Coach thread persistence (S6) — the episodic layer of memory: every conversation
// is saved (CoachThread + CoachMessage) so the coach can refer back to it.

import { operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client"

/** Resolve a thread for the user: return the owned one, or create a fresh thread. */
export async function ensureThread(prisma: PrismaClient | Prisma.TransactionClient, userId: string, threadId?: string | null, mode: OperationalMode = "REAL") {
  operationalModeSchema.parse(mode)
  if (threadId) {
    const existing = await prisma.coachThread.findFirst({ where: { id: threadId, userId, operationalMode: mode }, select: { id: true } })
    if (existing) return existing
  }
  return prisma.coachThread.create({ data: { userId, operationalMode: mode }, select: { id: true } })
}

export async function appendMessage(
  prisma: PrismaClient,
  userId: string,
  threadId: string,
  role: "user" | "assistant",
  content: string,
) {
  await prisma.$transaction([
    prisma.coachMessage.create({ data: { threadId, userId, role, content } }),
    prisma.coachThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } }),
  ])
}

/** Commit the owned thread and both messages together, so failed attempts are safe to retry. */
export async function appendExchange(
  prisma: PrismaClient,
  userId: string,
  input: { threadId?: string | null; userText: string; assistantText: string; mode?: OperationalMode },
) {
  return prisma.$transaction(async tx => {
    const thread = await ensureThread(tx, userId, input.threadId, input.mode ?? "REAL")
    // PostgreSQL now() is constant within a transaction; keep chronological reads deterministic.
    const userAt = new Date()
    const assistantAt = new Date(userAt.getTime() + 1)
    await tx.coachMessage.create({ data: { threadId: thread.id, userId, role: "user", content: input.userText, createdAt: userAt } })
    await tx.coachMessage.create({ data: { threadId: thread.id, userId, role: "assistant", content: input.assistantText, createdAt: assistantAt } })
    await tx.coachThread.update({ where: { id: thread.id }, data: { lastMessageAt: assistantAt } })
    return thread
  })
}

export async function getThreads(prisma: PrismaClient, userId: string, limit = 30, mode: OperationalMode = "REAL") {
  return prisma.coachThread.findMany({
    where: { userId, operationalMode: mode },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    select: { id: true, title: true, summary: true, lastMessageAt: true, operationalMode: true },
  })
}

export async function getThreadMessages(prisma: PrismaClient, userId: string, threadId: string, mode: OperationalMode = "REAL") {
  return prisma.coachMessage.findMany({
    where: { threadId, userId, thread: { userId, operationalMode: mode } },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  })
}

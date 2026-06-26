// Coach thread persistence (S6) — the episodic layer of memory: every conversation
// is saved (CoachThread + CoachMessage) so the coach can refer back to it.

import type { PrismaClient } from "@/lib/generated/prisma/client"

/** Resolve a thread for the user: return the owned one, or create a fresh thread. */
export async function ensureThread(prisma: PrismaClient, userId: string, threadId?: string | null) {
  if (threadId) {
    const existing = await prisma.coachThread.findFirst({ where: { id: threadId, userId }, select: { id: true } })
    if (existing) return existing
  }
  return prisma.coachThread.create({ data: { userId }, select: { id: true } })
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

export async function getThreads(prisma: PrismaClient, userId: string, limit = 30) {
  return prisma.coachThread.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    select: { id: true, title: true, summary: true, lastMessageAt: true },
  })
}

export async function getThreadMessages(prisma: PrismaClient, userId: string, threadId: string) {
  return prisma.coachMessage.findMany({
    where: { threadId, userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  })
}

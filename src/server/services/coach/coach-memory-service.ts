// ─────────────────────────────────────────────────────────────────────────────
// Coach memory service (S6) — semantic/identity memory with the anti-poisoning
// frontier (ADR-003 / FREEZE-D9). The LLM may only PROPOSE candidates; the user
// (or deterministic support, later) confirms. Only CONFIRMED memory is injected
// into the prompt, alongside the user's ACTIVE COMMITMENTS (so a new conversation
// references real prior facts/commitments — C2). Memory is fully user-controlled:
// create / confirm / edit / delete (ADR-003 §3).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { assembleContextBlock, proposeMemory, type MemoryKind } from "@/domains/cognitive/coach/memory"

/**
 * Build the dynamic MEMORY block injected into the coach prompt: confirmed
 * identity + facts/preferences, the user's active commitments, and the previous
 * thread's summary — budget-bounded by the pure assembler (FREEZE-D10).
 */
export async function assembleCoachContext(prisma: PrismaClient, userId: string): Promise<string> {
  const [confirmed, commitments, lastThread] = await Promise.all([
    prisma.coachMemory.findMany({
      where: { userId, status: "confirmed" },
      orderBy: { updatedAt: "desc" },
      select: { kind: true, content: true },
      take: 50,
    }),
    prisma.commitment.findMany({
      where: { userId, status: "active", archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: { text: true, status: true },
      take: 10,
    }),
    prisma.coachThread.findFirst({
      where: { userId, summary: { not: null } },
      orderBy: { lastMessageAt: "desc" },
      select: { summary: true },
    }),
  ])

  const identity = confirmed.filter((m) => m.kind === "identity").map((m) => m.content).join("; ") || null
  const facts = confirmed.filter((m) => m.kind !== "identity").map((m) => ({ kind: m.kind, content: m.content }))

  return assembleContextBlock({
    identity,
    confirmedMemories: facts,
    commitments: commitments.map((c) => ({ text: c.text, status: c.status })),
    lastSummary: lastThread?.summary ?? null,
  })
}

export async function listMemory(prisma: PrismaClient, userId: string) {
  return prisma.coachMemory.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { id: true, kind: true, content: true, status: true, source: true, createdAt: true },
  })
}

/** User adds a memory directly → trusted (confirmed, source=user). */
export async function createMemory(prisma: PrismaClient, userId: string, kind: MemoryKind, content: string) {
  return prisma.coachMemory.create({
    data: { userId, kind, content: content.trim(), status: "confirmed", source: "user" },
    select: { id: true },
  })
}

/** Confirm a candidate (LLM proposal) → it becomes injectable. */
export async function confirmMemory(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  await prisma.coachMemory.updateMany({ where: { id, userId }, data: { status: "confirmed" } })
}

/** Edit content — a user edit makes it trusted (source=user). */
export async function editMemory(prisma: PrismaClient, userId: string, id: string, content: string): Promise<void> {
  await prisma.coachMemory.updateMany({ where: { id, userId }, data: { content: content.trim(), source: "user" } })
}

export async function deleteMemory(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  await prisma.coachMemory.deleteMany({ where: { id, userId } })
}

/**
 * Persist LLM-proposed memories as CANDIDATES (never confirmed — D9). The producer
 * (the proactive worker / summarizer) lands in S7; the frontier + storage exist now.
 */
export async function proposeMemories(
  prisma: PrismaClient,
  userId: string,
  threadId: string,
  items: { kind: MemoryKind; content: string }[],
): Promise<number> {
  if (items.length === 0) return 0
  const data = items.map((i) => {
    const p = proposeMemory(i.kind, i.content, threadId)
    return { userId, kind: p.kind, content: p.content, status: p.status, source: p.source, sourceThreadId: threadId }
  })
  const res = await prisma.coachMemory.createMany({ data })
  return res.count
}

// ─────────────────────────────────────────────────────────────────────────────
// Coach memory service (S6) — semantic/identity memory with the anti-poisoning
// frontier (ADR-003 / FREEZE-D9). The LLM may only PROPOSE candidates; the user
// (or deterministic support, later) confirms. Only CONFIRMED memory is injected
// into the prompt, alongside the user's ACTIVE COMMITMENTS (so a new conversation
// references real prior facts/commitments — C2). Memory is fully user-controlled:
// create / confirm / edit / delete (ADR-003 §3).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { assembleContextBlock, proposeMemory, parseMemoryExtraction, type MemoryKind } from "@/domains/cognitive/coach/memory"
import { completeText } from "@/lib/ai/complete"
import { getSalientEpisodes } from "@/server/services/memory/memory-episode-service"
import { getConfirmedPatterns } from "@/server/services/memory/memory-pattern-service"
import { getIdentity, composeIdentityLine } from "@/server/services/memory/memory-identity-service"
import { getImprovementSeries } from "@/server/services/improvement/improvement-snapshot-service"

/**
 * Build the dynamic MEMORY block injected into the coach prompt: confirmed
 * identity + facts/preferences, the user's active commitments, and the previous
 * thread's summary — budget-bounded by the pure assembler (FREEZE-D10).
 */
export async function assembleCoachContext(prisma: PrismaClient, userId: string): Promise<string> {
  const [confirmed, commitments, lastThread, episodes, patterns, identityRow, series] = await Promise.all([
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
    getSalientEpisodes(prisma, userId, 4).catch(() => []),
    getConfirmedPatterns(prisma, userId, 5).catch(() => []),
    getIdentity(prisma, userId).catch(() => null),
    getImprovementSeries(prisma, userId, 90).catch(() => []),
  ])

  // Identity layer (E15) — structured record + any confirmed kind:identity facts.
  const identityParts = [
    composeIdentityLine(identityRow),
    ...confirmed.filter((m) => m.kind === "identity").map((m) => m.content),
  ].filter((s): s is string => !!s)
  const identity = identityParts.length > 0 ? identityParts.join("; ") : null

  // Improvement layer (E16) — North Star narrative from the E19 series.
  let improvement: string | null = null
  if (series.length >= 2) {
    const first = series[0].score
    const last = series[series.length - 1].score
    const delta = Math.round(last - first)
    improvement = `índice de mejora ${Math.round(last)} (${delta >= 0 ? "+" : ""}${delta} vs hace ${series.length} días)`
  }

  // Semantic layer (E14) — confirmed facts (CoachMemory) + data-confirmed patterns.
  const facts = [
    ...confirmed.filter((m) => m.kind !== "identity").map((m) => ({ kind: m.kind, content: m.content })),
    ...patterns.map((p) => ({ kind: "pattern", content: p.text })),
  ]

  return assembleContextBlock({
    identity,
    improvement,
    confirmedMemories: facts,
    commitments: commitments.map((c) => ({ text: c.text, status: c.status })),
    episodes: episodes.map((e) => ({ content: e.content })),
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
  // Dedupe against existing memory (candidate or confirmed) so repeated
  // summarization doesn't pile up duplicates.
  const existing = await prisma.coachMemory.findMany({ where: { userId }, select: { content: true } })
  const seen = new Set(existing.map((m) => m.content.toLowerCase()))
  const fresh = items.filter((i) => i.content.trim() && !seen.has(i.content.trim().toLowerCase()))
  if (fresh.length === 0) return 0
  const data = fresh.map((i) => {
    const p = proposeMemory(i.kind, i.content, threadId)
    return { userId, kind: p.kind, content: p.content, status: p.status, source: p.source, sourceThreadId: threadId }
  })
  const res = await prisma.coachMemory.createMany({ data })
  return res.count
}

const SUMMARIZE_SYSTEM = `Eres un extractor de memoria para un coach de trading. A partir de la conversación, devuelve SOLO un objeto JSON válido con esta forma:
{"summary":"resumen en 1-2 frases en español","facts":[{"kind":"fact|preference","content":"hecho/preferencia estable del trader"}]}
Reglas: máximo 5 hechos; solo hechos ESTABLES y verificables sobre el trader (no eventos puntuales); si no hay hechos claros, usa facts:[]. No inventes. Responde únicamente el JSON.`

/**
 * Thread summarization + candidate-fact extraction (S6 "job de resumen+extracción").
 * Best-effort + cost-gated (runs every 4 messages). The LLM only PROPOSES candidates
 * (proposeMemories → status='candidate'); the user confirms (D9). No-ops without a key.
 */
export async function summarizeThread(prisma: PrismaClient, userId: string, threadId: string): Promise<void> {
  const msgs = await prisma.coachMessage.findMany({
    where: { threadId, userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  })
  if (msgs.length < 4 || msgs.length % 4 !== 0) return // cost gate
  const transcript = msgs.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 6000)

  let raw: string | null
  try {
    raw = await completeText(prisma, userId, "ai_chat", [{ role: "user", content: transcript }], [{ text: SUMMARIZE_SYSTEM }])
  } catch {
    return
  }
  if (!raw) return

  const { summary, facts } = parseMemoryExtraction(raw)
  if (summary) await prisma.coachThread.update({ where: { id: threadId }, data: { summary } }).catch(() => {})
  if (facts.length) await proposeMemories(prisma, userId, threadId, facts).catch(() => {})
}

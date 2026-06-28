// ─────────────────────────────────────────────────────────────────────────────
// Identity memory service (E15, v3.2 §6). One structured, user-editable record per
// user that calibrates the coach (tone/focus/style). User-owned — not LLM-written.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"

export interface IdentityInput {
  tone?: string | null
  focus?: string | null
  summary?: string | null
}

export async function getIdentity(prisma: PrismaClient, userId: string) {
  return prisma.memoryIdentity.findUnique({
    where: { userId },
    select: { tone: true, focus: true, summary: true, updatedAt: true },
  })
}

export async function upsertIdentity(prisma: PrismaClient, userId: string, input: IdentityInput) {
  const data = {
    tone: input.tone?.trim() || null,
    focus: input.focus?.trim() || null,
    summary: input.summary?.trim() || null,
  }
  return prisma.memoryIdentity.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: { tone: true, focus: true, summary: true, updatedAt: true },
  })
}

/** Compose the structured identity into one calibration line for the coach prompt. */
export function composeIdentityLine(id: { tone?: string | null; focus?: string | null; summary?: string | null } | null): string | null {
  if (!id) return null
  const parts: string[] = []
  if (id.summary) parts.push(id.summary.trim())
  if (id.tone) parts.push(`prefiere un tono ${id.tone.trim()}`)
  if (id.focus) parts.push(`foco actual: ${id.focus.trim()}`)
  return parts.length > 0 ? parts.join("; ") : null
}

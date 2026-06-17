// Tag seeding + backfill. Idempotent: only acts when the user has zero tags.
// Seeds the semantic system tags (from the canonical constants) and backfills a
// Tag row for every distinct string already used on the user's trades.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { VIOLATION_TAGS, QUALITY_TAGS } from "@/types"

const SYSTEM_APPEARANCE: Record<string, { color: string; icon: string }> = {
  "Off-plan":  { color: "#ef4444", icon: "alert-triangle" },
  "Impulsivo": { color: "#f59e0b", icon: "zap" },
  "Revanche":  { color: "#ec4899", icon: "swords" },
  "A+":        { color: "#22c55e", icon: "star" },
}

export interface SystemTagDef {
  name: string; color: string; icon: string; category: string; semantic: "violation" | "quality"
}

/** The system tags, derived from the canonical constants (single source of truth). */
export function systemTagDefs(): SystemTagDef[] {
  return [
    ...VIOLATION_TAGS.map((name) => ({
      name, semantic: "violation" as const, category: "Psicología",
      color: SYSTEM_APPEARANCE[name]?.color ?? "#ef4444",
      icon:  SYSTEM_APPEARANCE[name]?.icon ?? "alert-triangle",
    })),
    ...QUALITY_TAGS.map((name) => ({
      name, semantic: "quality" as const, category: "Calidad",
      color: SYSTEM_APPEARANCE[name]?.color ?? "#22c55e",
      icon:  SYSTEM_APPEARANCE[name]?.icon ?? "star",
    })),
  ]
}

/** Create Tag rows with defaults for any names not already catalogued (cheap, hot-path safe). */
export async function ensureTagRows(prisma: PrismaClient, userId: string, names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (clean.length === 0) return
  await prisma.tag.createMany({
    data: clean.map((name) => ({ userId, name })),
    skipDuplicates: true,
  })
}

/** Seed system tags + backfill distinct trade-tag strings. No-op if the user already has tags. */
export async function ensureTagsSeeded(prisma: PrismaClient, userId: string) {
  const existing = await prisma.tag.count({ where: { userId } })
  if (existing > 0) return { seeded: false }

  const sys = systemTagDefs()
  const sysNames = new Set(sys.map((s) => s.name))

  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest(tags) AS tag FROM trades WHERE user_id = ${userId}::uuid
  `
  const userTags = rows.map((r) => r.tag).filter((t) => t && !sysNames.has(t))

  const data = [
    ...sys.map((s, i) => ({
      userId, name: s.name, color: s.color, icon: s.icon,
      category: s.category, semantic: s.semantic, isSystem: true, sortOrder: i,
    })),
    ...userTags.map((name, i) => ({ userId, name, sortOrder: 100 + i })),
  ]
  await prisma.tag.createMany({ data, skipDuplicates: true })
  return { seeded: true, count: data.length }
}

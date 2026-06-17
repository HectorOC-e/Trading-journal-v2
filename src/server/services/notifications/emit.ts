// emitNotification — the single entry point for creating persisted notifications.
// Reads the catalog, applies the user's per-category preferences (P0 bypasses all
// gating), and upserts by dedupeKey. Ephemeral (persist:false) codes are no-ops.
//
//   await emitNotification(prisma, userId, "ACCOUNT_LOCKED",
//     { params: { name, reason }, sourceId: accountId, dedupeKey: `lock:${accountId}` })

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { MESSAGES, type MessageCode } from "@/lib/messages/catalog"
import { resolveMessage } from "@/lib/messages/resolve"
import type { Lang, Priority } from "@/lib/messages/types"

export interface EmitOptions {
  params?: Record<string, unknown>
  sourceId?: string
  dedupeKey?: string
  groupKey?: string
  href?: string
  lang?: Lang
  /** For quiet-hours evaluation; defaults to now. */
  now?: Date
}

const RANK: Record<Priority, number> = { P3: 0, P2: 1, P1: 2, P0: 3 }

type PrefRow = {
  muted: boolean
  minPriority: string
  channels: string[]
  quietStart: string | null
  quietEnd: string | null
  timezone: string
}

/** "HH:MM" of `now` in the given IANA timezone. */
function localHHMM(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone,
    }).format(now)
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now)
  }
}

/** True when `now` falls inside the pref's quiet window (handles past-midnight wrap). */
export function inQuietHours(pref: Pick<PrefRow, "quietStart" | "quietEnd" | "timezone">, now: Date): boolean {
  if (!pref.quietStart || !pref.quietEnd) return false
  const t = localHHMM(now, pref.timezone)
  const { quietStart: s, quietEnd: e } = pref
  // Same-day window (e.g. 13:00–18:00) vs wrap window (e.g. 22:00–07:00).
  return s <= e ? t >= s && t < e : t >= s || t < e
}

/** Decide whether an event passes the user's preferences. P0 always passes. */
export function passesPreferences(priority: Priority, pref: PrefRow | null, now: Date): boolean {
  if (priority === "P0") return true
  if (!pref) return true
  if (pref.muted) return false
  if (!pref.channels.includes("in_app")) return false
  if (RANK[priority] < (RANK[pref.minPriority as Priority] ?? 0)) return false
  if (inQuietHours(pref, now)) return false
  return true
}

export async function emitNotification(
  prisma: PrismaClient,
  userId: string,
  code: MessageCode,
  opts: EmitOptions = {},
) {
  const def = MESSAGES[code]
  if (!def.persist) return null // ephemeral codes never hit the DB

  const now = opts.now ?? new Date()
  const m = resolveMessage(code, opts.params ?? {}, opts.lang ?? "es")

  const pref = (await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId, category: m.category } },
  })) as PrefRow | null

  if (!passesPreferences(m.priority, pref, now)) return null

  const href = opts.href ?? m.actions.find((a) => a.href)?.href ?? null
  const data = {
    userId,
    code,
    type: m.type,
    priority: m.priority,
    category: m.category,
    title: m.title,
    body: m.body,
    params: (opts.params ?? {}) as object,
    href,
    actions: m.actions as object,
    sourceId: opts.sourceId ?? null,
    groupKey: opts.groupKey ?? null,
    dedupeKey: opts.dedupeKey ?? null,
  }

  // Dedupe: refresh an existing live row instead of stacking duplicates.
  if (opts.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: { userId, dedupeKey: opts.dedupeKey },
      select: { id: true },
    })
    if (existing) {
      return prisma.notification.update({
        where: { id: existing.id },
        data: { ...data, readAt: null, archivedAt: null, createdAt: now },
      })
    }
  }

  return prisma.notification.create({ data })
}

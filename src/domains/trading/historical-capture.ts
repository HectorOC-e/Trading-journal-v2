import { TRPCError } from "@trpc/server"
import type { OperationalMode, StoredOperationalMode } from "./operational-mode"
import { isWithinEmotionWindow } from "./services/emotion-provenance"

export type CaptureContext = "LIVE" | "HISTORICAL"
export type EmotionContext = "MARKET" | "PRACTICE"

function invalid(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message })
}

/** Resolve a wall clock in its market zone. DST gaps/overlaps need correction,
 * never an implicit choice of offset or the server's timezone. */
export function marketTimestamp(date: string, time: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) invalid("INVALID_MARKET_TIME")
  const wall = `${date}T${time.length === 5 ? `${time}:00` : time}`
  const naive = new Date(`${wall}Z`)
  if (!Number.isFinite(naive.getTime()) || naive.toISOString().slice(0, 19) !== wall) invalid("INVALID_MARKET_TIME")
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
  } catch { return invalid("INVALID_MARKET_TIME_ZONE") }
  const format = (instant: Date) => {
    const p = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]))
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
  }
  const offsets = new Set<number>()
  for (const hours of [-36, 0, 36]) {
    const probe = new Date(naive.getTime() + hours * 3_600_000)
    offsets.add(new Date(`${format(probe)}Z`).getTime() - probe.getTime())
  }
  const matches = [...offsets].map(offset => new Date(naive.getTime() - offset)).filter(candidate => format(candidate) === wall)
  if (!matches.length) invalid("INVALID_MARKET_TIME")
  if (matches.length !== 1) invalid("AMBIGUOUS_MARKET_TIME")
  return matches[0]
}

/** Explicit ISO timestamps must carry an offset; local strings are ambiguous. */
export function explicitMarketTimestamp(value: string): Date {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalid("INVALID_MARKET_TIMESTAMP")
  const instant = new Date(value)
  if (!Number.isFinite(instant.getTime())) invalid("INVALID_MARKET_TIMESTAMP")
  return instant
}

export function validateMarketSequence(openedAt: Date, closedAt: Date | null, events: Date[] = []): void {
  if (!Number.isFinite(openedAt.getTime()) || (closedAt && (!Number.isFinite(closedAt.getTime()) || closedAt < openedAt))) invalid("INVALID_MARKET_SEQUENCE")
  if (events.some(at => !Number.isFinite(at.getTime()) || at < openedAt || (closedAt != null && at > closedAt))) invalid("INVALID_MARKET_SEQUENCE")
}

export function assertCaptureStatus(context: CaptureContext, status: string): void {
  if (context === "HISTORICAL" && status !== "CLOSED") invalid("HISTORICAL_REQUIRES_CLOSED")
}

/** The reference is the activity, not the time the form happened to be saved.
 * Recollections remain available for history; current samples require a recent,
 * explicit activity. The same rule applies to creation and correction. */
export function emotionProvenance(input: {
  referenceAt: Date; context: EmotionContext; mode: OperationalMode | StoredOperationalMode | null
  now: Date; correction?: boolean
}) {
  if (!Number.isFinite(input.referenceAt.getTime()) || input.referenceAt > input.now) invalid("INVALID_EMOTION_REFERENCE")
  if (input.context === "PRACTICE" && input.mode !== "DEMO" && input.mode !== "BACKTEST") invalid("INVALID_EMOTION_CONTEXT")
  const current = !input.correction && isWithinEmotionWindow(input.referenceAt, input.now)
  return {
    emotionSource: current ? "captured" as const : "reconstructed" as const,
    emotionRecordedAt: input.now,
    emotionReferenceAt: input.referenceAt,
    emotionContext: input.context,
  }
}

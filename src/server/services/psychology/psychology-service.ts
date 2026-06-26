// Psychology v3 service (S8) — pre-session check-in (persist + go/no-go verdict),
// confidence calibration, and longitudinal mood. The scoring lives in the pure
// domain (domains/analytics/psychology/*); this layer is just I/O.

import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client"
import { checkinVerdict, type CheckinResult } from "@/domains/analytics/psychology/checkin"
import { calibration, type CalibrationResult } from "@/domains/analytics/psychology/calibration"
import { moodTrend, type MoodTrendResult, type MoodSample } from "@/domains/analytics/psychology/mood"

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export async function submitCheckin(
  prisma: PrismaClient,
  userId: string,
  input: { mood: number; energy: number; sleep: number; session?: string | null },
): Promise<CheckinResult & { id: string }> {
  const result = checkinVerdict({ mood: input.mood, energy: input.energy, sleep: input.sleep })
  const row = await prisma.preSessionCheckin.create({
    data: {
      userId,
      date: new Date(isoDay(new Date())),
      session: input.session ?? null,
      mood: Math.max(1, Math.min(5, Math.round(input.mood))),
      energy: Math.max(1, Math.min(5, Math.round(input.energy))),
      sleep: Math.max(1, Math.min(5, Math.round(input.sleep))),
      score: result.score,
      verdict: result.verdict,
      reasons: result.reasons as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })
  return { ...result, id: row.id }
}

/** Today's check-in (or the most recent), for surfacing the verdict. */
export async function latestCheckin(prisma: PrismaClient, userId: string) {
  const row = await prisma.preSessionCheckin.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, date: true, mood: true, energy: true, sleep: true, score: true, verdict: true, reasons: true, createdAt: true },
  })
  if (!row) return null
  return {
    ...row,
    date: isoDay(row.date),
    reasons: (row.reasons as string[]) ?? [],
    isToday: isoDay(row.date) === isoDay(new Date()),
  }
}

export async function getCalibration(prisma: PrismaClient, userId: string): Promise<CalibrationResult> {
  const rows = await prisma.trade.findMany({
    where: { userId, status: "CLOSED", confidenceRating: { not: null } },
    select: { confidenceRating: true, pnl: true },
  })
  return calibration(rows.map((r) => ({ confidenceRating: r.confidenceRating, win: r.pnl != null && Number(r.pnl) > 0 })))
}

export async function getMoodTrend(prisma: PrismaClient, userId: string): Promise<MoodTrendResult> {
  const [sessions, checkins] = await Promise.all([
    prisma.tradingSessionLog.findMany({ where: { userId }, select: { date: true, preMood: true, energyLevel: true } }),
    prisma.preSessionCheckin.findMany({ where: { userId }, select: { date: true, mood: true, energy: true } }),
  ])
  const samples: MoodSample[] = [
    ...sessions.map((s) => ({ date: isoDay(s.date), mood: s.preMood, energy: s.energyLevel })),
    ...checkins.map((c) => ({ date: isoDay(c.date), mood: c.mood, energy: c.energy })),
  ]
  return moodTrend(samples, { windowCount: 5, step: 1 })
}

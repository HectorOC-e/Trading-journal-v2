// POST /api/cron/learning-digest — daily Aprendizaje email digest runner.
//
// Triggered hourly by pg_cron → pg_net (see supabase/migrations/*_schedule_learning_digest.sql).
// Auth: `Authorization: Bearer <CRON_SECRET>`. Per user, sends only when the user's
// local hour == DIGEST_HOUR (unless { force: true } in the body, for manual runs).

import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  sendLearningDigestForUser,
  localHour,
  DIGEST_HOUR,
  type DigestStatus,
  type DigestUser,
} from "@/server/services/email/send-learning-digest"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type AuthResult = "ok" | "unconfigured" | "unauthorized"

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function checkCronAuth(authHeader: string | null, secret: string | undefined): AuthResult {
  if (!secret) return "unconfigured"
  const expected = `Bearer ${secret}`
  return authHeader && timingSafeMatch(authHeader, expected) ? "ok" : "unauthorized"
}

const USER_SELECT = {
  id: true, email: true, name: true, emailNotifications: true, timezone: true,
  weeklyGoalMinutes: true, currentStreak: true, bestStreak: true, lastReviewDate: true,
} as const

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { force?: boolean }
  const force = body.force === true
  const now = new Date()

  const users = (await prisma.user.findMany({
    where: { emailNotifications: true },
    select: USER_SELECT,
  })) as DigestUser[]

  const tally: Record<DigestStatus | "skipped" | "error", number> = {
    sent: 0, empty: 0, ineligible: 0, already_sent: 0, send_failed: 0, skipped: 0, error: 0,
  }

  for (const user of users) {
    if (!force && localHour(now, user.timezone) !== DIGEST_HOUR) {
      tally.skipped++
      continue
    }
    try {
      const { status } = await sendLearningDigestForUser({ prisma, now }, user)
      tally[status]++
    } catch (err) {
      tally.error++
      logger.error(`[cron:learning-digest] ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, processed: users.length, ...tally })
}

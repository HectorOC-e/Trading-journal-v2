// Orchestration for the daily Aprendizaje email digest. Per user: check email-channel
// eligibility (opt-in), dedupe via email_log, gather data, build the pure model,
// skip-if-empty, render + send, then log. Render uses the LIGHT variant by default
// (email dark mode is client-controlled and unreliable). See spec §6–§7.

import { render } from "@react-email/render"
import React from "react"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { localDateISO, localHour } from "@/lib/datetime/local"
import { logger } from "@/lib/logger"
import { completedStudyStats } from "@/domains/learning/services/study-session-service"
import { isResourceReviewDue } from "@/domains/learning/services/review-queue"
import { buildLearningDigest, type DigestInput } from "@/domains/learning/services/digest-builder"
import { LearningDigest } from "@/emails/templates/learning-digest"
import { resolveEmailThemeFor } from "./email-theme"
import { isEmailChannelEnabled, type EmailPrefRow } from "./eligibility"
import { sendEmail as defaultSendEmail, type EmailSender } from "./resend-client"

export const LEARNING_CATEGORY = "Aprendizaje"
export const EMAIL_TYPE = "learning_digest"
export const DIGEST_HOUR = 19 // Legacy default; the runner uses the profile HH:mm.
const DEFAULT_GOAL_MIN = 300

export interface DigestUser {
  id: string
  email: string
  name: string
  emailNotifications: boolean
  timezone: string
  learningReminderTime?: string
  weeklyGoalMinutes: number | null
  currentStreak: number
  bestStreak: number
  lastReviewDate: Date | null
}

export interface DigestDeps {
  prisma: PrismaClient
  now?: Date
  scheduledFor?: Date
  appUrl?: string
  sendEmail?: EmailSender
}

export type DigestStatus = "sent" | "empty" | "ineligible" | "already_sent" | "send_failed"

// Re-exported from the shared util so existing importers keep working.
export { localDateISO, localHour }

/** Fetch everything the pure builder needs for one user (the only IO step). */
export async function gatherDigestInput(prisma: PrismaClient, user: DigestUser, now: Date): Promise<DigestInput> {
  const todayISO = localDateISO(now, user.timezone)
  const todayDate = new Date(`${todayISO}T00:00:00Z`)
  const [resources, sessions, plannedRows] = await Promise.all([
    prisma.learningResource.findMany({
      where: { userId: user.id, status: { notIn: ["ABANDONED", "ARCHIVED"] } },
      select: { id: true, title: true, status: true, markedForReview: true, nextReviewAt: true },
      orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
    }),
    prisma.studySession.findMany({
      where: { userId: user.id, status: "completed", durationMin: { gt: 0 } },
      select: { startedAt: true, durationMin: true, status: true, source: true, plannedMin: true, endedAt: true },
    }),
    prisma.studySession.findMany({
      where: { userId: user.id, status: "planned", startedAt: { gte: new Date(todayDate.getTime() - 86_400_000), lt: new Date(todayDate.getTime() + 2 * 86_400_000) } },
      select: { startedAt: true, resource: { select: { title: true } } },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    }),
  ])
  // Broad instant window plus local calendar comparison handles 23/25-hour DST days.
  const planned = plannedRows.find(s => localDateISO(s.startedAt, user.timezone) === todayISO)
  const stats = completedStudyStats(sessions, now, user.timezone)
  const needsReview = resources.filter(r => isResourceReviewDue(r, todayISO)).map(r => ({
    id: r.id, title: r.title,
    nextReviewAt: r.nextReviewAt && r.nextReviewAt <= todayDate ? r.nextReviewAt : todayDate,
    isDecay: false,
  }))

  return {
    name: user.name ?? "",
    todayLocalISO: todayISO,
    streak: { current: stats.currentStreak, best: stats.bestStreak, lastReviewDate: stats.lastStudyDay ? new Date(`${stats.lastStudyDay}T00:00:00Z`) : null },
    needsReview,
    progress: { minutesThisWeek: stats.minutesThisWeek, goalMinutes: user.weeklyGoalMinutes ?? DEFAULT_GOAL_MIN },
    plannedSession: planned ? { title: planned.resource?.title ?? "Sesión de estudio" } : null,
  }
}

export async function sendLearningDigestForUser(deps: DigestDeps, user: DigestUser): Promise<{ status: DigestStatus; error?: string }> {
  const prisma = deps.prisma
  const now = deps.now ?? new Date()
  const send = deps.sendEmail ?? defaultSendEmail
  const appUrl = deps.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://tjournalx.com"

  const pref = (await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId: user.id, category: LEARNING_CATEGORY } },
    select: { muted: true, channels: true, quietStart: true, quietEnd: true, timezone: true },
  })) as EmailPrefRow | null

  if (!isEmailChannelEnabled(user.emailNotifications, pref, now)) {
    return { status: "ineligible" }
  }

  const digestNow = deps.scheduledFor ?? now
  const todayISO = localDateISO(digestNow, user.timezone)

  const already = await prisma.emailLog.findFirst({
    where: { userId: user.id, emailType: EMAIL_TYPE, weekKey: todayISO },
    select: { id: true },
  })
  if (already) return { status: "already_sent" }

  const input = await gatherDigestInput(prisma, user, digestNow)
  const model = buildLearningDigest(input)
  if (model.isEmpty) return { status: "empty" }

  const prefs = await deps.prisma.userPreferences.findUnique({
    where: { userId: user.id },
    select: { theme: true, colorTheme: true, customTheme: true },
  })
  const html = await render(React.createElement(LearningDigest, { model, theme: resolveEmailThemeFor(prefs), appUrl }))
  const subject = model.streak.atRisk
    ? `🔥 Tu racha de ${model.streak.current} días está en riesgo`
    : `📚 Tu repaso de hoy — ${model.reviewCount} recurso${model.reviewCount === 1 ? "" : "s"}`

  const result = await send({ to: user.email, subject, html, idempotencyKey: `learning-digest/${user.id}/${todayISO}` })
  if (!result.ok) return { status: "send_failed", error: result.error }

  try {
    await prisma.emailLog.create({ data: { userId: user.id, emailType: EMAIL_TYPE, weekKey: todayISO } })
  } catch (err) {
    // Unique race (user_id, email_type, week_key) — already logged by a parallel tick.
    logger.warn(`[email] email_log insert race for ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { status: "sent" }
}

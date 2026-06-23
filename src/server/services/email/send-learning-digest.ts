// Orchestration for the daily Aprendizaje email digest. Per user: check email-channel
// eligibility (opt-in), dedupe via email_log, gather data, build the pure model,
// skip-if-empty, render + send, then log. Render uses the LIGHT variant by default
// (email dark mode is client-controlled and unreliable). See spec §6–§7.

import { render } from "@react-email/render"
import React from "react"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { localDateISO, localHour } from "@/lib/datetime/local"
import { logger } from "@/lib/logger"
import { detectDecayedResources } from "@/domains/learning/services/decay-detector"
import { buildLearningDigest, type DigestInput } from "@/domains/learning/services/digest-builder"
import { LearningDigest } from "@/emails/templates/learning-digest"
import { resolveEmailThemeFor } from "./email-theme"
import { isEmailChannelEnabled, type EmailPrefRow } from "./eligibility"
import { sendEmail as defaultSendEmail, type EmailSender } from "./resend-client"

export const LEARNING_CATEGORY = "Aprendizaje"
export const EMAIL_TYPE = "learning_digest"
export const DIGEST_HOUR = 19 // local hour to send (19:00 — catches at-risk before midnight)
const DEFAULT_GOAL_MIN = 300

export interface DigestUser {
  id: string
  email: string
  name: string
  emailNotifications: boolean
  timezone: string
  weeklyGoalMinutes: number | null
  currentStreak: number
  bestStreak: number
  lastReviewDate: Date | null
}

export interface DigestDeps {
  prisma: PrismaClient
  now?: Date
  appUrl?: string
  sendEmail?: EmailSender
}

export type DigestStatus = "sent" | "empty" | "ineligible" | "already_sent" | "send_failed"

// Re-exported from the shared util so existing importers keep working.
export { localDateISO, localHour }

function weekStartUTC(todayISO: string): Date {
  const d = new Date(`${todayISO}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}

/** Fetch everything the pure builder needs for one user (the only IO step). */
export async function gatherDigestInput(prisma: PrismaClient, user: DigestUser, now: Date): Promise<DigestInput> {
  const todayISO = localDateISO(now, user.timezone)
  const todayDate = new Date(`${todayISO}T00:00:00Z`)
  const tomorrow = new Date(todayDate)
  tomorrow.setUTCDate(todayDate.getUTCDate() + 1)

  const [activeReviews, mastered, minuteRows, planned] = await Promise.all([
    prisma.learningResource.findMany({
      where: { userId: user.id, nextReviewAt: { not: null, lte: todayDate }, status: { notIn: ["ABANDONED", "MASTERED"] } },
      select: { id: true, title: true, nextReviewAt: true },
      orderBy: { nextReviewAt: "asc" },
    }),
    prisma.learningResource.findMany({
      where: { userId: user.id, status: "MASTERED", nextReviewAt: { not: null } },
      select: { id: true, title: true, nextReviewAt: true, reviewInterval: true },
    }),
    prisma.learningResource.findMany({
      where: { userId: user.id, progressType: "minutes" },
      select: { weekDeltaMinutes: true, weekDeltaResetAt: true },
    }),
    prisma.studySession.findFirst({
      where: { userId: user.id, status: "planned", startedAt: { gte: todayDate, lt: tomorrow } },
      select: { resource: { select: { title: true } } },
    }),
  ])

  const decayedIds = new Set(
    detectDecayedResources(
      mastered.map(m => ({ id: m.id, status: "MASTERED", nextReviewAt: m.nextReviewAt, reviewInterval: m.reviewInterval })),
      now,
    ),
  )

  const needsReview: DigestInput["needsReview"] = [
    ...activeReviews.map(r => ({ id: r.id, title: r.title, nextReviewAt: r.nextReviewAt!, isDecay: false })),
    ...mastered.filter(m => decayedIds.has(m.id)).map(m => ({ id: m.id, title: m.title, nextReviewAt: m.nextReviewAt!, isDecay: true })),
  ]

  const weekStart = weekStartUTC(todayISO)
  const minutesThisWeek = minuteRows.reduce((s, r) => {
    const stale = !r.weekDeltaResetAt || r.weekDeltaResetAt < weekStart
    return s + (stale ? 0 : (r.weekDeltaMinutes ?? 0))
  }, 0)

  return {
    name: user.name ?? "",
    todayLocalISO: todayISO,
    streak: { current: user.currentStreak, best: user.bestStreak, lastReviewDate: user.lastReviewDate },
    needsReview,
    progress: { minutesThisWeek, goalMinutes: user.weeklyGoalMinutes ?? DEFAULT_GOAL_MIN },
    plannedSession: planned?.resource ? { title: planned.resource.title } : null,
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

  const todayISO = localDateISO(now, user.timezone)

  const already = await prisma.emailLog.findFirst({
    where: { userId: user.id, emailType: EMAIL_TYPE, weekKey: todayISO },
    select: { id: true },
  })
  if (already) return { status: "already_sent" }

  const input = await gatherDigestInput(prisma, user, now)
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

  const result = await send({ to: user.email, subject, html })
  if (!result.ok) return { status: "send_failed", error: result.error }

  try {
    await prisma.emailLog.create({ data: { userId: user.id, emailType: EMAIL_TYPE, weekKey: todayISO } })
  } catch (err) {
    // Unique race (user_id, email_type, week_key) — already logged by a parallel tick.
    logger.warn(`[email] email_log insert race for ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { status: "sent" }
}

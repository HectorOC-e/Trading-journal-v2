import { readReviewSource } from "@/domains/learning/review-source"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { addDaysISO, localDateISO, safeTimeZone, weekStartISO } from "@/lib/datetime/local"
import { compareReviewPriority, isResourceReviewDue, reviewReason } from "@/domains/learning/services/review-queue"

/** First instant of a profile calendar day, including offset/DST transitions. */
function dayBoundary(day: string, timezone: string): Date {
  const midnight = Date.parse(day + "T00:00:00Z")
  let low = midnight - 36 * 3_600_000, high = midnight + 36 * 3_600_000
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (localDateISO(new Date(mid), timezone) < day) low = mid + 1
    else high = mid
  }
  return new Date(low)
}

export async function getDailyPlan(prisma: PrismaClient, userId: string, now = new Date()) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })
  const timezone = safeTimeZone(user.timezone)
  const today = localDateISO(now, timezone), tomorrow = addDaysISO(today, 1), weekStart = weekStartISO(today)
  const [commitments, accounts, resources, sessions, practices] = await Promise.all([
    prisma.commitment.findMany({
      where: { userId, status: "active", archivedAt: null, startAt: { lt: dayBoundary(tomorrow, timezone) }, endAt: { gte: dayBoundary(today, timezone) } },
      orderBy: [{ endAt: "asc" }, { id: "asc" }], take: 5,
      select: { id: true, text: true, startAt: true, endAt: true, reviewSource: true },
    }),
    prisma.account.findMany({
      where: { userId, status: "ACTIVE", type: { notIn: ["DEMO_PERSONAL", "DEMO_PROP", "BACKTEST", "QA"] } },
      orderBy: [{ name: "asc" }, { id: "asc" }], take: 5,
      select: { id: true, name: true, locked: true, lockReason: true },
    }),
    prisma.learningResource.findMany({
      where: { userId, status: { notIn: ["ABANDONED", "ARCHIVED"] }, OR: [{ markedForReview: true }, { nextReviewAt: { lte: new Date(today) }, status: { not: "MASTERED" } }] },
      select: { id: true, title: true, status: true, markedForReview: true, nextReviewAt: true },
    }),
    prisma.studySession.findMany({
      where: { userId, status: "planned", resource: { userId }, startedAt: { lt: new Date(addDaysISO(today, 8)) } },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }], take: 5,
      select: { id: true, resourceId: true, startedAt: true, plannedMin: true, reviewSource: true, resource: { select: { title: true } } },
    }),
    prisma.learningPractice.aggregate({
      where: { userId, date: { gte: new Date(weekStart), lt: new Date(tomorrow) } },
      _count: { id: true }, _sum: { durationMin: true },
    }),
  ])
  return {
    today, timezone,
    commitments: commitments.map(c => {
      const reviewSource = readReviewSource(c.reviewSource)
      return { id: c.id, title: c.text, start: localDateISO(c.startAt, timezone), end: localDateISO(c.endAt, timezone), href: "/analytics", reviewSource, reviewHref: reviewSource ? `/reviews/semanal/${reviewSource.weekStart}` : null }
    }),
    // Links invite reviewing current account risk; they do not grant trading permission.
    accounts: accounts.map(a => ({ ...a, href: "/cuentas" })),
    resources: resources.filter(r => isResourceReviewDue(r, today)).sort((a, b) => compareReviewPriority(a, b, today)).slice(0, 5).map(r => ({ id: r.id, title: r.title, reason: reviewReason(r, today)!.label, href: `/aprendizaje?tab=repaso&resource=${encodeURIComponent(r.id)}` })),
    // Planned startedAt encodes a calendar date at noon UTC, not a real instant.
    sessions: sessions.map(s => {
      const date = s.startedAt.toISOString().slice(0, 10)
      const reviewSource = readReviewSource(s.reviewSource)
      return { reviewSource, reviewHref: reviewSource ? `/reviews/semanal/${reviewSource.weekStart}` : null, id: s.id, title: s.resource.title, date, minutes: s.plannedMin, timing: date < today ? "overdue" as const : date === today ? "today" as const : "upcoming" as const, href: reviewSource ? `/aprendizaje?tab=practicas&plannedSessionId=${encodeURIComponent(s.id)}` : "/aprendizaje?tab=hoy" }
    }),
    practices: { start: weekStart, end: today, sessions: practices._count.id, minutes: practices._sum.durationMin ?? 0, href: "/aprendizaje?tab=practicas&register=1" },
  }
}

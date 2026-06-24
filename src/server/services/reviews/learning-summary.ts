// Light learning summary scoped to a review's week. Read-only: study minutes in the
// window, the user's current/best streak, repasos completed in the window, and how
// many resources are currently marked for review. Reused by the weekly review report.

import type { PrismaClient } from "@/lib/generated/prisma/client"

export interface LearningSummary {
  minutes: number
  streakCurrent: number
  streakBest: number
  reviewsDone: number
  markedForReview: number
}

export async function loadLearningSummary(
  prisma: PrismaClient,
  userId: string,
  window: { from: Date; to: Date },
): Promise<LearningSummary> {
  const [minutesAgg, user, reviewsDone, markedForReview] = await Promise.all([
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: window.from, lt: window.to }, durationMin: { not: null } },
      _sum: { durationMin: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true, bestStreak: true } }),
    prisma.resourceReview.count({ where: { userId, createdAt: { gte: window.from, lt: window.to } } }),
    prisma.learningResource.count({ where: { userId, markedForReview: true } }),
  ])

  return {
    minutes: minutesAgg._sum.durationMin ?? 0,
    streakCurrent: user?.currentStreak ?? 0,
    streakBest: user?.bestStreak ?? 0,
    reviewsDone,
    markedForReview,
  }
}

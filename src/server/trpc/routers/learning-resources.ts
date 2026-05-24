import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { LearningResource, ResourceReview } from "@/lib/generated/prisma/client"

const RESOURCE_TYPES = [
  "LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA",
] as const

const RESOURCE_STATUSES = [
  "PENDING", "IN_PROGRESS", "COMPLETED", "IN_REVIEW", "MASTERED", "ABANDONED",
] as const

const PROGRESS_TYPE_MAP: Record<string, string | null> = {
  VIDEO:       "minutes",
  PODCAST:     "minutes",
  LIBRO:       "pages",
  DRILL:       "sessions",
  BACKTEST:    "sessions",
  NOTA:        null,
  HERRAMIENTA: null,
}

const LearningResourceInput = z.object({
  title:           z.string().min(1),
  type:            z.enum(RESOURCE_TYPES),
  author:          z.string().default(""),
  source:          z.string().default(""),
  date:            z.string().date(),
  notes:           z.string().default(""),
  tags:            z.array(z.string()).default([]),
  markedForReview: z.boolean().default(false),
  progressPct:     z.number().int().min(0).max(100).optional().nullable(),
  totalUnits:      z.number().int().min(1).optional().nullable(),
  currentUnits:    z.number().int().min(0).optional().nullable(),
  reviewInterval:  z.number().int().min(1).optional().nullable(),
})

type SerializedResource = Omit<
  LearningResource,
  "date" | "createdAt" | "updatedAt" | "avgScore" | "nextReviewAt" | "completedAt"
> & {
  date:         string
  createdAt:    string
  updatedAt:    string
  avgScore:     number | null
  nextReviewAt: string | null
  completedAt:  string | null
}

function serializeResource(r: LearningResource): SerializedResource {
  const { avgScore, nextReviewAt, completedAt, date, createdAt, updatedAt, ...rest } = r
  return {
    ...rest,
    date:         date.toISOString().slice(0, 10),
    createdAt:    createdAt.toISOString(),
    updatedAt:    updatedAt.toISOString(),
    avgScore:     avgScore ? avgScore.toNumber() : null,
    nextReviewAt: nextReviewAt ? nextReviewAt.toISOString().slice(0, 10) : null,
    completedAt:  completedAt ? completedAt.toISOString() : null,
  }
}

type SerializedReview = Omit<ResourceReview, "nextReviewAt" | "createdAt"> & {
  nextReviewAt: string
  createdAt:    string
}

function serializeReview(r: ResourceReview): SerializedReview {
  return {
    ...r,
    nextReviewAt: r.nextReviewAt.toISOString().slice(0, 10),
    createdAt:    r.createdAt.toISOString(),
  }
}

// P11-D: interval is per-resource, not a fixed global map.
// masteryLevel adjusts: ≤2 → shorter, ≥4 → longer, else → exact interval.
function calcNextReviewAt(reviewInterval: number, masteryLevel: number): Date {
  let days: number
  if (masteryLevel <= 2) {
    days = Math.max(1, Math.ceil(reviewInterval / 2))
  } else if (masteryLevel >= 4) {
    days = Math.round(reviewInterval * 1.5)
  } else {
    days = reviewInterval
  }
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

function computeProgressPct(currentUnits: number, totalUnits: number | null): number | null {
  if (!totalUnits || totalUnits === 0) return null
  return Math.min(100, Math.round((currentUnits / totalUnits) * 100))
}

function computeStatus(currentUnits: number, totalUnits: number | null): string {
  if (!totalUnits || totalUnits === 0) return currentUnits > 0 ? "IN_PROGRESS" : "PENDING"
  if (currentUnits >= totalUnits) return "COMPLETED"
  if (currentUnits > 0) return "IN_PROGRESS"
  return "PENDING"
}

export const learningResourcesRouter = router({
  list: protectedProcedure
    .input(z.object({
      type:            z.enum(RESOURCE_TYPES).optional(),
      markedForReview: z.boolean().optional(),
      status:          z.enum(RESOURCE_STATUSES).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const resources = await ctx.prisma.learningResource.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.type            ? { type: input.type }                       : {}),
          ...(input?.markedForReview !== undefined
            ? { markedForReview: input.markedForReview }
            : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { date: "desc" },
      })
      return resources.map(serializeResource)
    }),

  create: protectedProcedure
    .input(LearningResourceInput)
    .mutation(({ ctx, input }) => {
      const { date, type, currentUnits, totalUnits, progressPct, ...rest } = input
      const progressType = PROGRESS_TYPE_MAP[type] ?? null
      const computedPct =
        currentUnits != null && totalUnits != null && totalUnits > 0
          ? Math.min(100, Math.round((currentUnits / totalUnits) * 100))
          : (progressPct ?? null)
      return ctx.prisma.learningResource.create({
        data: {
          ...rest,
          type,
          date:         new Date(date),
          userId:       ctx.userId,
          progressType,
          totalUnits:   totalUnits ?? null,
          currentUnits: currentUnits ?? null,
          progressPct:  computedPct,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(LearningResourceInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, date, type, currentUnits, totalUnits, progressPct, ...rest } = input
      const progressType = type ? (PROGRESS_TYPE_MAP[type] ?? null) : undefined
      const computedPct =
        currentUnits != null && totalUnits != null && totalUnits > 0
          ? Math.min(100, Math.round((currentUnits / totalUnits) * 100))
          : progressPct
      return ctx.prisma.learningResource.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(type         ? { type }                     : {}),
          ...(date         ? { date: new Date(date) }     : {}),
          ...(progressType !== undefined ? { progressType } : {}),
          ...(totalUnits   !== undefined ? { totalUnits }  : {}),
          ...(currentUnits !== undefined ? { currentUnits } : {}),
          ...(computedPct  !== undefined ? { progressPct: computedPct } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.learningResource.delete({ where: { id: input, userId: ctx.userId } })
    ),

  toggleMarkedForReview: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id: input, userId: ctx.userId },
        select: { markedForReview: true },
      })
      return ctx.prisma.learningResource.update({
        where: { id: input, userId: ctx.userId },
        data:  { markedForReview: !resource.markedForReview },
      })
    }),

  // Persist a review, calculate nextReviewAt from resource.reviewInterval (P11-D),
  // and update resource.rating + resource.nextReviewAt atomically.
  createReview: protectedProcedure
    .input(z.object({
      resourceId:   z.string().uuid(),
      learned:      z.string().min(1),
      howToApply:   z.string().default(""),
      insights:     z.array(z.string()).default([]),
      rating:       z.number().int().min(0).max(5),
      masteryLevel: z.number().int().min(1).max(5).default(3),
    }))
    .mutation(async ({ ctx, input }) => {
      const { resourceId, masteryLevel, rating, learned, howToApply, insights } = input

      const review = await ctx.prisma.$transaction(async (tx) => {
        const resource = await tx.learningResource.findUniqueOrThrow({
          where: { id: resourceId, userId: ctx.userId },
          select: { reviewInterval: true, status: true },
        })

        const interval = resource.reviewInterval ?? 7
        const nextReviewAt = calcNextReviewAt(interval, masteryLevel)

        const newReview = await tx.resourceReview.create({
          data: {
            userId: ctx.userId,
            resourceId,
            learned,
            howToApply,
            insights,
            rating,
            masteryLevel,
            nextReviewAt,
          },
        })

        await tx.learningResource.update({
          where: { id: resourceId, userId: ctx.userId },
          data: {
            rating,
            nextReviewAt,
            markedForReview: false,
            ...(resource.status === "COMPLETED" ? { status: "IN_REVIEW" } : {}),
          },
        })

        return newReview
      })

      return serializeReview(review)
    }),

  // Update progress by real units; auto-transitions status and computes progressPct.
  updateProgress: protectedProcedure
    .input(z.object({
      id:           z.string().uuid(),
      currentUnits: z.number().int().min(0),
      totalUnits:   z.number().int().positive().optional(),
      progressType: z.enum(["manual", "pages", "minutes", "sessions"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, currentUnits, totalUnits, progressType } = input

      const existing = await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id, userId: ctx.userId },
        select: { totalUnits: true, status: true, completedAt: true },
      })

      const effectiveTotalUnits = totalUnits ?? existing.totalUnits
      const progressPct = computeProgressPct(currentUnits, effectiveTotalUnits)
      const newStatus = computeStatus(currentUnits, effectiveTotalUnits)
      const isNowCompleted = newStatus === "COMPLETED"
      const wasAlreadyCompleted = existing.completedAt !== null

      const resource = await ctx.prisma.learningResource.update({
        where: { id, userId: ctx.userId },
        data: {
          currentUnits,
          ...(totalUnits !== undefined ? { totalUnits }     : {}),
          ...(progressType !== undefined ? { progressType } : {}),
          ...(progressPct !== null ? { progressPct }        : {}),
          status: newStatus,
          ...(isNowCompleted && !wasAlreadyCompleted ? { completedAt: new Date() } : {}),
        },
      })

      return serializeResource(resource)
    }),

  // Explicit status transition; sets completedAt when first reaching COMPLETED.
  updateStatus: protectedProcedure
    .input(z.object({
      id:     z.string().uuid(),
      status: z.enum(RESOURCE_STATUSES),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, status } = input

      const existing = await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id, userId: ctx.userId },
        select: { completedAt: true },
      })

      const resource = await ctx.prisma.learningResource.update({
        where: { id, userId: ctx.userId },
        data: {
          status,
          ...(status === "COMPLETED" && !existing.completedAt ? { completedAt: new Date() } : {}),
        },
      })

      return serializeResource(resource)
    }),

  listReviews: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.prisma.resourceReview.findMany({
        where:   { resourceId: input, userId: ctx.userId },
        orderBy: { createdAt: "desc" },
      })
      return reviews.map(serializeReview)
    }),

  toggleFavorite: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.prisma.learningResource.findUniqueOrThrow({
        where:  { id: input, userId: ctx.userId },
        select: { isFavorite: true },
      })
      return ctx.prisma.learningResource.update({
        where: { id: input, userId: ctx.userId },
        data:  { isFavorite: !resource.isFavorite },
      })
    }),

  // Stats for the right panel. Streak counts only days with resource_reviews (P15-E).
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const dayOfWeek  = todayStart.getDay()
      const daysToMon  = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart  = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - daysToMon)

      const [resources, urgentReviews, minuteResources, reviewTimestamps] = await Promise.all([
        ctx.prisma.learningResource.findMany({
          where:  { userId: ctx.userId, status: { not: "ABANDONED" } },
          select: {
            id: true, title: true, type: true, status: true,
            progressPct: true, currentUnits: true, progressType: true,
            nextReviewAt: true, completedAt: true,
          },
        }),
        ctx.prisma.learningResource.findMany({
          where: {
            userId:       ctx.userId,
            nextReviewAt: { lte: todayStart },
            status:       { notIn: ["ABANDONED", "MASTERED"] },
          },
          select:  { id: true, title: true, type: true, nextReviewAt: true },
          orderBy: { nextReviewAt: "asc" },
          take:    10,
        }),
        ctx.prisma.learningResource.findMany({
          where:  { userId: ctx.userId, progressType: "minutes", updatedAt: { gte: weekStart } },
          select: { currentUnits: true },
        }),
        ctx.prisma.resourceReview.findMany({
          where:   { userId: ctx.userId },
          select:  { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ])

      const completedThisMonth = resources.filter(
        r => r.completedAt !== null && r.completedAt >= monthStart
      ).length

      const pendingReviewsCount = resources.filter(
        r => r.nextReviewAt !== null && r.nextReviewAt <= todayStart
      ).length

      const resourcesByStatus = resources.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      }, {})

      const estimatedHoursThisWeek =
        Math.round(
          minuteResources.reduce((sum, r) => sum + (r.currentUnits ?? 0), 0) / 60 * 10
        ) / 10

      // P15-E: streak = consecutive calendar days going back from today with ≥1 review
      const uniqueReviewDays = new Set(
        reviewTimestamps.map(r => {
          const d = r.createdAt
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        })
      )

      let currentStreak = 0
      const cursor = new Date(todayStart)
      for (let i = 0; i < 365; i++) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
        if (uniqueReviewDays.has(key)) {
          currentStreak++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }

      // P15-E: bestStreak = longest consecutive run in all-time review days
      const sortedDayMs = Array.from(uniqueReviewDays)
        .map(key => {
          const [y, m, d] = key.split("-").map(Number)
          return new Date(y, m, d).getTime()
        })
        .sort((a, b) => a - b)
      let bestStreak = 0
      let tempStreak = sortedDayMs.length > 0 ? 1 : 0
      const DAY_MS = 24 * 60 * 60 * 1000
      for (let i = 1; i < sortedDayMs.length; i++) {
        if (sortedDayMs[i] - sortedDayMs[i - 1] === DAY_MS) {
          tempStreak++
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = 1
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak)

      // Focus resource: overdue review > highest-progress IN_PROGRESS > oldest PENDING
      const inProgress = resources
        .filter(r => r.status === "IN_PROGRESS")
        .sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0))
      const pending = resources.filter(r => r.status === "PENDING")
      const focusCandidate = urgentReviews[0] ?? inProgress[0] ?? pending[0] ?? null

      const serializeStatResource = (r: { id: string; title: string; type: string; nextReviewAt: Date | null }) => ({
        ...r,
        nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString().slice(0, 10) : null,
      })

      return {
        totalResources:          resources.length,
        completedThisMonth,
        pendingReviewsCount,
        urgentReviews:           urgentReviews.map(serializeStatResource),
        resourcesByStatus,
        estimatedHoursThisWeek,
        currentStreak,
        bestStreak,
        focusResource:           focusCandidate ? serializeStatResource(focusCandidate) : null,
      }
    }),
})

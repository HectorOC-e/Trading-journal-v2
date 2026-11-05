import { z } from "zod"
import { addDaysISO, localDateISO, safeTimeZone } from "@/lib/datetime/local"
import { isResourceReviewDue } from "@/domains/learning/services/review-queue"
import { effectiveStudyStartedAt, minutesThisWeek as studyMinutesThisWeek, studyStreak } from "@/domains/learning/services/study-session-service"
import { router, protectedProcedure } from "../init"
import type { LearningResource, ResourceReview } from "@/lib/generated/prisma/client"
import { computeProgressPct, resourceProgressLifecycle } from "@/domains/learning/services/review-scheduler"
import { computeNextReview, type Grade } from "@/domains/learning/srs"
import { getResourceTransfer } from "@/server/services/learning/learning-insights-service"
import { computeNewStreak } from "@/domains/learning/services/streak-service"
import { detectDecayedResources } from "@/domains/learning/services/decay-detector"
import { computeSetupStats } from "@/domains/analytics/services/setup-analytics"
import type { MinimalTrade } from "@/domains/analytics/services/dashboard-analytics"
import { scheduleEmbedding } from "@/server/services/retrieval/pipeline"

/** Fire-and-forget: embebe las notas del recurso (SP2). La escritura del vector
 *  vive ahora en el pipeline de retrieval — un solo dueño de notes_embedding.
 *  Al vaciar las notas se limpia el vector, que sigue siendo la invalidación
 *  correcta: un recurso sin texto no debe seguir siendo recuperable. */
function scheduleResourceEmbedding(resourceId: string, notes: string, userId: string, prismaClient: typeof import("@/lib/prisma").prisma): void {
  if (!notes.trim()) {
    void prismaClient.$executeRaw`UPDATE learning_resources SET notes_embedding = NULL WHERE id = ${resourceId}::uuid`.catch(() => {})
    return
  }
  scheduleEmbedding(prismaClient, userId, "learning_notes", resourceId, notes)
}

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

type LinkedSetup = { id: string; name: string }

type ResourceInput = LearningResource & {
  linkedSetups?: LinkedSetup[]
  reviews?: { createdAt: Date; masteryLevel: number }[]
}

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
  linkedSetups: LinkedSetup[]
  lastReviewAt: string | null
  // Real SRS mastery (1–5) from the most recent ResourceReview; null when never
  // reviewed. The mastery ring prefers this over the status-derived level.
  latestMasteryLevel: number | null
}

function serializeResource(r: ResourceInput): SerializedResource {
  const { avgScore, nextReviewAt, completedAt, date, createdAt, updatedAt, linkedSetups, reviews, ...rest } = r
  return {
    ...rest,
    date:         date.toISOString().slice(0, 10),
    createdAt:    createdAt.toISOString(),
    updatedAt:    updatedAt.toISOString(),
    avgScore:     avgScore ? avgScore.toNumber() : null,
    nextReviewAt: nextReviewAt ? nextReviewAt.toISOString().slice(0, 10) : null,
    completedAt:  completedAt ? completedAt.toISOString() : null,
    linkedSetups: linkedSetups ?? [],
    lastReviewAt: reviews && reviews.length > 0 ? reviews[0].createdAt.toISOString() : null,
    latestMasteryLevel: reviews && reviews.length > 0 ? reviews[0].masteryLevel : null,
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
        include: {
          linkedSetups: { select: { id: true, name: true } },
          reviews: { select: { createdAt: true, masteryLevel: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
      return resources.map(serializeResource)
    }),

  create: protectedProcedure
    .input(LearningResourceInput)
    .mutation(async ({ ctx, input }) => {
      const { date, type, currentUnits, totalUnits, progressPct, ...rest } = input
      const progressType = PROGRESS_TYPE_MAP[type] ?? null
      const computedPct =
        currentUnits != null && totalUnits != null && totalUnits > 0
          ? Math.min(100, Math.round((currentUnits / totalUnits) * 100))
          : (progressPct ?? null)
      const created = await ctx.prisma.learningResource.create({
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
      scheduleResourceEmbedding(created.id, created.notes, ctx.userId, ctx.prisma)
      return created
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(LearningResourceInput.partial().extend({
      // Zod 4 applies defaults inside optional fields; PATCH must preserve omissions.
      author: LearningResourceInput.shape.author.removeDefault().optional(),
      source: LearningResourceInput.shape.source.removeDefault().optional(),
      notes: LearningResourceInput.shape.notes.removeDefault().optional(),
      tags: LearningResourceInput.shape.tags.removeDefault().optional(),
      markedForReview: LearningResourceInput.shape.markedForReview.removeDefault().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const { id, date, type, currentUnits, totalUnits, progressPct, ...rest } = input
      const progressType = type ? (PROGRESS_TYPE_MAP[type] ?? null) : undefined
      const data = {
        ...rest,
        ...(type         ? { type }                     : {}),
        ...(date         ? { date: new Date(date) }     : {}),
        ...(progressType !== undefined ? { progressType } : {}),
        ...(totalUnits   !== undefined ? { totalUnits }  : {}),
        ...(currentUnits !== undefined ? { currentUnits } : {}),
        ...(progressPct  !== undefined ? { progressPct } : {}),
      }
      const where = { id, userId: ctx.userId }
      const updated = currentUnits !== undefined || totalUnits !== undefined
        ? await ctx.prisma.$transaction(async tx => {
            // Serialize with study completion before reading the unchanged counterpart.
            await tx.$queryRaw`SELECT id FROM public.learning_resources WHERE id = ${id}::uuid AND user_id = ${ctx.userId}::uuid FOR UPDATE`
            const existing = await tx.learningResource.findUniqueOrThrow({
              where,
              select: { currentUnits: true, totalUnits: true, status: true, completedAt: true },
            })
            const effectiveCurrent = currentUnits !== undefined ? currentUnits : existing.currentUnits
            const effectiveTotal = totalUnits !== undefined ? totalUnits : existing.totalUnits
            data.progressPct = effectiveCurrent == null ? null : computeProgressPct(effectiveCurrent, effectiveTotal)
            return tx.learningResource.update({ where, data: { ...data, ...resourceProgressLifecycle(existing, effectiveCurrent, effectiveTotal) } })
          })
        : await ctx.prisma.learningResource.update({ where, data })
      // Re-embed when notes were part of this update.
      if (rest.notes !== undefined) scheduleResourceEmbedding(updated.id, updated.notes, ctx.userId, ctx.prisma)
      return updated
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
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { timezone: true },
      })
      const todayISO = localDateISO(new Date(), safeTimeZone(user.timezone))
      const todayMarker = new Date(`${todayISO}T00:00:00Z`)

      // #45 (closure A2): the linked setup's edge bends the SRS cadence — review
      // sooner if the edge is decaying, later if it's improving. Read-only, pre-tx.
      const signal = await getResourceTransfer(ctx.prisma, ctx.userId, resourceId)
      const performance = signal?.performanceSignal ?? null

      const review = await ctx.prisma.$transaction(async (tx) => {
        const resource = await tx.learningResource.findUniqueOrThrow({
          where: { id: resourceId, userId: ctx.userId },
          select: { reviewInterval: true, status: true },
        })
        const reps = await tx.resourceReview.count({ where: { resourceId, userId: ctx.userId } })

        const srs = computeNextReview({
          currentInterval: resource.reviewInterval ?? null,
          reps,
          ease: 2.5,
          grade: masteryLevel as Grade,
          performance,
        })
        const interval = srs.interval
        const nextReviewAt = new Date(`${addDaysISO(todayISO, interval)}T00:00:00Z`)

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
            reviewInterval: interval,
            markedForReview: false,
            ...(resource.status === "COMPLETED" ? { status: "IN_REVIEW" } : {}),
          },
        })

        // TASK-L030: update materialized streak on User
        const u = await tx.user.findUniqueOrThrow({
          where:  { id: ctx.userId },
          select: { currentStreak: true, bestStreak: true, lastReviewDate: true },
        })
        const { newStreak, lastReviewDate: newLastReviewDate } = computeNewStreak(
          u.lastReviewDate,
          u.currentStreak,
          todayMarker,
        )
        await tx.user.update({
          where: { id: ctx.userId },
          data: {
            currentStreak:  newStreak,
            bestStreak:     Math.max(u.bestStreak, newStreak),
            lastReviewDate: newLastReviewDate,
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

      const resource = await ctx.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM public.learning_resources WHERE id = ${id}::uuid AND user_id = ${ctx.userId}::uuid FOR UPDATE`
        const existing = await tx.learningResource.findUniqueOrThrow({
          where: { id, userId: ctx.userId },
          select: {
            totalUnits: true, status: true, completedAt: true,
            currentUnits: true, progressType: true,
            weekDeltaMinutes: true, weekDeltaResetAt: true,
          },
        })

        const effectiveTotalUnits = totalUnits ?? existing.totalUnits
        const progressPct = computeProgressPct(currentUnits, effectiveTotalUnits)

        // Compute weekly delta for minute-tracked resources
        const effectiveProgressType = progressType ?? existing.progressType
        let weekDeltaUpdate: { weekDeltaMinutes: number; weekDeltaResetAt: Date } | undefined
        if (effectiveProgressType === "minutes") {
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const dayOfWeek = todayStart.getDay()
          const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(todayStart)
          weekStart.setDate(weekStart.getDate() - daysToMon)

          const needsReset =
            !existing.weekDeltaResetAt || existing.weekDeltaResetAt < weekStart
          const prevDelta = needsReset ? 0 : (existing.weekDeltaMinutes ?? 0)
          const prevUnits = existing.currentUnits ?? 0
          const increment = Math.max(0, currentUnits - prevUnits)
          weekDeltaUpdate = {
            weekDeltaMinutes: prevDelta + increment,
            weekDeltaResetAt: needsReset ? weekStart : (existing.weekDeltaResetAt ?? weekStart),
          }
        }

        return tx.learningResource.update({
          where: { id, userId: ctx.userId },
          data: {
            currentUnits,
            ...(totalUnits !== undefined ? { totalUnits }     : {}),
            ...(progressType !== undefined ? { progressType } : {}),
            progressPct,
            ...resourceProgressLifecycle(existing, currentUnits, effectiveTotalUnits),
            ...(weekDeltaUpdate !== undefined ? weekDeltaUpdate : {}),
          },
        })
      })

      return serializeResource(resource)
    }),

  // Explicit status transition; sets completedAt when first reaching COMPLETED.
  updateStatus: protectedProcedure
    .input(z.object({
      id:            z.string().uuid(),
      status:        z.enum(RESOURCE_STATUSES),
      archiveReason: z.enum(["irrelevant", "mastered", "no_time"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, status, archiveReason } = input

      const existing = await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id, userId: ctx.userId },
        select: { completedAt: true },
      })

      const resource = await ctx.prisma.learningResource.update({
        where: { id, userId: ctx.userId },
        data: {
          status,
          ...(status === "COMPLETED" && !existing.completedAt ? { completedAt: new Date() } : {}),
          ...(status === "ABANDONED" ? { archiveReason: archiveReason ?? null } : {}),
          ...(status !== "ABANDONED" ? { archiveReason: null } : {}),
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

  // TASK-L014: Update weekly learning goal (P16-E configurable)
  updateGoal: protectedProcedure
    .input(z.number().int().min(1).max(10080))  // 1 min … 7 days in minutes
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: ctx.userId },
        data:  { weeklyGoalMinutes: input },
      })
    ),

  // TASK-L013: Many-to-many LearningResource ↔ Setup
  linkSetup: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid(), setupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.learningResource.findUniqueOrThrow({
        where: { id: input.resourceId, userId: ctx.userId },
      })
      await ctx.prisma.setup.findUniqueOrThrow({
        where: { id: input.setupId, userId: ctx.userId },
      })
      return ctx.prisma.learningResource.update({
        where: { id: input.resourceId },
        data:  { linkedSetups: { connect: { id: input.setupId } } },
      })
    }),

  unlinkSetup: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid(), setupId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.learningResource.update({
        where: { id: input.resourceId, userId: ctx.userId },
        data:  { linkedSetups: { disconnect: { id: input.setupId } } },
      })
    ),

  listBySetup: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const resources = await ctx.prisma.learningResource.findMany({
        where:   { userId: ctx.userId, linkedSetups: { some: { id: input } } },
        orderBy: { date: "desc" },
        include: { linkedSetups: { select: { id: true, name: true } } },
      })
      return resources.map(serializeResource)
    }),

  // TASK-L016: WR of each linked setup since resource was completed (P13-A killer feature)
  setupImpact: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const resource = await ctx.prisma.learningResource.findUniqueOrThrow({
        where:   { id: input, userId: ctx.userId },
        select:  { completedAt: true, linkedSetups: { select: { id: true, name: true } } },
      })
      if (!resource.completedAt) return []

      const completedAt = resource.completedAt

      return Promise.all(
        resource.linkedSetups.map(async (setup) => {
          const trades = await ctx.prisma.trade.findMany({
            where: {
              userId:  ctx.userId,
              setupId: setup.id,
              date:    { gte: completedAt },
              status:  "CLOSED",
            },
            select: { rMultiple: true, pnl: true },
          })
          const wins = trades.filter(
            t => (t.rMultiple ? t.rMultiple.toNumber() > 0 : (t.pnl ? t.pnl.toNumber() > 0 : false))
          ).length
          return {
            setupId:     setup.id,
            setupName:   setup.name,
            totalTrades: trades.length,
            wins,
            winRate:     trades.length > 0 ? Math.round((wins / trades.length) * 100) : null,
            completedAt: completedAt.toISOString(),
          }
        })
      )
    }),

  // Stats share the same local calendar and completed-session metrics as Home.
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date()
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { timezone: true, weeklyGoalMinutes: true },
      })
      const timezone = safeTimeZone(user.timezone)
      const todayISO = localDateISO(now, timezone)
      const [allResources, rawSessions] = await Promise.all([
        ctx.prisma.learningResource.findMany({
          where: { userId: ctx.userId, status: { not: "ABANDONED" } },
          select: {
            id: true, title: true, type: true, status: true, markedForReview: true,
            progressPct: true, currentUnits: true, progressType: true,
            nextReviewAt: true, completedAt: true, reviewInterval: true,
          },
        }),
        ctx.prisma.studySession.findMany({
          where: { userId: ctx.userId, status: "completed", durationMin: { gt: 0 } },
          select: { startedAt: true, durationMin: true, status: true, source: true, plannedMin: true, endedAt: true },
        }),
      ])
      const resources = allResources.filter(r => r.status !== "ABANDONED")
      const sessions = rawSessions
        .filter(s => s.status === "completed" && (s.durationMin ?? 0) > 0)
        .map(s => ({ ...s, startedAt: effectiveStudyStartedAt(s) }))
      const due = resources.filter(r => isResourceReviewDue(r, todayISO))
        .sort((a, b) => (a.nextReviewAt?.toISOString() ?? "").localeCompare(b.nextReviewAt?.toISOString() ?? ""))
      const urgentReviews = due.slice(0, 10)
      const completedThisMonth = resources.filter(r => ["COMPLETED", "IN_REVIEW", "MASTERED"].includes(r.status) && r.completedAt !== null &&
        r.completedAt <= now && localDateISO(r.completedAt, timezone).slice(0, 7) === todayISO.slice(0, 7)).length
      const resourcesByStatus = resources.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      }, {})
      const minutesThisWeek = studyMinutesThisWeek(sessions, now, timezone)
      const sessionDates = sessions.map(s => s.startedAt).filter(d => d <= now)
      const currentStreak = studyStreak(sessionDates, now, timezone)
      const days = [...new Set(sessionDates.map(d => localDateISO(d, timezone)))].sort()
      let bestStreak = 0
      let run = 0
      let previousDay = Number.NEGATIVE_INFINITY
      for (const day of days) {
        const dayNumber = Date.parse(`${day}T00:00:00Z`) / 86_400_000
        run = dayNumber === previousDay + 1 ? run + 1 : 1
        bestStreak = Math.max(bestStreak, run)
        previousDay = dayNumber
      }
      const inProgress = resources.filter(r => r.status === "IN_PROGRESS")
        .sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0))
      const pending = resources.filter(r => r.status === "PENDING")
      const focusCandidate = urgentReviews[0] ?? inProgress[0] ?? pending[0] ?? null
      const serializeStatResource = (r: { id: string; title: string; type: string; nextReviewAt: Date | null }) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString().slice(0, 10) : null,
      })
      return {
        totalResources: resources.length,
        completedThisMonth,
        pendingReviewsCount: due.length,
        urgentReviews: urgentReviews.map(serializeStatResource),
        resourcesByStatus,
        estimatedHoursThisWeek: Math.round(minutesThisWeek / 60 * 10) / 10,
        currentStreak,
        bestStreak,
        focusResource: focusCandidate ? serializeStatResource(focusCandidate) : null,
        weeklyGoalMinutes: user.weeklyGoalMinutes ?? 300,
        minutesThisWeek,
        decayedCount: 0,
      }
    }),

  // TASK-L029: explicit mutation to transition MASTERED → IN_REVIEW for overdue resources.
  // Extracted from `stats` query to fix CQRS violation (queries must not modify state).
  // Call this on page load or tab focus — not on every stats read.
  processDecayTransitions: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { timezone: true },
      })
      const todayISO = localDateISO(new Date(), safeTimeZone(user.timezone))
      const todayStart = new Date(`${todayISO}T00:00:00Z`)

      const resources = await ctx.prisma.learningResource.findMany({
        where:  { userId: ctx.userId, status: { not: "ABANDONED" } },
        select: {
          id: true, status: true, nextReviewAt: true, reviewInterval: true,
        },
      })

      const decayedIds = detectDecayedResources(resources, todayStart)
      if (decayedIds.length > 0) {
        await ctx.prisma.learningResource.updateMany({
          where: { id: { in: decayedIds } },
          data:  { status: "IN_REVIEW" },
        })
      }

      return { transitioned: decayedIds.length }
    }),

  dailyInsight: protectedProcedure
    .query(async ({ ctx }) => {
      const reviews = await ctx.prisma.resourceReview.findMany({
        where:  { userId: ctx.userId, insights: { isEmpty: false } },
        select: {
          insights: true,
          createdAt: true,
          resource: { select: { title: true } },
        },
      })

      const allInsights = reviews.flatMap(r =>
        r.insights.map(insight => ({
          text:          insight,
          resourceTitle: r.resource.title,
          reviewedAt:    r.createdAt.toISOString(),
        }))
      )
      if (allInsights.length === 0) return null

      // Deterministic by day: same insight all day, cycles through pool
      const dayIndex = Math.floor(Date.now() / 86_400_000)
      return allInsights[dayIndex % allInsights.length]
    }),

  // TASK-L028: rank completed resources by WR delta (post - pre completedAt) per linked setup.
  // Uses batched queries (O(2) DB calls regardless of resource/setup count) to avoid N+1.
  resourceImpactRanking: protectedProcedure
    .query(async ({ ctx }) => {
      const resources = await ctx.prisma.learningResource.findMany({
        where: {
          userId:      ctx.userId,
          completedAt: { not: null },
          linkedSetups: { some: {} },
        },
        select: {
          id:           true,
          title:        true,
          type:         true,
          completedAt:  true,
          linkedSetups: { select: { id: true, name: true } },
        },
      })

      if (resources.length === 0) return []

      // Build (setupId, completedAt) pairs for all resource-setup combinations
      type RankedPair = {
        resourceId:    string
        resourceTitle: string
        resourceType:  string
        setupId:       string
        setupName:     string
        completedAt:   Date
      }

      const pairs: RankedPair[] = []
      for (const r of resources) {
        if (!r.completedAt) continue
        for (const s of r.linkedSetups) {
          pairs.push({
            resourceId:    r.id,
            resourceTitle: r.title,
            resourceType:  r.type,
            setupId:       s.id,
            setupName:     s.name,
            completedAt:   r.completedAt,
          })
        }
      }

      if (pairs.length === 0) return []

      // Single batched query: all closed trades for affected setups
      const setupIds = [...new Set(pairs.map(p => p.setupId))]
      const allTrades = await ctx.prisma.trade.findMany({
        where: {
          userId:  ctx.userId,
          setupId: { in: setupIds },
          status:  "CLOSED",
        },
        select: { setupId: true, date: true, pnl: true, rMultiple: true },
      })

      // Group trades by setupId for O(1) lookup
      const bySetup = new Map<string, { date: Date; pnl: number; rMultiple: number | null }[]>()
      for (const t of allTrades) {
        const list = bySetup.get(t.setupId!) ?? []
        list.push({
          date:      t.date as Date,
          pnl:       t.pnl != null ? Number(t.pnl) : 0,
          rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
        })
        bySetup.set(t.setupId!, list)
      }

      function normalizeTrades(raw: { pnl: number; rMultiple: number | null }[], setupId: string): MinimalTrade[] {
        return raw.map((t, i) => ({
          id:        `${setupId}-${i}`,
          accountId: "",
          symbol:    "",
          direction: "LONG",
          session:   null,
          openTime:  null,
          closeTime: null,
          pnl:       t.pnl,
          rMultiple: t.rMultiple,
          tags:      [],
          date:      "2000-01-01",
          setupId,
          entry: 0, stop: 0, target: 0, size: 1,
        }))
      }

      const rows: {
        resourceId:    string
        resourceTitle: string
        resourceType:  string
        setupId:       string
        setupName:     string
        preWinRate:    number | null
        postWinRate:   number | null
        delta:         number | null
        preTrades:     number
        postTrades:    number
        lowConfidence: boolean
      }[] = []

      for (const pair of pairs) {
        const setupTrades = bySetup.get(pair.setupId) ?? []
        const pre  = setupTrades.filter(t => t.date < pair.completedAt)
        const post = setupTrades.filter(t => t.date >= pair.completedAt)

        if (post.length < 5) continue

        const preStats  = computeSetupStats(pair.setupId, normalizeTrades(pre,  pair.setupId))
        const postStats = computeSetupStats(pair.setupId, normalizeTrades(post, pair.setupId))
        const preWR  = pre.length  > 0 ? preStats.winRate  : null
        const postWR = post.length > 0 ? postStats.winRate : null
        const delta  = postWR !== null && preWR !== null ? postWR - preWR : null

        rows.push({
          resourceId:    pair.resourceId,
          resourceTitle: pair.resourceTitle,
          resourceType:  pair.resourceType,
          setupId:       pair.setupId,
          setupName:     pair.setupName,
          preWinRate:    preWR,
          postWinRate:   postWR,
          delta,
          preTrades:     pre.length,
          postTrades:    post.length,
          lowConfidence: post.length < 10,
        })
      }

      // Sort: known delta desc, then null-delta (no pre-data) last
      return rows.sort((a, b) => {
        if (a.delta === null && b.delta === null) return 0
        if (a.delta === null) return 1
        if (b.delta === null) return -1
        return b.delta - a.delta
      })
    }),
})

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import {
  effectiveStudyStartedAt,
  studyStreak,
  minutesThisWeek,
  pickStudySuggestion,
} from "@/domains/learning/services/study-session-service"

import { isResourceReviewDue } from "@/domains/learning/services/review-queue"
import { reviseSession } from "@/server/services/learning/session-revisions"
import { applyStudySessionProgress } from "@/server/services/learning/study-progress"
import { addDaysISO, localDateISO, safeTimeZone, weekStartISO } from "@/lib/datetime/local"

const iso = (d: Date | null) => (d ? d.toISOString() : null)
const dayKey = (d: Date) => d.toISOString().slice(0, 10)

type SessionWithResource = {
  id: string
  resourceId: string
  status: string
  source: string
  startedAt: Date
  endedAt: Date | null
  durationMin: number | null
  plannedMin: number | null
  note: string
  resource: { title: string; type: string }
}

function serializeSession(s: SessionWithResource) {
  return {
    id: s.id,
    resourceId: s.resourceId,
    resourceTitle: s.resource.title,
    resourceType: s.resource.type,
    status: s.status,
    source: s.source,
    startedAt: effectiveStudyStartedAt(s).toISOString(),
    endedAt: iso(s.endedAt),
    durationMin: s.durationMin,
    plannedMin: s.plannedMin,
    note: s.note,
  }
}

// StudySession.durationMin is stored as a PostgreSQL signed integer.
const maxDurationMin = 2_147_483_647

const sessionInclude = { resource: { select: { title: true, type: true } } } as const

export const studySessionsRouter = router({
  /** Current running session (for resume-on-reload), or null. */
  active: protectedProcedure.query(async ({ ctx }) => {
    const s = await ctx.prisma.studySession.findFirst({
      where: { userId: ctx.userId, status: "active" },
      orderBy: { startedAt: "desc" },
      include: sessionInclude,
    })
    return s ? serializeSession(s) : null
  }),

  /** Start a focus session. If one is already active, return it (resume). */
  start: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async tx => {
        // Serialize the check and creation per user, including different tabs.
        await tx.$queryRaw`SELECT id FROM public.users WHERE id = ${ctx.userId}::uuid FOR UPDATE`
        const existing = await tx.studySession.findFirst({
          where: { userId: ctx.userId, status: "active" },
          include: sessionInclude,
        })
        if (existing) return serializeSession(existing)

        const resource = await tx.learningResource.findFirst({
          where: { id: input.resourceId, userId: ctx.userId }, select: { id: true },
        })
        if (!resource) throw new TRPCError({ code: "NOT_FOUND" })

        const created = await tx.studySession.create({
          data: { userId: ctx.userId, resourceId: input.resourceId, status: "active", source: "focus" },
          include: sessionInclude,
        })
        return serializeSession(created)
      })
    }),

  /** Finish a session: log duration + note, apply progress to the resource. */
  finish: protectedProcedure
    .input(z.object({ id: z.string().uuid(), durationMin: z.number().finite().int().min(0).max(maxDurationMin), note: z.string().max(2000).default(""), markForReview: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(async tx => {
        const session = await tx.studySession.findFirst({
          where: { id: input.id, userId: ctx.userId },

        })
        if (!session) throw new TRPCError({ code: "NOT_FOUND" })
        if (session.status === "completed") return
        if (session.status !== "active") throw new TRPCError({ code: "CONFLICT", message: "La sesión no está activa" })

        const claimed = await tx.studySession.updateMany({
          where: { id: session.id, userId: ctx.userId, status: "active" },
          data: { status: "completed", endedAt: new Date(), durationMin: input.durationMin, note: input.note },
        })
        if (claimed.count !== 1) {
          // Another request may have committed after our initial read.
          const current = await tx.studySession.findFirst({ where: { id: session.id, userId: ctx.userId } })
          if (current?.status === "completed") return
          throw new TRPCError({ code: "CONFLICT", message: "La sesión ya terminó" })
        }

        const contribution = await applyStudySessionProgress(tx, ctx.userId, session.resourceId, input.durationMin, input.markForReview)
        await tx.studySession.update({ where: { id: session.id }, data: contribution })
      })
      return { ok: true }
    }),

  /** Cancel/discard an active session. */
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.studySession.deleteMany({ where: { id: input.id, userId: ctx.userId, status: "active" } })
      return { ok: true }
    }),

  /** Plan a future study block (shows on the calendar/agenda). */
  plan: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid(), date: z.string().date(), plannedMin: z.number().int().min(5).max(480) }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.prisma.learningResource.findFirst({
        where: { id: input.resourceId, userId: ctx.userId }, select: { id: true },
      })
      if (!resource) throw new TRPCError({ code: "NOT_FOUND" })

      const created = await ctx.prisma.studySession.create({
        data: {
          userId: ctx.userId, resourceId: input.resourceId,
          status: "planned", source: "planned",
          startedAt: new Date(input.date + "T12:00:00Z"), plannedMin: input.plannedMin,
        },
        include: sessionInclude,
      })
      return serializeSession(created)
    }),

  /** Mark a planned block as done (counts as a real session). */
  completePlanned: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(async tx => {
        // Lock before reading plannedMin: reschedule/cancel can otherwise change
        // the plan between the read and its completion claim.
        await tx.$queryRaw`SELECT id FROM public.study_sessions WHERE id = ${input.id}::uuid AND user_id = ${ctx.userId}::uuid FOR UPDATE`
        const session = await tx.studySession.findFirst({
          where: { id: input.id, userId: ctx.userId, status: "planned" },

        })
        if (!session) throw new TRPCError({ code: "NOT_FOUND" })
        const min = session.plannedMin ?? 0
        const now = new Date()
        const claimed = await tx.studySession.updateMany({
          where: { id: session.id, userId: ctx.userId, status: "planned" },
          data: { status: "completed", source: "manual", startedAt: now, endedAt: now, durationMin: min },
        })
        if (claimed.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "La sesión ya terminó" })
        const contribution = await applyStudySessionProgress(tx, ctx.userId, session.resourceId, min)
        await tx.studySession.update({ where: { id: session.id }, data: contribution })
      })
      return { ok: true }
    }),

  /** All editable plans, including overdue and distant future calendar dates. */
  plans: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20), cursor: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.cursor) {
        const cursor = await ctx.prisma.studySession.findFirst({ where: { id: input.cursor, userId: ctx.userId, status: "planned" } })
        if (!cursor) throw new TRPCError({ code: "NOT_FOUND" })
      }
      const rows = await ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "planned" },
        orderBy: [{ startedAt: "asc" }, { id: "asc" }], take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: sessionInclude,
      })
      const page = rows.slice(0, input.limit)
      return { items: page.map(s => ({ id: s.id, resourceId: s.resourceId,
        resourceTitle: s.resource.title, resourceType: s.resource.type,
        date: dayKey(s.startedAt), plannedMin: s.plannedMin,
      })), nextCursor: rows.length > input.limit ? page.at(-1)!.id : null }
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20), cursor: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.cursor) {
        const cursor = await ctx.prisma.studySession.findFirst({ where: { id: input.cursor, userId: ctx.userId, status: { in: ["completed", "voided"] } } })
        if (!cursor) throw new TRPCError({ code: "NOT_FOUND" })
      }
      const rows = await ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: { in: ["completed", "voided"] } },
        orderBy: [{ endedAt: { sort: "desc", nulls: "last" } }, { startedAt: "desc" }, { id: "desc" }], take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { resource: { select: { title: true, type: true, progressType: true } } },
      })
      const hasMore = rows.length > input.limit
      const page = rows.slice(0, input.limit)
      return { items: page.map(s => {
        const supported = ["minutes", "sessions"].includes(s.resource.progressType ?? "")
        const known = s.progressUnitsApplied != null
        const canAdjustProgress = supported && (!known || s.progressTypeAtFinish === s.resource.progressType)
        return { ...serializeSession(s), updatedAt: s.updatedAt.toISOString(),
          revisionCount: Array.isArray(s.revisionLog) ? s.revisionLog.length : 0,
          canAdjustProgress, needsProgressConfirmation: !known && canAdjustProgress,
          progressLabel: !canAdjustProgress ? "Conservar progreso actual" : !known ? "Progreso histórico desconocido" : `${s.progressUnitsApplied} ${s.progressTypeAtFinish === "minutes" ? "minutos" : "sesiones"}`,
        }
      }), nextCursor: hasMore ? page.at(-1)!.id : null }
    }),

  reviseCompleted: protectedProcedure
    .input(z.object({ id: z.string().uuid(), durationMin: z.number().int().min(0).max(maxDurationMin), note: z.string().max(2000), expectedUpdatedAt: z.string().datetime(), adjustProgress: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.prisma.$transaction(tx => reviseSession(tx, ctx.userId, input, false))),

  voidCompleted: protectedProcedure
    .input(z.object({ id: z.string().uuid(), expectedUpdatedAt: z.string().datetime(), adjustProgress: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.prisma.$transaction(tx => reviseSession(tx, ctx.userId, input, true))),

  reschedule: protectedProcedure
    .input(z.object({ id: z.string().uuid(), date: z.string().date(), plannedMin: z.number().int().min(5).max(480) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { timezone: true } })
      if (input.date < localDateISO(new Date(), safeTimeZone(user.timezone))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Elige hoy o una fecha futura." })
      }
      const result = await ctx.prisma.studySession.updateMany({ where: { id: input.id, userId: ctx.userId, status: "planned" }, data: { startedAt: new Date(input.date + "T12:00:00Z"), plannedMin: input.plannedMin } })
      if (result.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "El plan ya cambió o no está disponible." })
      return { ok: true }
    }),

  cancelPlanned: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.studySession.updateMany({ where: { id: input.id, userId: ctx.userId, status: "planned" }, data: { status: "cancelled" } })
      if (result.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "El plan ya cambió o no está disponible." })
      return { ok: true }
    }),

  /** Recent completed sessions (SP2 / history). */
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "completed" },
        orderBy: [{ endedAt: { sort: "desc", nulls: "last" } }, { startedAt: "desc" }],
        take: input?.limit ?? 10,
        include: sessionInclude,
      })
      return rows.map(serializeSession)
    }),

  /** Everything the "Hoy" home tab needs in one round-trip. */
  home: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { weeklyGoalMinutes: true, timezone: true } })
    const timezone = safeTimeZone(user.timezone)
    const todayKey = localDateISO(now, timezone)
    const weekStartKey = weekStartISO(todayKey)
    // Fetch a padded UTC window; assign instants to local days below. Planned
    // blocks and SRS dates are calendar dates and keep their stored date key.
    const weekStart = new Date(addDaysISO(weekStartKey, -1) + "T00:00:00Z")
    const weekEnd = new Date(addDaysISO(weekStartKey, 8) + "T00:00:00Z")
    const horizonKey = addDaysISO(todayKey, 7)
    const horizonEnd = new Date(horizonKey + "T00:00:00Z")

    const [resources, weekSessions, completedRows, plannedUpcoming, setupTrades] = await Promise.all([
      ctx.prisma.learningResource.findMany({
        where: { userId: ctx.userId, status: { not: "ABANDONED" } },
        select: { id: true, title: true, type: true, status: true, progressPct: true, currentUnits: true, totalUnits: true, progressType: true, nextReviewAt: true, markedForReview: true, linkedSetups: { select: { id: true, name: true } } },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "planned", startedAt: { gte: weekStart, lt: weekEnd } },
        select: { startedAt: true, status: true, durationMin: true, plannedMin: true, resourceId: true, resource: { select: { title: true, type: true } } },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "completed", durationMin: { gt: 0 } },
        select: { startedAt: true, durationMin: true, endedAt: true, status: true, source: true, plannedMin: true },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "planned", startedAt: { gte: new Date(todayKey + "T00:00:00Z"), lt: horizonEnd } },
        select: { id: true, startedAt: true, plannedMin: true, resourceId: true, resource: { select: { title: true, type: true } } },
        orderBy: { startedAt: "asc" },
      }),
      ctx.prisma.trade.findMany({
        where: { userId: ctx.userId, status: "CLOSED", setupId: { not: null } },
        select: { setupId: true, pnl: true },
      }),
    ])

    const streakSessions = completedRows.map(s => ({ ...s, startedAt: effectiveStudyStartedAt(s) }))

    // Week strip: 7 days with counts
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const k = addDaysISO(weekStartKey, i)
      const reviews = resources.filter(r => r.nextReviewAt && dayKey(r.nextReviewAt) === k).length
      const sessions = streakSessions.filter(s => s.status === "completed" && (s.durationMin ?? 0) > 0 && s.startedAt <= now && localDateISO(s.startedAt, timezone) === k).length
      const planned = weekSessions.filter(s => s.status === "planned" && dayKey(s.startedAt) === k).length
      return { date: k, isToday: k === todayKey, reviews, sessions, planned }
    })

    // Due reviews (≤ today)
    const due = resources
      .filter(r => isResourceReviewDue(r, todayKey))
      .map(r => ({ id: r.id, title: r.title, type: r.type, status: r.status, markedForReview: r.markedForReview, nextReviewAt: r.nextReviewAt ? dayKey(r.nextReviewAt) : null }))

    // In-progress resources (what you're studying)
    const inProgress = resources
      .filter(r => r.status === "IN_PROGRESS")
      .map(r => ({ id: r.id, title: r.title, type: r.type, progressPct: r.progressPct }))
      .slice(0, 5)

    // Week summary
    const hoursMin = minutesThisWeek(streakSessions, now, timezone)
    const streak = studyStreak(streakSessions.filter(s => (s.durationMin ?? 0) > 0).map(s => s.startedAt), now, timezone)

    // Agenda: upcoming reviews (next 7 days) + planned sessions, merged + sorted
    const agendaReviews = resources
      .filter(r => r.nextReviewAt && r.status !== "MASTERED" && dayKey(r.nextReviewAt) >= todayKey && r.nextReviewAt < horizonEnd)
      .map(r => ({ date: dayKey(r.nextReviewAt!), kind: "review" as const, resourceId: r.id, title: r.title, type: r.type, plannedMin: null as number | null }))
    const agendaPlanned = plannedUpcoming.map(p => ({
      date: dayKey(p.startedAt), kind: "planned" as const, plannedSessionId: p.id,
      resourceId: p.resourceId, title: p.resource.title, type: p.resource.type, plannedMin: p.plannedMin,
    }))
    const agenda = [...agendaReviews, ...agendaPlanned].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12)

    // Coach suggestion (heuristic): weakest setup with a linked, not-mastered resource.
    const setupWins = new Map<string, { wins: number; trades: number }>()
    for (const t of setupTrades) {
      if (!t.setupId) continue
      const s = setupWins.get(t.setupId) ?? { wins: 0, trades: 0 }
      s.trades++
      if (t.pnl != null && Number(t.pnl) > 0) s.wins++
      setupWins.set(t.setupId, s)
    }
    let weakness: { setup: string; winRate: number; resource: { id: string; title: string } } | null = null
    for (const r of resources) {
      if (r.status === "MASTERED") continue
      for (const ls of r.linkedSetups) {
        const w = setupWins.get(ls.id)
        if (!w || w.trades < 3) continue
        const wr = Math.round((w.wins / w.trades) * 100)
        if (!weakness || wr < weakness.winRate) {
          weakness = { setup: ls.name, winRate: wr, resource: { id: r.id, title: r.title } }
        }
      }
    }
    const goalMin = user.weeklyGoalMinutes ?? 300
    const suggestion = pickStudySuggestion({
      overdueReviews: due.map(d => ({ id: d.id, title: d.title })),
      weakness,
      weekMinutes: hoursMin,
      goalMinutes: goalMin,
      streak,
    })

    return {
      resourceCount: resources.length,
      timezone,
      todayKey,
      weekDays,
      due,
      inProgress,
      week: { hoursMin, goalMin, streak },
      agenda,
      suggestion,
    }
  }),
})

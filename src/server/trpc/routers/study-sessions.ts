import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import {
  applyStudyFinish,
  studyStreak,
  minutesThisWeek,
  startOfWeekUTC,
} from "@/domains/learning/services/study-session-service"

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
    startedAt: s.startedAt.toISOString(),
    endedAt: iso(s.endedAt),
    durationMin: s.durationMin,
    plannedMin: s.plannedMin,
    note: s.note,
  }
}

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
      const existing = await ctx.prisma.studySession.findFirst({
        where: { userId: ctx.userId, status: "active" },
        include: sessionInclude,
      })
      if (existing) return serializeSession(existing)

      const created = await ctx.prisma.studySession.create({
        data: { userId: ctx.userId, resourceId: input.resourceId, status: "active", source: "focus" },
        include: sessionInclude,
      })
      return serializeSession(created)
    }),

  /** Finish a session: log duration + note, apply progress to the resource. */
  finish: protectedProcedure
    .input(z.object({ id: z.string().uuid(), durationMin: z.number().int().min(0).max(1440), note: z.string().max(2000).default(""), markForReview: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.studySession.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: { resource: { select: { id: true, title: true, type: true, progressType: true, currentUnits: true, totalUnits: true, status: true } } },
      })
      if (!session) throw new TRPCError({ code: "NOT_FOUND" })

      const update = applyStudyFinish(session.resource, input.durationMin)
      const resourceData: Record<string, unknown> = update
        ? { currentUnits: update.currentUnits, progressPct: update.progressPct, status: update.status }
        // pages/manual/null: at least move PENDING → IN_PROGRESS since they studied it
        : (session.resource.status === "PENDING" ? { status: "IN_PROGRESS" } : {})
      if (input.markForReview) resourceData.markedForReview = true

      await ctx.prisma.$transaction([
        ctx.prisma.studySession.update({
          where: { id: session.id },
          data: { status: "completed", endedAt: new Date(), durationMin: input.durationMin, note: input.note },
        }),
        ctx.prisma.learningResource.update({ where: { id: session.resourceId }, data: resourceData }),
      ])
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
      const session = await ctx.prisma.studySession.findFirst({
        where: { id: input.id, userId: ctx.userId, status: "planned" },
        include: { resource: { select: { id: true, progressType: true, currentUnits: true, totalUnits: true, status: true } } },
      })
      if (!session) throw new TRPCError({ code: "NOT_FOUND" })
      const min = session.plannedMin ?? 0
      const update = applyStudyFinish(session.resource, min)
      await ctx.prisma.$transaction([
        ctx.prisma.studySession.update({
          where: { id: session.id },
          data: { status: "completed", source: "manual", endedAt: new Date(), durationMin: min },
        }),
        ctx.prisma.learningResource.update({
          where: { id: session.resourceId },
          data: update
            ? { currentUnits: update.currentUnits, progressPct: update.progressPct, status: update.status }
            : (session.resource.status === "PENDING" ? { status: "IN_PROGRESS" } : {}),
        }),
      ])
      return { ok: true }
    }),

  /** Recent completed sessions (SP2 / history). */
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "completed" },
        orderBy: { startedAt: "desc" },
        take: input?.limit ?? 10,
        include: sessionInclude,
      })
      return rows.map(serializeSession)
    }),

  /** Everything the "Hoy" home tab needs in one round-trip. */
  home: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const weekStart = startOfWeekUTC(now)
    const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekStart.getUTCDate() + 7)
    const streakWindow = new Date(weekStart); streakWindow.setUTCDate(streakWindow.getUTCDate() - 60)
    const todayKey = dayKey(now)
    const horizonEnd = new Date(now); horizonEnd.setUTCDate(now.getUTCDate() + 7)

    const [resources, weekSessions, streakSessions, plannedUpcoming, user] = await Promise.all([
      ctx.prisma.learningResource.findMany({
        where: { userId: ctx.userId, status: { not: "ABANDONED" } },
        select: { id: true, title: true, type: true, status: true, progressPct: true, currentUnits: true, totalUnits: true, progressType: true, nextReviewAt: true },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: { in: ["completed", "planned"] }, startedAt: { gte: weekStart, lt: weekEnd } },
        select: { startedAt: true, status: true, durationMin: true, plannedMin: true, resourceId: true, resource: { select: { title: true, type: true } } },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "completed", startedAt: { gte: streakWindow } },
        select: { startedAt: true, durationMin: true },
      }),
      ctx.prisma.studySession.findMany({
        where: { userId: ctx.userId, status: "planned", startedAt: { gte: now, lt: horizonEnd } },
        select: { id: true, startedAt: true, plannedMin: true, resourceId: true, resource: { select: { title: true, type: true } } },
        orderBy: { startedAt: "asc" },
      }),
      ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { weeklyGoalMinutes: true } }),
    ])

    // Week strip: 7 days with counts
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setUTCDate(weekStart.getUTCDate() + i)
      const k = dayKey(d)
      const reviews = resources.filter(r => r.nextReviewAt && dayKey(r.nextReviewAt) === k).length
      const sessions = weekSessions.filter(s => s.status === "completed" && dayKey(s.startedAt) === k).length
      const planned = weekSessions.filter(s => s.status === "planned" && dayKey(s.startedAt) === k).length
      return { date: k, isToday: k === todayKey, reviews, sessions, planned }
    })

    // Due reviews (≤ today)
    const due = resources
      .filter(r => r.nextReviewAt && dayKey(r.nextReviewAt) <= todayKey && r.status !== "MASTERED")
      .map(r => ({ id: r.id, title: r.title, type: r.type }))

    // In-progress resources (what you're studying)
    const inProgress = resources
      .filter(r => r.status === "IN_PROGRESS")
      .map(r => ({ id: r.id, title: r.title, type: r.type, progressPct: r.progressPct }))
      .slice(0, 5)

    // Week summary
    const hoursMin = minutesThisWeek(streakSessions.filter(s => s.startedAt >= weekStart), now)
    const streak = studyStreak(streakSessions.map(s => s.startedAt), now)

    // Agenda: upcoming reviews (next 7 days) + planned sessions, merged + sorted
    const agendaReviews = resources
      .filter(r => r.nextReviewAt && r.status !== "MASTERED" && dayKey(r.nextReviewAt) >= todayKey && r.nextReviewAt < horizonEnd)
      .map(r => ({ date: dayKey(r.nextReviewAt!), kind: "review" as const, resourceId: r.id, title: r.title, type: r.type, plannedMin: null as number | null }))
    const agendaPlanned = plannedUpcoming.map(p => ({
      date: dayKey(p.startedAt), kind: "planned" as const, plannedSessionId: p.id,
      resourceId: p.resourceId, title: p.resource.title, type: p.resource.type, plannedMin: p.plannedMin,
    }))
    const agenda = [...agendaReviews, ...agendaPlanned].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12)

    return {
      weekDays,
      due,
      inProgress,
      week: { hoursMin, goalMin: user.weeklyGoalMinutes ?? 300, streak },
      agenda,
    }
  }),
})

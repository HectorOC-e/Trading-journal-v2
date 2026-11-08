import { readReviewSource } from "@/domains/learning/review-source";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import {
  addDaysISO,
  localDateISO,
  safeTimeZone,
  weekStartISO,
} from "@/lib/datetime/local";
import {
  practiceFeedback,
  generatePracticeResponse,
} from "@/server/services/learning/practice-feedback-service";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Fecha inválida",
  );
const fields = z.object({
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().max(1000).optional(),
  assessment: z.enum(["achieved", "partial", "repeat"]).nullable().optional(),
  date: day,
  durationMin: z.number().int().min(1).max(1440),
  exercise: z.string().trim().min(1).max(5000),
  reflection: z.string().trim().max(5000).default(""),
  resourceId: z.string().uuid().nullable().default(null),
});
const identity = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});
const include = {
  resource: { select: { id: true, title: true } },
  attachments: { orderBy: { createdAt: "asc" as const } },
  feedback: { orderBy: { createdAt: "desc" as const }, take: 10 },
};
export const learningPracticesRouter = router({
  suggestExercise: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(160),
        resourceId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resource = input.resourceId
        ? await ctx.prisma.learningResource.findFirst({
            where: { id: input.resourceId, userId: ctx.userId },
            select: { title: true },
          })
        : null;
      if (input.resourceId && !resource)
        throw new TRPCError({ code: "NOT_FOUND" });
      return {
        text: await generatePracticeResponse(
          ctx.prisma,
          ctx.userId,
          { title: input.title, exercise: "", reflection: "", resource },
          "exercise",
        ),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const p = await ctx.prisma.learningPractice.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include,
      });
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...p, reviewSource: readReviewSource(p.reviewSource) };
    }),
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          cursor: z.object({ date: day, id: z.string().uuid() }).optional(),
          resourceId: z.string().uuid().optional(),
          from: day.optional(),
          to: day.optional(),
        })
        .refine((x) => !x.from || !x.to || x.from <= x.to, "Rango inválido"),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.learningPractice.findMany({
        where: {
          userId: ctx.userId,
          resourceId: input.resourceId,
          date: {
            gte: input.from ? new Date(input.from) : undefined,
            lte: input.to ? new Date(input.to) : undefined,
          },
          ...(input.cursor
            ? {
                OR: [
                  { date: { lt: new Date(input.cursor.date) } },
                  {
                    date: new Date(input.cursor.date),
                    id: { lt: input.cursor.id },
                  },
                ],
              }
            : {}),
        },
        include,
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: input.limit + 1,
      });
      const more = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const last = items.at(-1);
      return {
        items: items.map(p => ({ ...p, reviewSource: readReviewSource(p.reviewSource) })),
        nextCursor:
          more && last
            ? { date: last.date.toISOString().slice(0, 10), id: last.id }
            : null,
      };
    }),
  create: protectedProcedure
    .input(fields.extend({ id: z.string().uuid(), plannedSessionId: z.string().uuid().optional(), repeatFromId: z.string().uuid().optional() }).refine(x => !(x.plannedSessionId && x.repeatFromId), "Elige un plan o una práctica anterior."))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { timezone: true },
      });
      if (input.date > localDateISO(new Date(), safeTimeZone(user.timezone)))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La práctica no puede tener fecha futura.",
        });
      if (
        input.resourceId &&
        !(await ctx.prisma.learningResource.findFirst({
          where: { id: input.resourceId, userId: ctx.userId },
        }))
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurso no disponible.",
        });
      return ctx.prisma.$transaction(async (tx) => {
        // One creator per user; retries keep the client-generated practice UUID.
        await tx.$queryRaw`SELECT id FROM public.users WHERE id=${ctx.userId}::uuid FOR UPDATE`;
        const repeated = input.repeatFromId ? await tx.learningPractice.findFirst({where:{id:input.repeatFromId,userId:ctx.userId}}) : null;
        if(input.repeatFromId && !repeated) throw new TRPCError({code:"NOT_FOUND"});
        const existing = await tx.learningPractice.findFirst({ where: { id: input.id, userId: ctx.userId }, include });
        if (existing) {
          if ((existing.plannedSessionId ?? undefined) !== input.plannedSessionId || (repeated && JSON.stringify(readReviewSource(existing.reviewSource)) !== JSON.stringify(readReviewSource(repeated.reviewSource)))) throw new TRPCError({code:"CONFLICT",message:"Esta práctica ya se guardó con otro plan."});
          return { ...existing, reviewSource: readReviewSource(existing.reviewSource) };
        }
        const { plannedSessionId } = input;
        const data = { ...fields.parse(input), id: input.id };
        const plan = plannedSessionId ? await tx.studySession.findFirst({ where: { id: plannedSessionId, userId: ctx.userId, status: "planned" } }) : null;
        if (plannedSessionId && !plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no disponible." });
        if (plan && plan.resourceId !== input.resourceId) throw new TRPCError({ code: "BAD_REQUEST", message: "La práctica debe usar el recurso del plan." });
        const reviewSource = readReviewSource(plan?.reviewSource ?? repeated?.reviewSource);
        if (plan) {
          const now = new Date(input.date + "T12:00:00Z");
          const claimed = await tx.studySession.updateMany({ where: { id: plan.id, userId: ctx.userId, status: "planned" }, data: { status: "completed", source: "practice", durationMin: 0, startedAt: now, endedAt: now } });
          if (claimed.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "El plan ya cambió." });
        }
        const row = await tx.learningPractice.create({ data: { ...data, userId: ctx.userId, date: new Date(input.date), ...(plannedSessionId ? { plannedSessionId } : {}), ...(reviewSource ? { reviewSource } : {}) }, include });
        return { ...row, reviewSource: readReviewSource(row.reviewSource) };
      });
    }),
  update: protectedProcedure
    .input(fields.merge(identity))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { timezone: true },
      });
      if (input.date > localDateISO(new Date(), safeTimeZone(user.timezone)))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La práctica no puede tener fecha futura.",
        });
      if (
        input.resourceId &&
        !(await ctx.prisma.learningResource.findFirst({
          where: { id: input.resourceId, userId: ctx.userId },
        }))
      )
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.$transaction(async (tx) => {
        const current = await tx.learningPractice.findFirst({ where: { id: input.id, userId: ctx.userId } });
        if (!current)
          throw new TRPCError({ code: "NOT_FOUND" });
        const { id, expectedVersion, ...data } = input;
        const result = await tx.learningPractice.updateMany({
          where: { id, userId: ctx.userId, version: expectedVersion },
          data: {
            ...data,
            date: new Date(data.date),
            version: { increment: 1 },
          },
        });
        if (!result.count)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Esta práctica cambió. Conserva tu borrador y vuelve a abrir la versión actual.",
          });
        if (current.plannedSessionId) {
          if (current.resourceId !== input.resourceId) throw new TRPCError({code:"BAD_REQUEST",message:"Conserva el recurso del plan vinculado."});
          if (current.date.toISOString().slice(0, 10) !== input.date) {
            const actualDay = new Date(input.date + "T12:00:00Z");
            await tx.studySession.updateMany({where:{id:current.plannedSessionId,userId:ctx.userId,source:"practice"},data:{durationMin:0,startedAt:actualDay,endedAt:actualDay}});
          }
        }
        const row = await tx.learningPractice.findFirstOrThrow({
          where: { id, userId: ctx.userId },
          include,
        });
        return { ...row, reviewSource: readReviewSource(row.reviewSource) };
      });
    }),
  delete: protectedProcedure
    .input(identity)
    .mutation(async ({ ctx, input }) => {
      // Files are deleted through authenticated Storage before the row; failure leaves a retryable record.
      return ctx.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM learning_practices WHERE id=${input.id}::uuid AND user_id=${ctx.userId}::uuid FOR UPDATE`;
        const p = await tx.learningPractice.findFirst({
          where: { id: input.id, userId: ctx.userId },
          include: { attachments: true },
        });
        if (!p) throw new TRPCError({ code: "NOT_FOUND" });
        if (p.version !== input.expectedVersion)
          throw new TRPCError({
            code: "CONFLICT",
            message: "La práctica cambió. Actualiza antes de eliminar.",
          });
        if (p.attachments.length) {
          const { error } = await createAdminClient()
            .storage.from("practice-images")
            .remove(p.attachments.map((a) => a.path));
          if (error)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "No se pudieron eliminar las capturas. Reintenta.",
            });
        }
        if (p.plannedSessionId) await tx.studySession.updateMany({ where: { id: p.plannedSessionId, userId: ctx.userId, source: "practice", status: "completed" }, data: { status: "planned", source: "planned", durationMin: null, endedAt: null } });
        await tx.learningPractice.deleteMany({
          where: {
            id: p.id,
            userId: ctx.userId,
            version: input.expectedVersion,
          },
        });
        return { ok: true };
      });
    }),
  summary: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: { timezone: true },
    });
    const today = localDateISO(new Date(), safeTimeZone(user.timezone)),
      start = weekStartISO(today);
    const a = await ctx.prisma.learningPractice.aggregate({
      where: {
        userId: ctx.userId,
        date: { gte: new Date(start), lt: new Date(addDaysISO(start, 7)) },
      },
      _count: { id: true },
      _sum: { durationMin: true },
    });
    return {
      start,
      end: addDaysISO(start, 6),
      today,
      timezone: safeTimeZone(user.timezone),
      minutes: a._sum.durationMin ?? 0,
      sessions: a._count.id,
    };
  }),
  feedback: protectedProcedure
    .input(identity.extend({ kind: z.enum(["exercise", "feedback"]) }))
    .mutation(async ({ ctx, input }) =>
      practiceFeedback(ctx.prisma, ctx.supabase, ctx.userId, input),
    ),
});

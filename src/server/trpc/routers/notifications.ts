import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { sendEmail, emailFailureMessage } from "@/server/services/email/resend-client"

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const
const CATEGORIES = ["Cuenta", "Reglas", "Reviews", "Aprendizaje", "Trading", "Sistema"] as const

/** Minimal self-contained HTML for the delivery-test email (light theme). */
function testEmailHtml(name: string | null): string {
  const hi = name ? `Hola ${name},` : "Hola,"
  const when = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px">
      <div style="font-size:13px;font-weight:600;color:#6366f1;letter-spacing:.04em;text-transform:uppercase">Trading Journal</div>
      <h1 style="font-size:20px;margin:12px 0 8px">Correo de prueba ✅</h1>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 12px">${hi} este es un correo de prueba para confirmar que la entrega de notificaciones por correo funciona.</p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0">Si lo recibes, tus correos (Aprendizaje y Reviews) llegarán a esta dirección.</p>
      <p style="font-size:12px;color:#a1a1aa;margin:20px 0 0">Enviado el ${when}</p>
    </div>
  </div></body></html>`
}

export const notificationsRouter = router({
  // Sends a one-off delivery-test email to the signed-in user's own address.
  // Reports the real outcome (sent / dry-run / the actual Resend error) so email
  // delivery can be verified independently of the Aprendizaje / Reviews digests.
  sendTestEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true, name: true } })
    if (!user?.email) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró tu correo." })

    const result = await sendEmail({
      to: user.email,
      subject: "✅ Correo de prueba — Trading Journal",
      html: testEmailHtml(user.name ?? null),
    })
    if (!result.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: emailFailureMessage(result.error) })

    return { to: user.email, dryRun: result.dryRun === true }
  }),

  list: protectedProcedure
    .input(
      z.object({
        cursor:    z.string().uuid().nullish(),
        limit:     z.number().min(1).max(100).default(20),
        unreadOnly: z.boolean().default(false),
        includeArchived: z.boolean().default(false),
        category:  z.enum(CATEGORIES).optional(),
        priority:  z.enum(PRIORITIES).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      const rows = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.includeArchived ? {} : { archivedAt: null }),
          ...(input?.unreadOnly ? { readAt: null } : {}),
          ...(input?.category ? { category: input.category } : {}),
          ...(input?.priority ? { priority: input.priority } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })
      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
    }),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.count({
      where: { userId: ctx.userId, readAt: null, archivedAt: null },
    }),
  ),

  markRead: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.notification.updateMany({
        where: { id: input, userId: ctx.userId, readAt: null },
        data:  { readAt: new Date() },
      }),
    ),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    ctx.prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null, archivedAt: null },
      data:  { readAt: new Date() },
    }),
  ),

  archive: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.notification.updateMany({
        where: { id: input, userId: ctx.userId },
        data:  { archivedAt: new Date(), readAt: new Date() },
      }),
    ),

  preferences: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.notificationPreference.findMany({ where: { userId: ctx.userId } }),
    ),

    update: protectedProcedure
      .input(
        z.object({
          category:    z.enum(CATEGORIES),
          channels:    z.array(z.string()).optional(),
          minPriority: z.enum(PRIORITIES).optional(),
          muted:       z.boolean().optional(),
          quietStart:  z.string().regex(/^\d{2}:\d{2}$/).nullish(),
          quietEnd:    z.string().regex(/^\d{2}:\d{2}$/).nullish(),
          timezone:    z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { category, ...rest } = input
        return ctx.prisma.notificationPreference.upsert({
          where:  { userId_category: { userId: ctx.userId, category } },
          create: { userId: ctx.userId, category, ...rest },
          update: rest,
        })
      }),
  }),
})

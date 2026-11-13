import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { sendEmail, emailFailureMessage } from "@/server/services/email/resend-client"

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const
const CATEGORIES = ["Cuenta", "Reglas", "Reviews", "Aprendizaje", "Trading", "Sistema", "Fiscalidad"] as const

// Tuple cursors retain their boundary even if that notification is deleted.
const cursorUuid = z.string().uuid()
const cursorInstant = z.iso.datetime().refine(value => /\.\d{3}(?:\d{3})?Z$/.test(value))
function decodeNotificationCursor(cursor: string): { createdAt: string; id: string } | null {
  const parts = cursor.split("|")
  if (parts.length !== 2 || !cursorInstant.safeParse(parts[0]).success || !cursorUuid.safeParse(parts[1]).success) return null
  return { createdAt: parts[0], id: parts[1] }
}
const notificationCursor = z.string().max(128).refine(value => cursorUuid.safeParse(value).success || decodeNotificationCursor(value) !== null, "Cursor de notificaciones inválido")

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
        cursor:    notificationCursor.nullish(),
        limit:     z.number().int().min(1).max(100).default(20),
        unreadOnly: z.boolean().default(false),
        includeArchived: z.boolean().default(false),
        category:  z.enum(CATEGORIES).optional(),
        priority:  z.enum(PRIORITIES).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      let boundary = input?.cursor ? decodeNotificationCursor(input.cursor) : null
      if (input?.cursor && !boundary) {
        // Preserve PostgreSQL microseconds when resolving legacy UUID clients too.
        const anchors = await ctx.prisma.$queryRaw<{ id: string; createdAt: string }[]>`
          SELECT id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"
          FROM notifications WHERE user_id = ${ctx.userId}::uuid AND id = ${input.cursor}::uuid
        `
        boundary = anchors[0] ?? null
        if (!boundary) throw new TRPCError({ code: "BAD_REQUEST", message: "El cursor anterior ya no existe. Actualiza las notificaciones." })
      }
      // Prisma Date truncates PostgreSQL microseconds. Keep the boundary as exact
      // database text and compare in PostgreSQL, never via a JavaScript Date.
      const page = await ctx.prisma.$queryRaw<{ id: string; createdAt: string }[]>`
        SELECT id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"
        FROM notifications
        WHERE user_id = ${ctx.userId}::uuid
          AND (${input?.includeArchived ?? false}::boolean OR archived_at IS NULL)
          AND (${!(input?.unreadOnly ?? false)}::boolean OR read_at IS NULL)
          AND (${input?.category ?? null}::text IS NULL OR category = ${input?.category ?? null}::text)
          AND (${input?.priority ?? null}::text IS NULL OR priority = ${input?.priority ?? null}::text)
          AND (${boundary?.createdAt ?? null}::timestamptz IS NULL
            OR (created_at, id) < (${boundary?.createdAt ?? null}::timestamptz, ${boundary?.id ?? null}::uuid))
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit + 1}
      `
      const hasMore = page.length > limit
      const selected = page.slice(0, limit)
      const rows = selected.length ? await ctx.prisma.notification.findMany({
        where: { userId: ctx.userId, id: { in: selected.map(row => row.id) } },
      }) : []
      const byId = new Map(rows.map(row => [row.id, row]))
      const items = selected.flatMap(key => {
        const row = byId.get(key.id)
        return row ? [{ ...row, params: row.params as unknown, actions: row.actions as unknown }] : []
      })
      const last = selected.at(-1)
      return { items, nextCursor: hasMore && last ? `${last.createdAt}|${last.id}` : null }

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

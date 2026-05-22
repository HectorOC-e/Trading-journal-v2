import { initTRPC, TRPCError } from "@trpc/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function createTRPCContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { prisma, supabase, userId: user?.id ?? null }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create()

export const router            = t.router
export const publicProcedure   = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

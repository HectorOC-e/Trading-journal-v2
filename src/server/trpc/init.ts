import { initTRPC, TRPCError } from "@trpc/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function createTRPCContext() {
  const supabase = await createClient()
  // getUser() round-tripped to the Auth server on every single tRPC call (TD-019).
  // getClaims() verifies the access token's ES256 signature against the project's
  // JWKS, which auth-js caches process-wide for 10 minutes, so a warm process
  // resolves the caller without leaving the box. Verification is still
  // cryptographic, not a decode: a forged or tampered token yields no claims.
  const { data } = await supabase.auth.getClaims()
  return { prisma, supabase, userId: data?.claims.sub ?? null }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create()

export const router            = t.router
export const publicProcedure   = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

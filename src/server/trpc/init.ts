import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  isCacheEnabled,
  invalidateCache,
} from "@/domains/analytics/services/analytics-cache";

export async function createTRPCContext() {
  const supabase = await createClient();
  // getUser() round-tripped to the Auth server on every single tRPC call (TD-019).
  // getClaims() verifies the access token's ES256 signature against the project's
  // JWKS, which auth-js caches process-wide for 10 minutes, so a warm process
  // resolves the caller without leaving the box. Verification is still
  // cryptographic, not a decode: a forged or tampered token yields no claims.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  // JWT signatures remain valid after Auth deletion. Durable intent also blocks
  // requests while cleanup is pending, before identity removal has succeeded.
  if (
    userId &&
    (await prisma.accountDeletionJob.findUnique({
      where: { userId },
      select: { userId: true },
    }))
  ) {
    return { prisma, supabase, userId: null };
  }
  return { prisma, supabase, userId };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/**
 * A mutation that changes data `dashboardStats` reads (accounts, setups, markets).
 * Drops the user's cached stats once the mutation succeeds, otherwise the dashboard
 * keeps serving pre-mutation numbers for up to CACHE_TTL_MS.
 *
 * Use this instead of calling invalidateCache() per mutation: the trade path did it
 * by hand and the other routers were simply forgotten, which is the bug this fixes.
 * Over-invalidating only costs a recompute; under-invalidating shows wrong money.
 */
export const dashboardMutation = protectedProcedure.use(
  async ({ ctx, next }) => {
    const result = await next();
    if (result.ok && isCacheEnabled())
      await invalidateCache(ctx.prisma, ctx.userId);
    return result;
  },
);

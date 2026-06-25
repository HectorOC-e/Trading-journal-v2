// POST /api/cron/recompute-insights — daily insight recomputation + historization.
//
// Sprint 0 (v3.1) job for C8/#18: recompute deterministic insights per user and
// persist the diff (create/touch/resolve), emitting domain events on the outbox.
// Auth mirrors the other cron routes: `Authorization: Bearer <CRON_SECRET>`.
// Scheduling (pg_cron → pg_net) is added when the job is promoted to a real
// cadence; for S0 it is invocable manually / by CI smoke. No UI.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { recomputeInsightsForAll } from "@/domains/analytics/insights/recompute-insights"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await recomputeInsightsForAll(prisma)
    logger.info("recompute-insights complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("recompute-insights failed", { err })
    return new NextResponse("recompute failed", { status: 500 })
  }
}

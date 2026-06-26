// POST /api/cron/evaluate-commitments — window-end commitment verification.
//
// Sprint 4 (v3.1) job (BEHAVIOR_ENGINE_V3 §6): evaluate every active commitment
// whose window has closed → CommitmentCheck + state transition + reinforcement +
// commitment.{kept,partial,broken} on the outbox. Auth mirrors the other cron
// routes: `Authorization: Bearer <CRON_SECRET>`. Scheduling (pg_cron → pg_net)
// is an ops step; invocable manually / by CI until then. No UI.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { evaluateWindowCommitments } from "@/server/services/behavior/commitment-service"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await evaluateWindowCommitments(prisma)
    logger.info("evaluate-commitments complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("evaluate-commitments failed", { err })
    return new NextResponse("evaluate failed", { status: 500 })
  }
}

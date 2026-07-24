// POST /api/cron/dispatch-events — outbox dispatcher (ADR-001, FREEZE-D1).
//
// Claims pending domain_events WHOSE TYPE HAS A HANDLER and runs them. Handlers
// are injected from handlers/index.ts (HANDLERS): the import IS the registry, so
// a cold lambda can never run with an empty one. A type with no consumer is not
// claimed at all and stays pending, replayable (FREEZE-D6).
//
// Scheduled every 5 min by 20260724120000 (v3-dispatch-events). It was
// deliberately unscheduled between 20260721190000 and that migration, while no
// consumer existed.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { dispatchPending } from "@/domains/cognitive/events/event-bus"
import { HANDLERS } from "@/domains/cognitive/events/handlers"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await dispatchPending(prisma, HANDLERS)
    logger.info("dispatch-events complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("dispatch-events failed", { err })
    return new NextResponse("dispatch failed", { status: 500 })
  }
}

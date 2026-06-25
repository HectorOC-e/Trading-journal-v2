// POST /api/cron/dispatch-events — outbox dispatcher (ADR-001, FREEZE-D1).
//
// Claims pending domain_events and runs their registered handlers. In Sprint 0
// NO handlers are registered (consumers arrive in S4+), so this is a transport
// validation / ops tool, NOT scheduled in production yet — it would otherwise
// drain events no one consumes. Run manually (Bearer <CRON_SECRET>) to validate
// the G1 spike: an event crosses the outbox to a server consumer reliably.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { dispatchPending } from "@/domains/cognitive/events/event-bus"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await dispatchPending(prisma)
    logger.info("dispatch-events complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("dispatch-events failed", { err })
    return new NextResponse("dispatch failed", { status: 500 })
  }
}

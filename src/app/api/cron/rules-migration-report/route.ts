// POST /api/cron/rules-migration-report — dry-run report for the Rule/Automation
// unification (C6, gate G2). READ-ONLY: surfaces "false protection" descriptive
// rules and ambiguous automations for human review BEFORE any enforcement cutover.
// Auth: `Authorization: Bearer <CRON_SECRET>`. Never writes; never changes blocking.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { buildMigrationReportForAll } from "@/domains/rules/migration-report"

export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const totals = await buildMigrationReportForAll(prisma)
    logger.info("rules-migration-report", { ...totals })
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    logger.error("rules-migration-report failed", { err })
    return new NextResponse("report failed", { status: 500 })
  }
}

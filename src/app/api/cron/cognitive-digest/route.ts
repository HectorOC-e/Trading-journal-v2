// POST /api/cron/cognitive-digest — weekly cognitive digest (C4 / #28, v3.2).
// Emits one notification per active trader summarizing their cognitive week
// (improvement delta, commitments kept/broken, top pattern). Deduped per ISO week,
// so re-runs are safe. Auth mirrors the other cron routes (Bearer CRON_SECRET).

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { sendCognitiveDigestForAll } from "@/server/services/digest/cognitive-digest-service"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await sendCognitiveDigestForAll(prisma)
    logger.info("cognitive-digest complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("cognitive-digest failed", { err })
    return new NextResponse("digest failed", { status: 500 })
  }
}

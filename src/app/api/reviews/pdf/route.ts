// GET /api/reviews/pdf?type=weekly&period=2026-06-15
//        /api/reviews/pdf?type=monthly&period=2026-06
// Streams a server-rendered PDF of the authenticated user's review report.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"
import { renderReviewPdf } from "@/server/services/reviews/render-pdf"
import type { ReviewPeriod } from "@/server/services/email/send-review"

export const runtime = "nodejs"
export const maxDuration = 120

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const type = sp.get("type")
  const periodStr = sp.get("period") ?? ""

  let period: ReviewPeriod
  if (type === "weekly") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStr)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
    period = { kind: "weekly", weekStart: periodStr }
  } else if (type === "monthly") {
    const m = /^(\d{4})-(\d{2})$/.exec(periodStr)
    if (!m) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
    period = { kind: "monthly", year: Number(m[1]), month: Number(m[2]) }
  } else {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
  }

  try {
    const pdf = await renderReviewPdf(prisma, { userId: user.id, period })
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="review-${type}-${periodStr}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    logger.error(`[pdf] renderReviewPdf failed for ${user.id} ${type}/${periodStr}: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
    return NextResponse.json({ error: "PDF_FAILED" }, { status: 500 })
  }
}

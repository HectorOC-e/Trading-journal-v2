import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { BacktestReport } from "@/domains/learning/backtest-session"
import { logger } from "@/lib/logger"
import { createTRPCContext } from "@/server/trpc/init"
import { renderBacktestHtml } from "@/server/services/learning/backtest-pdf"
import { renderHtmlPdf } from "@/server/services/reviews/render-html-pdf"

export const runtime = "nodejs"
export const maxDuration = 120

const request = z.object({ session: z.uuid(), version: z.coerce.number().int().positive().max(2_147_483_647) })

export async function GET(req: NextRequest) {
  const { userId, prisma } = await createTRPCContext()
  if (!userId) return NextResponse.json({ error: "Inicia sesión para descargar el informe." }, { status: 401 })
  const query = request.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!query.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  const { session, version } = query.data
  const row = await prisma.backtestSessionReport.findUnique({ where: { userId_sessionId_number: { userId, sessionId: session, number: version } }, select: { snapshot: true, closedAt: true } })
  if (!row) return NextResponse.json({ error: "Informe no disponible." }, { status: 404 })
  try {
    const html = renderBacktestHtml(row.snapshot as unknown as BacktestReport, { number: version, closedAt: row.closedAt })
    const pdf = new Uint8Array(await renderHtmlPdf(html, true))
    // Use a streamed response for long reports with embedded screenshots.
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(pdf); controller.close() } })
    return new NextResponse(body, { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="backtesting-${session}-v${version}.pdf"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } })
  } catch (error) {
    logger.error(`[pdf] backtesting ${session}/${version}: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.json({ error: "No se pudo generar el PDF. Reintenta." }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { parseMt4Statement, parseCtraderStatement, detectFormat } from "@/domains/trading/services/csv-import"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import type { ParsedTrade } from "@/domains/trading/services/csv-import"

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a dedup key from a trade — used to skip already-imported rows */
function dupKey(t: ParsedTrade): string {
  return `${t.symbol}|${t.openTime}|${t.size}`
}

/** Convert ParsedTrade direction to DB direction */
function toDirection(type: "buy" | "sell"): "LONG" | "SHORT" {
  return type === "buy" ? "LONG" : "SHORT"
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  // 2. Parse multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file      = formData.get("file")
  const accountId = formData.get("accountId")
  const confirm   = formData.get("confirm")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 })
  }
  if (!accountId || typeof accountId !== "string") {
    return NextResponse.json({ error: "Missing accountId field" }, { status: 400 })
  }

  // 3. Verify account belongs to user
  const account = await prisma.account.findUnique({
    where: { id: accountId, userId },
    select: { id: true },
  })
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // 4. Read file text and detect format
  const csvText = await file.text()
  const format  = detectFormat(csvText)

  let parseResult
  if (format === "mt4") {
    parseResult = parseMt4Statement(csvText)
  } else if (format === "ctrader") {
    parseResult = parseCtraderStatement(csvText)
  } else {
    // Try MT4 as default fallback
    parseResult = parseMt4Statement(csvText)
  }

  const { rows, warnings } = parseResult
  const detectedFormat = format === "unknown" ? "mt4" : format

  // 5. Duplicate detection — find existing trades for this account
  const existingTrades = await prisma.trade.findMany({
    where:  { accountId, userId },
    select: { symbol: true, openTime: true, size: true },
  })

  type ExistingTrade = { symbol: string; openTime: string; size: { toNumber?: () => number } | number | string }
  const existingKeys = new Set(
    (existingTrades as ExistingTrade[]).map(t => {
      const openTimeStr = t.openTime ?? ""
      const sizeNum = typeof t.size === "object" && t.size !== null && typeof (t.size as { toNumber?: () => number }).toNumber === "function"
        ? (t.size as { toNumber: () => number }).toNumber()
        : Number(t.size)
      return `${t.symbol}|${openTimeStr}|${sizeNum}`
    })
  )

  const toCreate: ParsedTrade[] = []
  let skipped = 0
  for (const row of rows) {
    if (existingKeys.has(dupKey(row))) {
      skipped++
    } else {
      toCreate.push(row)
    }
  }

  // 6. Dry run: return preview without committing
  if (confirm !== "true") {
    return NextResponse.json({
      format: detectedFormat,
      toCreate,
      skipped,
      warnings,
    })
  }

  // 7. Confirmed import: create trades + TradeEvents in a transaction
  let created = 0
  for (const row of toCreate) {
    try {
      await prisma.$transaction(async (tx) => {
        // Parse the openTime as a Date for the trade `date` field
        const openDate = new Date(row.openTime)
        const dateStr  = openDate.toISOString().slice(0, 10)
        const openTimeStr = openDate.toISOString().slice(11, 16) // "HH:MM"

        const trade = await tx.trade.create({
          data: {
            userId,
            accountId,
            direction:   toDirection(row.type),
            symbol:      row.symbol,
            entry:       row.openPrice,
            stop:        row.sl,
            target:      row.tp,
            size:        row.size,
            date:        openDate,
            openTime:    openTimeStr,
            session:     "New York", // default session for imports
            status:      "CLOSED",
            closePrice:  row.closePrice,
            closeTime:   new Date(row.closeTime).toISOString().slice(11, 16),
            commission:  row.commission,
            pnl:         row.profit,
          },
        })

        // Create OPEN event
        await tx.tradeEvent.create({
          data: {
            userId,
            tradeId:   trade.id,
            type:      "OPEN",
            price:     row.openPrice,
            contracts: row.size,
            notes:     `Importado desde ${detectedFormat.toUpperCase()} (ticket: ${row.ticket})`,
            timestamp: new Date(row.openTime),
          },
        })

        // Create CLOSE event
        await tx.tradeEvent.create({
          data: {
            userId,
            tradeId:   trade.id,
            type:      "CLOSE",
            price:     row.closePrice,
            contracts: row.size,
            notes:     `Cierre importado. Comisión: ${row.commission}. P&L: ${row.profit}`,
            timestamp: new Date(row.closeTime),
          },
        })
      })
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`Trade ${row.ticket}: error al crear — ${msg}`)
    }
  }

  return NextResponse.json({ format: detectedFormat, created, skipped, warnings })
}

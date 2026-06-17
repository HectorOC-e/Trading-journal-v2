// ── Risk Enforcement — DB-aware lock/unlock policy on top of the risk-engine ──
// Single place that decides, for ANY account type with limits configured:
//   • whether a trade is allowed right now (pre-trade guard), and
//   • whether the account must be auto-locked after a trade is written.
//
// Behaviour (confirmed product decisions):
//   • Applies to every account type that has limits configured (not just prop
//     firms). Backtest/QA included — they simply usually have no limits set.
//   • A breach LOCKS the account automatically (locked = true).
//   • Temporal limits (daily/weekly/monthly) auto-reactivate: once the period
//     rolls over and the live risk no longer breaches, the lock is cleared.
//   • The total max-drawdown limit is permanent: it requires a manual unlock.
//   • Manual locks (lockReason "MANUAL" / custom) are always permanent.

import { TRPCError } from "@trpc/server"
import type { AccountLogPayload } from "@/types"
import { computeAccountRisk, accountDrawdown, isPermanentLockReason, type AccountRisk } from "./risk-engine"
import { emitNotification } from "@/server/services/notifications/emit"

/** Human-readable text for an auto-lock reason code. */
const LOCK_REASON_TEXT: Record<string, string> = {
  DAILY_LOSS_LIMIT:   "Límite de pérdida diario alcanzado",
  WEEKLY_LOSS_LIMIT:  "Límite de pérdida semanal alcanzado",
  MONTHLY_LOSS_LIMIT: "Límite de pérdida mensual alcanzado",
  MAX_DRAWDOWN:       "Límite de drawdown total alcanzado",
}

type PrismaClient = typeof import("@/lib/prisma").prisma

/** Account fields needed to evaluate risk + locking. */
export type EnforceableAccount = {
  id:             string
  type:           string
  ddModel:        string | null
  ddDailyPct:     number | null
  ddWeeklyPct:    number | null
  ddMonthlyPct:   number | null
  ddTotalPct:     number | null
  initialBalance: number
  locked:         boolean
  lockReason:     string
}

function sameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
}

/** Day / ISO-week-start / month-start (UTC) for a YYYY-MM-DD reference date. */
function periodBounds(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00Z`)
  const dow = (day.getUTCDay() + 6) % 7 // Monday = 0
  const weekStart = new Date(day);  weekStart.setUTCDate(day.getUTCDate() - dow)
  const monthStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))
  return { day, weekStart, monthStart }
}

function hasAnyLimit(a: EnforceableAccount): boolean {
  return a.ddDailyPct != null || a.ddWeeklyPct != null || a.ddMonthlyPct != null || a.ddTotalPct != null
}

/** Lock an account (auto, on loss-limit breach) and write an audit log. */
async function lockAccount(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
  reason: string,
  limitPct?: number,
  currentPct?: number,
): Promise<void> {
  const acc = await prisma.account.update({
    where: { id: accountId, userId },
    data:  { locked: true, lockReason: reason, lockedAt: new Date() },
    select: { name: true },
  })
  const payload: AccountLogPayload = { event: "LOCKED", reason, limitPct, currentPct, auto: true }
  await prisma.accountLog.create({ data: { userId, accountId, event: "LOCKED", payload } })

  // Notify the trader (secondary to the lock — never let it break enforcement).
  try {
    await emitNotification(prisma, userId, "ACCOUNT_LOCKED", {
      params:    { name: acc.name, reason: LOCK_REASON_TEXT[reason] ?? reason },
      sourceId:  accountId,
      dedupeKey: `lock:${accountId}`,
    })
  } catch (err) {
    console.warn("[risk-enforcement] emitNotification failed:", err instanceof Error ? err.message : err)
  }
}

/** Clear an auto temporal lock once its period has elapsed (with audit). */
async function autoUnlock(prisma: PrismaClient, userId: string, accountId: string, note: string): Promise<void> {
  await prisma.account.update({
    where: { id: accountId, userId },
    data:  { locked: false, lockReason: "", lockedAt: null },
  })
  const payload: AccountLogPayload = { event: "UNLOCKED", note, auto: true }
  await prisma.accountLog.create({ data: { userId, accountId, event: "UNLOCKED", payload } })
}

/**
 * Compute live risk for an account relative to a reference date's periods,
 * reading the full closed-trade history (needed for max drawdown).
 */
export async function loadAccountRisk(
  prisma: PrismaClient,
  userId: string,
  account: EnforceableAccount,
  referenceDate: string,
): Promise<AccountRisk> {
  const bounds = periodBounds(referenceDate)
  const closed = await prisma.trade.findMany({
    where:   { accountId: account.id, userId, status: "CLOSED" },
    select:  { pnl: true, date: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })
  const rows = closed.map(t => ({ pnl: Number(t.pnl ?? 0), date: t.date as Date }))
  const sumFrom = (from: Date) => rows.filter(r => r.date >= from).reduce((s, r) => s + r.pnl, 0)
  const isPropFirm = account.type === "PROP_FIRM" || account.type === "DEMO_PROP"

  return computeAccountRisk({
    initialBalance: account.initialBalance,
    ddDailyPct:     account.ddDailyPct,
    ddWeeklyPct:    account.ddWeeklyPct,
    ddMonthlyPct:   account.ddMonthlyPct,
    ddTotalPct:     account.ddTotalPct,
    dayPnl:         rows.filter(r => sameDay(r.date, bounds.day)).reduce((s, r) => s + r.pnl, 0),
    weekPnl:        sumFrom(bounds.weekStart),
    monthPnl:       sumFrom(bounds.monthStart),
    maxDrawdown:    accountDrawdown(rows.map(r => r.pnl), { isPropFirm, ddModel: account.ddModel }),
  })
}

/**
 * PRE-trade guard. Throws FORBIDDEN ACCOUNT_LOCKED:<reason> when the account
 * may not take a new trade. Auto-reactivates a temporal lock whose period has
 * elapsed, and auto-locks an account that is already in breach (covers
 * imported / pre-existing data).
 */
export async function assertTradeable(
  prisma: PrismaClient,
  userId: string,
  account: EnforceableAccount,
  referenceDate: string,
): Promise<void> {
  // Permanent / manual lock → never tradeable until manually unlocked.
  if (account.locked && isPermanentLockReason(account.lockReason)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `ACCOUNT_LOCKED:${account.lockReason || "MANUAL"}` })
  }

  // Nothing to evaluate without limits — but still clear a dangling temporal lock.
  if (!hasAnyLimit(account) || account.initialBalance <= 0) {
    if (account.locked) await autoUnlock(prisma, userId, account.id, "Auto-reactivada: sin límites activos")
    return
  }

  const risk = await loadAccountRisk(prisma, userId, account, referenceDate)

  if (risk.breach) {
    // Still (or newly) in breach → ensure locked with the current reason, reject.
    if (!account.locked || account.lockReason !== risk.breach.reason) {
      await lockAccount(prisma, userId, account.id, risk.breach.reason, risk.breach.limitPct, risk.breach.actualPct)
    }
    throw new TRPCError({ code: "FORBIDDEN", message: `ACCOUNT_LOCKED:${risk.breach.reason}` })
  }

  // No live breach. If a temporal auto-lock was standing, the period rolled
  // over (or the loss was corrected) → reactivate the account.
  if (account.locked) {
    await autoUnlock(prisma, userId, account.id, "Auto-reactivada: periodo del límite temporal finalizado")
  }
}

/**
 * POST-trade evaluation. Call after a write that changes realized P&L (close,
 * create-as-closed, edit). Locks the account if the new state breaches a limit.
 * Returns the breach (for surfacing to the client) or null.
 */
export async function evaluateAndLock(
  prisma: PrismaClient,
  userId: string,
  account: EnforceableAccount,
  referenceDate: string,
): Promise<AccountRisk["breach"]> {
  if (!hasAnyLimit(account) || account.initialBalance <= 0) return null

  const risk = await loadAccountRisk(prisma, userId, account, referenceDate)
  if (risk.breach) {
    if (!account.locked || account.lockReason !== risk.breach.reason) {
      await lockAccount(prisma, userId, account.id, risk.breach.reason, risk.breach.limitPct, risk.breach.actualPct)
    }
    return risk.breach
  }
  return null
}

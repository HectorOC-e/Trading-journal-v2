import type { PrismaClient } from '@/lib/generated/prisma/client'
import { TRPCError } from '@trpc/server'
import { fxFactor, USD_VALUE } from '@/lib/fx'

/** A legacy currency must have an explicit known rate; never assume parity. */
export function withdrawalAccountAmount(amount: number, from: string, to: string, rates?: Record<string, number>): number {
  const source = from.trim().toUpperCase(), target = to.trim().toUpperCase()
  if (source !== target) for (const code of [source, target]) {
    const rate = rates?.[code] ?? USD_VALUE[code]
    if (!(typeof rate === 'number' && Number.isFinite(rate) && rate > 0)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Falta una tasa FX válida para ${code}. Configúrala en Perfil para conciliar los retiros históricos.` })
    }
  }
  return amount * fxFactor(source, target, rates)
}

export type CashAdjustment = { paid: number; reserved: number }
/** Cash movements are separate from trading performance; values use account currency. */
export async function loadAccountCashAdjustments(
  db: Pick<PrismaClient, 'withdrawal'>,
  userId: string,
  accounts: { id: string; currency: string }[],
  rates?: Record<string, number>,
): Promise<Map<string, CashAdjustment>> {
  const result = new Map(accounts.map(a => [a.id, { paid: 0, reserved: 0 }]))
  if (!accounts.length) return result
  const currencies = new Map(accounts.map(a => [a.id, a.currency]))
  const rows = await db.withdrawal.findMany({
    where: { userId, accountId: { in: accounts.map(a => a.id) }, status: { not: 'RECHAZADO' } },
    select: { accountId: true, amount: true, currency: true, status: true },
  })
  for (const w of rows) {
    const adjustment = result.get(w.accountId)
    if (!adjustment || w.status === 'RECHAZADO') continue
    const amount = withdrawalAccountAmount(Number(w.amount), w.currency, currencies.get(w.accountId)!, rates)
    if (w.status === 'PAGADO') adjustment.paid += amount
    else adjustment.reserved += amount
  }
  return result
}

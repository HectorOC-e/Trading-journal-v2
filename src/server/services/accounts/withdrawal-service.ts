import { TRPCError } from '@trpc/server'
import type { Prisma, PrismaClient } from '@/lib/generated/prisma/client'
import { parseFxRates } from '@/lib/fx'
import { loadAccountCashAdjustments, withdrawalAccountAmount } from './cash-adjustments'

type Status = 'SOLICITADO' | 'EN_PROCESO' | 'PAGADO' | 'RECHAZADO'
type CreateInput = { requestId?: string; accountId: string; amount: number; currency: string; date: string; note: string; reference: string }
async function lockAccount(tx: Prisma.TransactionClient, userId: string, accountId: string) {
  await tx.$queryRaw`SELECT id FROM public.accounts WHERE id = ${accountId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
  return tx.account.findUniqueOrThrow({ where: { id: accountId, userId }, select: { id: true, initialBalance: true, currency: true } })
}
async function availableCash(tx: Prisma.TransactionClient, userId: string, account: { id: string; initialBalance: unknown; currency: string }) {
  const [user, trades] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: userId }, select: { fxRates: true } }),
    tx.trade.findMany({ where: { userId, accountId: account.id, status: { in: ['OPEN', 'CLOSED'] }, pnl: { not: null } }, select: { pnl: true } }),
  ])
  const cash = (await loadAccountCashAdjustments(tx, userId, [account], parseFxRates(user.fxRates))).get(account.id)!
  return Number(account.initialBalance) + trades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0) - cash.paid - cash.reserved
}
function assertAvailable(amount: number, available: number, currency: string) {
  if (amount > available + 1e-8) throw new TRPCError({ code: 'BAD_REQUEST', message: `El retiro supera el saldo disponible (${available.toFixed(2)} ${currency}), descontados pagos y reservas.` })
}
export async function createWithdrawal(db: PrismaClient, userId: string, input: CreateInput) {
  return db.$transaction(async tx => {
    const account = await lockAccount(tx, userId, input.accountId)
    if (input.currency !== account.currency.trim().toUpperCase()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'La moneda del retiro debe coincidir con la moneda de la cuenta.' })
    if (input.requestId) {
      const existing = await tx.withdrawal.findUnique({ where: { id: input.requestId, userId } })
      if (existing) {
        if (existing.accountId !== input.accountId || Number(existing.amount) !== input.amount || existing.currency !== input.currency || existing.date.toISOString().slice(0,10) !== input.date || existing.note !== input.note) {
          throw new TRPCError({ code: 'CONFLICT', message: 'La solicitud ya existe con otros datos. Revisa el retiro registrado.' })
        }
        return existing
      }
    }
    assertAvailable(input.amount, await availableCash(tx, userId, account), account.currency)
    const withdrawal = await tx.withdrawal.create({ data: { ...(input.requestId ? { id: input.requestId } : {}), userId, accountId: input.accountId, amount: input.amount, currency: input.currency, date: new Date(input.date), note: input.note, reference: input.reference, status: 'SOLICITADO' } })
    await tx.accountLog.create({ data: { userId, accountId: input.accountId, event: 'WITHDRAWAL', payload: { event: 'WITHDRAWAL', amount: input.amount, currency: input.currency, status: 'SOLICITADO', withdrawalId: withdrawal.id, reference: input.reference } } })
    return withdrawal
  })
}
export async function changeWithdrawalStatus(db: PrismaClient, userId: string, input: { id: string; status: Status; reference?: string }) {
  return db.$transaction(async tx => {
    const found = await tx.withdrawal.findUniqueOrThrow({ where: { id: input.id, userId }, select: { accountId: true } })
    const account = await lockAccount(tx, userId, found.accountId)
    const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: input.id, userId } })
    if (current.status === 'RECHAZADO' && input.status !== 'RECHAZADO') {
      const rateUser = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { fxRates: true } })
      const converted = withdrawalAccountAmount(Number(current.amount), current.currency, account.currency, parseFxRates(rateUser.fxRates))
      assertAvailable(converted, await availableCash(tx, userId, account), account.currency)
    }
    if (current.status === input.status && (input.reference === undefined || input.reference === current.reference)) return current
    const updated = await tx.withdrawal.update({ where: { id: input.id, userId }, data: { status: input.status, reference: input.reference ?? undefined } })
    await tx.accountLog.create({ data: { userId, accountId: current.accountId, event: 'WITHDRAWAL_STATUS', payload: { event: 'WITHDRAWAL_STATUS', withdrawalId: input.id, status: input.status, reference: input.reference ?? current.reference } } })
    return updated
  })
}
export async function deleteWithdrawal(db: PrismaClient, userId: string, id: string) {
  return db.$transaction(async tx => {
    const found = await tx.withdrawal.findUniqueOrThrow({ where: { id, userId }, select: { accountId: true } })
    await lockAccount(tx, userId, found.accountId)
    return tx.withdrawal.delete({ where: { id, userId } })
  })
}

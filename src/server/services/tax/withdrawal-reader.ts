import type { Prisma, PrismaClient } from '@/lib/generated/prisma/client';
import { serializeTax, taxHash } from './serializers';
export const sourceSelect = { id: true, userId: true, accountId: true, amount: true, currency: true, status: true, date: true, reference: true, updatedAt: true, account: { select: { id: true, name: true, type: true, status: true, currency: true } } } satisfies Prisma.WithdrawalSelect;
export async function readWithdrawals(db: Pick<PrismaClient, 'withdrawal'>, userId: string, input: {
    cursor?: string;
    limit: number;
}) { const rows = await db.withdrawal.findMany({ where: { userId, status: { not: 'RECHAZADO' }, account: { userId, type: { in: ['PERSONAL', 'PROP_FIRM'] } } }, select: sourceSelect, orderBy: { id: 'asc' }, take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) }); return { items: rows.slice(0, input.limit).map(row => ({ sourceId: row.id, snapshot: serializeTax(row), hash: taxHash(row) })), nextCursor: rows.length > input.limit ? rows[input.limit - 1].id : null }; }
export async function readWithdrawal(db: Pick<PrismaClient, 'withdrawal'>, userId: string, id: string) { const row = await db.withdrawal.findFirst({ where: { id, userId, account: { userId, type: { in: ['PERSONAL', 'PROP_FIRM'] } } }, select: sourceSelect }); return row ? { row, snapshot: serializeTax(row), hash: taxHash(row) } : null; }
export function sourceState(hash: string, current: {
    hash: string;
} | null) { return !current ? 'UNAVAILABLE' : current.hash === hash ? 'UNCHANGED' : 'MODIFIED'; }

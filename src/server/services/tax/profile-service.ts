import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma, type PrismaClient } from '@/lib/generated/prisma/client';
import { withTaxWrite } from './context';
import { serializeTax } from './serializers';
/** Exact API representation; quantities stay strings in inferred RouterOutputs. */
export type TaxDto<T> = T extends Prisma.Decimal ? string : T extends Date ? string : T extends (infer I)[] ? TaxDto<I>[] : T extends object ? {
    [K in keyof T]: TaxDto<T[K]>;
} : T;
export function dto<T>(value: T): TaxDto<T> { return serializeTax(value) as TaxDto<T>; }
export async function taxWrite<T>(db: PrismaClient, userId: string, input: Parameters<typeof withTaxWrite>[2], write: (tx: Prisma.TransactionClient) => Promise<T>): Promise<TaxDto<T>> { return await withTaxWrite(db, userId, input, write) as TaxDto<T>; }
export const pageSchema = z.object({ cursor: z.string().uuid().optional(), limit: z.number().int().min(1).max(100).default(30) });
export const periodPageSchema = pageSchema.extend({ periodId: z.string().uuid() }).strict();
export const writeSchema = z.object({ requestId: z.string().uuid() });
export const periodWriteSchema = writeSchema.extend({ periodId: z.string().uuid(), expectedRevision: z.number().int().positive() });
export const editingSchema = periodWriteSchema.extend({ id: z.string().uuid().optional(), recordRevision: z.number().int().positive().optional() }).refine(v => !v.id || v.recordRevision !== undefined, { message: 'La edición requiere recordRevision.' });
export function fail(message: string, code: 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' = 'BAD_REQUEST'): never { throw new TRPCError({ code, message }); }
export async function ownedPeriod(tx: Prisma.TransactionClient, userId: string, periodId: string, date?: string) { const period = await tx.taxPeriod.findFirst({ where: { id: periodId, userId } }); if (!period)
    fail('Ejercicio no disponible.', 'NOT_FOUND'); if (date && date.slice(0, 4) !== String(period.year))
    fail('La fecha no pertenece al ejercicio.'); return period; }
export function scope(input: z.infer<typeof periodWriteSchema>, action: string) { return { requestId: input.requestId, action, payload: input, periodIds: [input.periodId], expectedRevisions: { [input.periodId]: input.expectedRevision } }; }
export function checkRevision(record: {
    revision: number;
} | null, revision?: number) { if (!record)
    fail('Registro no disponible.', 'NOT_FOUND'); if (revision === undefined || record.revision !== revision)
    fail('El registro cambió.', 'CONFLICT'); }
export function pageResult<T extends {
    id: string;
}>(rows: T[], limit: number) { const more = rows.length > limit; const items = rows.slice(0, limit); return { items: dto(items), nextCursor: more ? items.at(-1)!.id : null }; }
export function pageArgs(input: {
    cursor?: string;
    limit: number;
}) { return { take: input.limit + 1, orderBy: { id: 'asc' as const }, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) }; }
export const profileSchema = writeSchema.extend({ name: z.string().max(200), rtn: z.string().regex(/^(?:\d{14})?$/), domiciled: z.literal(true), individualMerchant: z.boolean().default(false), activity: z.string().max(2000).default(''), address: z.string().max(2000).default(''), obligations: z.array(z.string().max(200)).max(100).default([]), recordRevision: z.number().int().positive().optional() }).strict();
export async function getProfile(db: PrismaClient, userId: string) { return dto(await db.taxProfile.findUnique({ where: { userId_country: { userId, country: 'HN' } } })); }
export async function saveProfile(db: PrismaClient, userId: string, raw: z.input<typeof profileSchema>) { const input = profileSchema.parse(raw); return taxWrite(db, userId, { requestId: input.requestId, action: 'profile.save', payload: input }, async (tx) => { const previous = await tx.taxProfile.findUnique({ where: { userId_country: { userId, country: 'HN' } } }); if (previous)
    checkRevision(previous, input.recordRevision); const { requestId, recordRevision, ...data } = input; void requestId; void recordRevision; return previous ? tx.taxProfile.update({ where: { userId_id: { userId, id: previous.id } }, data: { ...data, revision: { increment: 1 } } }) : tx.taxProfile.create({ data: { ...data, userId } }); }); }
export const periodCreateSchema = writeSchema.extend({ year: z.number().int().min(2026).max(2100) }).strict();
export async function createPeriod(db: PrismaClient, userId: string, raw: z.input<typeof periodCreateSchema>) { const input = periodCreateSchema.parse(raw); return taxWrite(db, userId, { requestId: input.requestId, action: 'period.create', payload: input }, async (tx) => { const profile = await tx.taxProfile.findUnique({ where: { userId_country: { userId, country: 'HN' } } }); if (!profile)
    fail('Guarda primero el perfil fiscal.'); return tx.taxPeriod.create({ data: { userId, profileId: profile.id, year: input.year, profileSnapshot: serializeTax(profile) as Prisma.InputJsonValue } }); }); }
export async function listPeriods(db: PrismaClient, userId: string, input: z.infer<typeof pageSchema>) { return pageResult(await db.taxPeriod.findMany({ where: { userId }, ...pageArgs(input) }), input.limit); }
export const accountSchema = writeSchema.extend({ id: z.string().uuid().optional(), recordRevision: z.number().int().positive().optional(), name: z.string().trim().min(1).max(200), kind: z.enum(['BANK', 'EXCHANGE', 'WALLET', 'CASH', 'IN_TRANSIT']), owned: z.boolean().default(true), archived: z.boolean().default(false) }).strict();
export async function saveAccount(db: PrismaClient, userId: string, raw: z.input<typeof accountSchema>) { const input = accountSchema.parse(raw); return taxWrite(db, userId, { requestId: input.requestId, action: 'account.save', payload: input }, async (tx) => { const profile = await tx.taxProfile.findUnique({ where: { userId_country: { userId, country: 'HN' } } }); if (!profile)
    fail('Perfil no disponible.', 'NOT_FOUND'); const { id, recordRevision, requestId, ...data } = input; void requestId; if (id) {
    const previous = await tx.taxAssetAccount.findFirst({ where: { id, userId } });
    checkRevision(previous, recordRevision);
    return tx.taxAssetAccount.update({ where: { userId_id: { userId, id } }, data: { ...data, revision: { increment: 1 } } });
} return tx.taxAssetAccount.create({ data: { ...data, userId, profileId: profile.id } }); }); }
export async function listAccounts(db: PrismaClient, userId: string, input: z.infer<typeof pageSchema>) { return pageResult(await db.taxAssetAccount.findMany({ where: { userId }, ...pageArgs(input) }), input.limit); }

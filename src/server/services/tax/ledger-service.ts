import { z } from 'zod';
import type { Prisma, PrismaClient, TaxPosting, TaxTransaction as DbTransaction } from '@/lib/generated/prisma/client';
import { assetSchema, transactionSchema } from '@/domains/tax/validation';
import { assetKey, calculateBalances, validatePostings } from '@/domains/tax/ledger';
import { decimal, money } from '@/domains/tax/decimal';
import type { TaxPosting as Posting, TaxTransaction } from '@/domains/tax/types';
import { taxWrite as withTaxWrite, dto } from './profile-service';
import { serializeTax } from './serializers';
import { editingSchema, periodWriteSchema, scope, ownedPeriod, fail, checkRevision, pageArgs, pageResult, periodPageSchema } from './profile-service';
import { valuedHnl, validateValuationEvidence } from './record-service';
export const transactionInputSchema = editingSchema.safeExtend({ date: z.iso.date(), description: z.string().max(5000).default(''), reference: z.string().max(500).default(''), event: transactionSchema }).strict().refine(v => v.event.type !== 'REVERSAL', { message: 'Usa transactions.reverse para reversos exactos.' });
export function postingData(p: Posting) { return { accountId: p.accountId, quantity: p.quantity, assetKind: p.asset.kind, assetCode: p.asset.kind === 'FIAT' ? p.asset.code : p.asset.symbol, network: p.asset.kind === 'TOKEN' ? p.asset.network : '', contract: p.asset.kind === 'TOKEN' ? p.asset.contract : '', assetKey: assetKey(p.asset), amountHnl: valuedHnl(p.quantity, p.asset, p.valuation), ...(p.valuation ? { valuation: p.valuation as Prisma.InputJsonValue } : {}) }; }
export function domainEvent(row: DbTransaction & {
    postings: TaxPosting[];
}): TaxTransaction { const postings = row.postings.map(p => ({ accountId: p.accountId, quantity: p.quantity.toFixed(), asset: assetSchema.parse(p.assetKind === 'FIAT' ? { kind: 'FIAT', code: p.assetCode } : { kind: 'TOKEN', symbol: p.assetCode, network: p.network, contract: p.contract }) })); const out = postings.find(p => decimal(p.quantity).lt(0)); const incoming = postings.find(p => decimal(p.quantity).gt(0)); return { type: row.kind as TaxTransaction['type'], postings, reason: row.description || undefined, reversalOf: row.reversalOfId ?? undefined, ...(row.kind === 'CONVERSION' && out && incoming ? { conversionRate: decimal(incoming.quantity).div(decimal(out.quantity).abs()).toFixed() } : {}) }; }
export async function balances(tx: Prisma.TransactionClient, userId: string) { const rows = await tx.taxTransaction.findMany({ where: { userId, status: { in: ['POSTED', 'REVERSED'] } }, include: { postings: true }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] }); return calculateBalances(rows.map(domainEvent)); }
async function validateAccounts(tx: Prisma.TransactionClient, userId: string, event: TaxTransaction) {
    const ids = [...new Set(event.postings.map(p => p.accountId))];
    const accounts = await tx.taxAssetAccount.findMany({ where: { userId, id: { in: ids }, owned: true } });
    if (accounts.length !== ids.length)
        fail('Las partidas deben usar cuentas fiscales propias.', 'NOT_FOUND');
}
export async function createDraft(tx: Prisma.TransactionClient, userId: string, input: {
    periodId: string;
    date: string;
    description: string;
    reference: string;
    event: TaxTransaction;
}) {
    await ownedPeriod(tx, userId, input.periodId, input.date);
    const event = validatePostings(input.event);
    await validateAccounts(tx, userId, event);
    for (const p of event.postings)
        await validateValuationEvidence(tx, userId, input.periodId, p.valuation);
    return tx.taxTransaction.create({ data: { userId, periodId: input.periodId, date: new Date(input.date), kind: event.type, description: event.reason ?? input.description, reference: input.reference, postings: { create: event.postings.map(p => ({ ...postingData(p), userId })) } }, include: { postings: true } });
}
export async function saveTransaction(db: PrismaClient, userId: string, raw: z.input<typeof transactionInputSchema>) {
    const input = transactionInputSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'transaction.save'), async (tx) => {
        await ownedPeriod(tx, userId, input.periodId, input.date);
        validatePostings(input.event);
        await validateAccounts(tx, userId, input.event);
        for (const p of input.event.postings)
            await validateValuationEvidence(tx, userId, input.periodId, p.valuation);
        if (input.id) {
            const previous = await tx.taxTransaction.findFirst({ where: { userId, id: input.id, periodId: input.periodId }, include: { reconciliations: true } });
            checkRevision(previous, input.recordRevision);
            if (previous!.status !== 'DRAFT' || previous!.reconciliations.length)
                fail('Sólo puedes editar borradores no conciliados.', 'CONFLICT');
            await tx.taxPosting.deleteMany({ where: { userId, transactionId: input.id } });
            return tx.taxTransaction.update({ where: { userId_id: { userId, id: input.id } }, data: { date: new Date(input.date), kind: input.event.type, description: input.event.reason ?? input.description, reference: input.reference, revision: { increment: 1 }, postings: { create: input.event.postings.map(p => ({ ...postingData(p), userId })) } }, include: { postings: true } });
        }
        return createDraft(tx, userId, input);
    });
}
export const postSchema = periodWriteSchema.extend({ id: z.string().uuid(), recordRevision: z.number().int().positive() }).strict();
export async function postTransaction(db: PrismaClient, userId: string, raw: z.input<typeof postSchema>) {
    const input = postSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'transaction.post'), async (tx) => {
        const row = await tx.taxTransaction.findFirst({ where: { id: input.id, userId, periodId: input.periodId }, include: { postings: true } });
        checkRevision(row, input.recordRevision);
        if (row!.status !== 'DRAFT')
            fail('El movimiento ya está confirmado.', 'CONFLICT');
        validatePostings(domainEvent(row!));
        await tx.taxTransaction.update({ where: { userId_id: { userId, id: input.id } }, data: { status: 'POSTED', revision: { increment: 1 } } });
        const recordedBalances = await balances(tx, userId);
        return { transaction: await tx.taxTransaction.findFirst({ where: { id: input.id, userId }, include: { postings: true } }), balances: recordedBalances };
    });
}
export const discardSchema = postSchema.extend({ reason: z.string().trim().min(1).max(5000) }).strict();
export async function discardTransaction(db: PrismaClient, userId: string, raw: z.input<typeof discardSchema>) {
    const input = discardSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'transaction.discard'), async (tx) => {
        const row = await tx.taxTransaction.findFirst({ where: { userId, id: input.id, periodId: input.periodId }, include: { reconciliations: true } });
        checkRevision(row, input.recordRevision);
        if (row!.status !== 'DRAFT' || row!.reconciliations.length)
            fail('Sólo puedes descartar borradores no conciliados.', 'CONFLICT');
        await tx.taxTransaction.delete({ where: { userId_id: { userId, id: input.id } } });
        return { id: input.id, discarded: true };
    });
}
export const reverseSchema = postSchema.extend({ date: z.iso.date(), reason: z.string().trim().min(1).max(5000) }).strict();
export async function reverseTransaction(db: PrismaClient, userId: string, raw: z.input<typeof reverseSchema>) {
    const input = reverseSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'transaction.reverse'), async (tx) => {
        await ownedPeriod(tx, userId, input.periodId, input.date);
        const original = await tx.taxTransaction.findFirst({ where: { id: input.id, userId, periodId: input.periodId }, include: { postings: true, reversals: true, reconciliations: true } });
        checkRevision(original, input.recordRevision);
        if (original!.status !== 'POSTED' || original!.kind === 'REVERSAL' || original!.reversals.length)
            fail('No se puede revertir este movimiento.', 'CONFLICT');
        if (input.date < original!.date.toISOString().slice(0, 10))
            fail('El reverso debe ser posterior al original.');
        const result = await tx.taxTransaction.create({ data: { userId, periodId: input.periodId, kind: 'REVERSAL', status: 'POSTED', date: new Date(input.date), description: input.reason, reversalOfId: input.id, postings: { create: original!.postings.map(p => ({ userId, accountId: p.accountId, assetKey: p.assetKey, assetKind: p.assetKind, assetCode: p.assetCode, network: p.network, contract: p.contract, quantity: decimal(p.quantity.toFixed()).negated().toFixed(), role: p.role, amountHnl: p.amountHnl ? money(decimal(p.amountHnl.toFixed()).negated()) : null, ...(p.valuation ? { valuation: p.valuation as Prisma.InputJsonValue } : {}) })) } }, include: { postings: true } });
        await tx.taxTransaction.update({ where: { userId_id: { userId, id: input.id } }, data: { status: 'REVERSED', revision: { increment: 1 } } });
        await balances(tx, userId);
        return result;
    });
}
export async function listTransactions(db: PrismaClient, userId: string, input: z.infer<typeof periodPageSchema>) { await ownedPeriod(db, userId, input.periodId); return pageResult(await db.taxTransaction.findMany({ where: { userId, periodId: input.periodId }, ...pageArgs(input), include: { postings: true } }), input.limit); }
export async function overview(db: PrismaClient, userId: string, input: {
    periodId: string;
}) {
    await ownedPeriod(db, userId, input.periodId);
    const reconciliations = await db.taxReconciliation.findMany({ where: { userId, periodId: input.periodId }, include: { income: true, transaction: { include: { reversals: true, postings: true } } } });
    const byAsset: Record<string, string> = {};
    let hnlTotal = decimal('0');
    let unvalued = false;
    for (const r of reconciliations) {
        if (r.transaction.status !== 'POSTED' || r.transaction.reversals.length)
            continue;
        byAsset[r.assetKey] = decimal(byAsset[r.assetKey] ?? '0').plus(decimal(r.netAmount.toFixed())).toFixed();
        const postings = r.transaction.postings.filter(p => p.assetKey === r.assetKey && p.quantity.gt(0));
        const quantity = postings.reduce((sum, p) => sum.plus(decimal(p.quantity.toFixed())), decimal('0'));
        if (!quantity.gt(0) || postings.some(p => p.amountHnl === null)) {
            unvalued = true;
            continue;
        }
        // Reconciliations allocate proportionally across the receipt's postings.
        // Recognition FX belongs to the income; receipt FX belongs to cash received.
        for (const posting of postings) {
            hnlTotal = hnlTotal.plus(decimal(posting.amountHnl!.toFixed()).times(decimal(r.netAmount.toFixed())).div(quantity));
        }
    }
    return dto({ reversalReviewIncomeIds: [...new Set(reconciliations.filter(r => r.transaction.status === 'REVERSED' || r.transaction.reversals.length > 0).map(r => r.incomeId))], receivedByAsset: byAsset, receivedHnl: unvalued ? null : money(hnlTotal), valuationComplete: !unvalued, hasReceipts: reconciliations.length > 0, balances: await balances(db, userId), pendingCandidates: await db.taxImportCandidate.count({ where: { userId, periodId: input.periodId, status: 'PROPOSED' } }) });
}

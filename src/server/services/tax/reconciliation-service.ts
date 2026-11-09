import { z } from 'zod';
import type { Prisma, PrismaClient } from '@/lib/generated/prisma/client';
import { decimalSchema, valuationSchema } from '@/domains/tax/validation';
import { decimal } from '@/domains/tax/decimal';
import { taxWrite as withTaxWrite, dto } from './profile-service';
import { serializeTax } from './serializers';
import { periodWriteSchema, periodPageSchema, scope, ownedPeriod, fail, checkRevision } from './profile-service';
import { incomeSchema, createIncome, validateComponents, valuedHnl, assetColumns, validateValuationEvidence } from './record-service';
import { transactionInputSchema, createDraft, balances, domainEvent } from './ledger-service';
import { readWithdrawal, readWithdrawals, sourceState } from './withdrawal-reader';
export function assertAllocation(capacity: string, used: string, amount: string) {
    if (!decimal(amount).gt(0) || decimal(used).plus(decimal(amount)).gt(decimal(capacity)))
        fail('La asignación supera el importe disponible.', 'CONFLICT');
}
const nonnegative = decimalSchema.refine(v => decimal(v).gte(0));
const allocationSchema = z.object({ sourceId: z.string().uuid().optional(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), sourceAmount: decimalSchema.refine(v => decimal(v).gt(0)).optional(), grossAmount: decimalSchema, netAmount: nonnegative, feeAmount: nonnegative.default('0'), withheldAmount: nonnegative.default('0'), conversion: z.object({ sourceValuation: valuationSchema, receiptValuation: valuationSchema, reason: z.string().trim().min(1) }).strict().optional() }).strict().refine(v => v.sourceId ? !!v.sourceHash && !!v.sourceAmount : !v.sourceHash && !v.sourceAmount && !v.conversion, { message: 'La fuente requiere ID, hash e importe juntos.' });
export const reconcileSchema = periodWriteSchema.extend({ incomeId: z.string().uuid().optional(), incomeRevision: z.number().int().positive().optional(), newIncome: incomeSchema.optional(), transactionId: z.string().uuid().optional(), transactionRevision: z.number().int().positive().optional(), newReceipt: transactionInputSchema.optional(), receivedDate: z.iso.date(), receiptConfirmed: z.literal(true), evidenceReference: z.string().trim().min(1).max(2000), reason: z.string().trim().min(1).max(5000), allocations: z.array(allocationSchema).min(1).max(100) }).strict().refine(v => !!v.incomeId !== !!v.newIncome, { message: 'Elige ingreso existente o nuevo.' }).refine(v => !!v.transactionId !== !!v.newReceipt, { message: 'Elige cobro existente o nuevo.' }).refine(v => !v.incomeId || !!v.incomeRevision).refine(v => !v.transactionId || !!v.transactionRevision).refine(v => new Set(v.allocations.map(a => a.sourceId)).size === v.allocations.length, { message: 'Fuente repetida.' });
export const candidatesSchema = periodPageSchema.extend({ savedCursor: z.string().uuid().optional() }).strict();
export async function candidates(db: PrismaClient, userId: string, input: z.infer<typeof candidatesSchema>) { await ownedPeriod(db, userId, input.periodId); const page = await readWithdrawals(db, userId, input); const items = await Promise.all(page.items.map(async (item) => { const candidate = await db.taxImportCandidate.findUnique({ where: { userId_sourceType_sourceId: { userId, sourceType: 'WITHDRAWAL', sourceId: item.sourceId } }, include: { reconciliations: true } }); return { ...item, candidate: dto(candidate), sourceState: candidate ? sourceState(candidate.sourceHash, item) : 'NEW' }; })); const historical = await db.taxImportCandidate.findMany({ where: { userId, periodId: input.periodId }, take: input.limit + 1, orderBy: { id: 'asc' }, ...(input.savedCursor ? { cursor: { id: input.savedCursor }, skip: 1 } : {}) }); return { items, nextCursor: page.nextCursor, saved: await Promise.all(historical.slice(0, input.limit).map(async (item) => ({ ...dto(item), sourceState: sourceState(item.sourceHash, await readWithdrawal(db, userId, item.sourceId)) }))), savedNextCursor: historical.length > input.limit ? historical[input.limit - 1].id : null }; }
export async function reconcile(db: PrismaClient, userId: string, raw: z.input<typeof reconcileSchema>) {
    const input = reconcileSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'import.reconcile'), async (tx) => {
        await ownedPeriod(tx, userId, input.periodId, input.receivedDate);
        if (input.newIncome && (input.newIncome.id || input.newIncome.periodId !== input.periodId))
            fail('El ingreso nuevo debe pertenecer al ejercicio del cobro.');
        const income = input.newIncome ? await createIncome(tx, userId, input.newIncome) : await tx.taxIncome.findFirst({ where: { id: input.incomeId, userId } });
        if (!income)
            fail('Ingreso no disponible.', 'NOT_FOUND');
        if (input.incomeId)
            checkRevision(income, input.incomeRevision);
        if (input.newReceipt && (input.newReceipt.id || input.newReceipt.periodId !== input.periodId || input.newReceipt.date !== input.receivedDate || input.newReceipt.event.type !== 'EXTERNAL_RECEIPT'))
            fail('El cobro nuevo debe ser recepción externa del ejercicio y fecha confirmados.');
        let receipt = input.newReceipt ? await createDraft(tx, userId, input.newReceipt) : await tx.taxTransaction.findFirst({ where: { id: input.transactionId, userId, periodId: input.periodId }, include: { postings: true, reversals: true } });
        if (!receipt)
            fail('Cobro no disponible.', 'NOT_FOUND');
        if (input.transactionId)
            checkRevision(receipt, input.transactionRevision);
        if (receipt.kind !== 'EXTERNAL_RECEIPT' || receipt.date.toISOString().slice(0, 10) !== input.receivedDate)
            fail('El movimiento debe ser un cobro externo en la fecha confirmada.');
        if (input.transactionId && (receipt.status !== 'POSTED' || ('reversals' in receipt && Array.isArray(receipt.reversals) && receipt.reversals.length)))
            fail('Cobro no confirmado o revertido.', 'CONFLICT');
        const event = domainEvent(receipt);
        if (event.postings.some(p => assetColumns(p.asset).assetKey !== income.assetKey))
            fail('El ingreso y cobro deben compartir activo; registra la conversión por separado.');
        const receiptAmount = event.postings.reduce((a, p) => a.plus(decimal(p.quantity)), decimal('0'));
        const incomeUsed = await tx.taxReconciliation.findMany({ where: { userId, incomeId: income.id, transaction: { status: 'POSTED', reversals: { none: {} } } } });
        const receiptUsed = await tx.taxReconciliation.findMany({ where: { userId, transactionId: receipt.id } });
        const gross = input.allocations.reduce((a, r) => a.plus(decimal(r.grossAmount)), decimal('0'));
        const net = input.allocations.reduce((a, r) => a.plus(decimal(r.netAmount)), decimal('0'));
        const fee = input.allocations.reduce((a, r) => a.plus(decimal(r.feeAmount)), decimal('0'));
        const withheld = input.allocations.reduce((a, r) => a.plus(decimal(r.withheldAmount)), decimal('0'));
        assertAllocation(income.grossAmount.toFixed(), incomeUsed.reduce((a, r) => a.plus(decimal(r.grossAmount.toFixed())), decimal('0')).toFixed(), gross.toFixed());
        assertAllocation(receiptAmount.toFixed(), receiptUsed.reduce((a, r) => a.plus(decimal(r.netAmount.toFixed())), decimal('0')).toFixed(), net.toFixed());
        for (const [field, total] of [['feeAmount', fee], ['withheldAmount', withheld], ['netAmount', net]] as const) {
            const used = incomeUsed.reduce((a, r) => a.plus(decimal(r[field].toFixed())), decimal('0'));
            if (used.plus(total).gt(decimal(income[field].toFixed())))
                fail('Los componentes superan el ingreso.', 'CONFLICT');
        }
        const results = [];
        for (const allocation of input.allocations) {
            validateComponents(allocation);
            if (!allocation.sourceId) {
                if (receiptUsed.some(r => r.incomeId === income.id && r.candidateId === null))
                    fail('La asignación manual ya existe.', 'CONFLICT');
                results.push(await tx.taxReconciliation.create({ data: { userId, periodId: input.periodId, candidateId: null, incomeId: income.id, transactionId: receipt.id, assetKey: income.assetKey, grossAmount: allocation.grossAmount, netAmount: allocation.netAmount, feeAmount: allocation.feeAmount, withheldAmount: allocation.withheldAmount, reason: JSON.stringify({ reason: input.reason, receivedDate: input.receivedDate, receiptConfirmed: true, evidenceReference: input.evidenceReference }) } }));
                continue;
            }
            const source = await readWithdrawal(tx, userId, allocation.sourceId);
            if (!source || source.hash !== allocation.sourceHash)
                fail('El origen cambió o no está disponible; revisa el snapshot.', 'CONFLICT');
            if (source.row.status === 'RECHAZADO')
                fail('La fuente está rechazada.');
            const sameAsset = income.assetKey === `FIAT:${source.row.currency}`;
            if (sameAsset) {
                if(allocation.conversion)fail('No se requiere conversión entre activos iguales.');
                if (!decimal(allocation.sourceAmount!).eq(decimal(allocation.grossAmount)))
                    fail('La asignación debe reconciliar el importe de origen.');
            }
            else {
                if (!allocation.conversion)
                    fail('La diferencia de activos requiere valoraciones HNL documentadas.');
                await validateValuationEvidence(tx, userId, input.periodId, allocation.conversion.sourceValuation);
                await validateValuationEvidence(tx, userId, input.periodId, allocation.conversion.receiptValuation);
                const sourceHnl = valuedHnl(allocation.sourceAmount!, { kind: 'FIAT', code: source.row.currency }, allocation.conversion.sourceValuation);
                const incomeAsset = event.postings[0].asset;
                const receiptHnl = valuedHnl(allocation.grossAmount, incomeAsset, allocation.conversion.receiptValuation);
                if (sourceHnl === null || receiptHnl === null || sourceHnl !== receiptHnl)
                    fail('Las valoraciones de origen y recepción no concilian en HNL.');
            }
            let candidate = await tx.taxImportCandidate.findUnique({ where: { userId_sourceType_sourceId: { userId, sourceType: 'WITHDRAWAL', sourceId: allocation.sourceId } } });
            if (candidate && candidate.sourceHash !== source.hash)
                fail('El origen importado fue modificado.', 'CONFLICT');
            if (!candidate)
                candidate = await tx.taxImportCandidate.create({ data: { userId, periodId: input.periodId, sourceId: allocation.sourceId, sourceSnapshot: source.snapshot as Prisma.InputJsonValue, sourceHash: source.hash } });
            const existing = await tx.taxReconciliation.findMany({ where: { userId, candidateId: candidate.id, transaction: { status: 'POSTED', reversals: { none: {} } } } });
            if (existing.some(r => r.incomeId === income.id && r.transactionId === receipt!.id))
                fail('La asignación ya existe.', 'CONFLICT');
            assertAllocation(source.row.amount.toFixed(), existing.reduce((a, r) => a.plus(decimal(r.sourceAmount?.toFixed() ?? '0')), decimal('0')).toFixed(), allocation.sourceAmount!);
            results.push(await tx.taxReconciliation.create({ data: { userId, periodId: input.periodId, candidateId: candidate.id, incomeId: income.id, transactionId: receipt.id, assetKey: income.assetKey, grossAmount: allocation.grossAmount, netAmount: allocation.netAmount, feeAmount: allocation.feeAmount, withheldAmount: allocation.withheldAmount, sourceAmount: allocation.sourceAmount, reason: JSON.stringify({ reason: input.reason, receivedDate: input.receivedDate, receiptConfirmed: true, evidenceReference: input.evidenceReference }), ...(allocation.conversion ? { conversion: allocation.conversion as Prisma.InputJsonValue } : {}) } }));
            if (candidate.periodId === input.periodId)
                await tx.taxImportCandidate.update({ where: { userId_id: { userId, id: candidate.id } }, data: { status: existing.reduce((a,r)=>a.plus(decimal(r.sourceAmount?.toFixed()??'0')),decimal('0')).plus(decimal(allocation.sourceAmount!)).eq(decimal(source.row.amount.toFixed()))?'RECONCILED':'PROPOSED', revision: { increment: 1 } } });
        }
        if (input.newReceipt) {
            receipt = await tx.taxTransaction.update({ where: { userId_id: { userId, id: receipt.id } }, data: { status: 'POSTED', revision: { increment: 1 } }, include: { postings: true } });
            await balances(tx, userId);
        }
        return { income, receipt, reconciliations: results };
    });
}
export const dismissSchema = periodWriteSchema.extend({ sourceId: z.string().uuid(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/), reason: z.string().trim().min(1).max(5000) }).strict();
export async function dismiss(db: PrismaClient, userId: string, raw: z.input<typeof dismissSchema>) {
    const input = dismissSchema.parse(raw);
    return withTaxWrite(db, userId, scope(input, 'import.dismiss'), async (tx) => {
        const source = await readWithdrawal(tx, userId, input.sourceId);
        if (!source || source.hash !== input.sourceHash)
            fail('El origen cambió o no está disponible.', 'CONFLICT');
        const existing = await tx.taxImportCandidate.findUnique({ where: { userId_sourceType_sourceId: { userId, sourceType: 'WITHDRAWAL', sourceId: input.sourceId } }, include: { reconciliations: true } });
        if (existing && (existing.periodId !== input.periodId || existing.reconciliations.length))
            fail('La fuente ya está conciliada o pertenece a otro ejercicio.', 'CONFLICT');
        return tx.taxImportCandidate.upsert({ where: { userId_sourceType_sourceId: { userId, sourceType: 'WITHDRAWAL', sourceId: input.sourceId } }, create: { userId, periodId: input.periodId, sourceId: input.sourceId, sourceHash: source.hash, sourceSnapshot: source.snapshot as Prisma.InputJsonValue, status: 'DISMISSED', reason: input.reason }, update: { status: 'DISMISSED', reason: input.reason, revision: { increment: 1 } } });
    });
}

import { z } from 'zod';
import { Prisma, type PrismaClient } from '@/lib/generated/prisma/client';
import { assetSchema, decimalSchema, hnlSchema, valuationSchema, treatmentSchema, recognitionSchema } from '@/domains/tax/validation';
import { assetKey } from '@/domains/tax/ledger';
import { decimal, money } from '@/domains/tax/decimal';
import type { TaxAsset, TaxValuation } from '@/domains/tax/types';
import { taxWrite as withTaxWrite, dto } from './profile-service';
import { editingSchema, scope, ownedPeriod, checkRevision, fail, pageArgs, pageResult, periodPageSchema } from './profile-service';
export function valuedHnl(quantity: string, asset: TaxAsset, valuation?: TaxValuation): string | null { if (asset.kind === 'FIAT' && asset.code === 'HNL')
    return money(decimal(quantity)); if (!valuation)
    return null; if (assetKey(valuation.base) !== assetKey(asset) || valuation.quote.kind !== 'FIAT' || valuation.quote.code !== 'HNL' || !decimal(valuation.quantity).eq(decimal(quantity)))
    fail('La valoración debe cotizar la cantidad y activo exactos en HNL.'); return money(decimal(quantity).times(decimal(valuation.rate))); }
export async function validateValuationEvidence(tx: Prisma.TransactionClient, userId: string, periodId: string, valuation?: TaxValuation) { if (valuation?.evidenceId) {
    const evidence = await tx.taxEvidence.findFirst({ where: { id: valuation.evidenceId, userId, periodId, status: 'AVAILABLE' } });
    if (!evidence)
        fail('El documento de valoración no está disponible en este ejercicio.', 'NOT_FOUND');
} }
export function validateComponents(v: {
    grossAmount: string;
    netAmount: string;
    feeAmount: string;
    withheldAmount: string;
}) { const { grossAmount, netAmount, feeAmount, withheldAmount } = v; if ([grossAmount, netAmount, feeAmount, withheldAmount].some(x => decimal(x).lt(0)) || !decimal(grossAmount).gt(0) || !decimal(grossAmount).eq(decimal(netAmount).plus(decimal(feeAmount)).plus(decimal(withheldAmount))))
    fail('El bruto debe ser neto + comisión + retención.'); }
const positive = decimalSchema.refine(v => decimal(v).gte(0));
const positiveHnl = hnlSchema.refine(v => decimal(v).gte(0));
const treatmentFields = { treatment: treatmentSchema.default('PENDING'), treatmentReason: z.string().max(5000).default(''), legalReference: z.string().max(5000).default('') };
function admission(v: {
    treatment: string;
    treatmentReason: string;
    legalReference: string;
}) { return v.treatment === 'PENDING' || !!(v.treatmentReason.trim() && v.legalReference.trim()); }
const assetFields = { asset: assetSchema, valuation: valuationSchema.optional() };
export const incomeSchema = editingSchema.safeExtend({ category: z.string().trim().min(1).max(200), payer: z.string().trim().min(1).max(500), description: z.string().max(5000).default(''), recognition: recognitionSchema, ...assetFields, grossAmount: positive, feeAmount: positive.default('0'), withheldAmount: positive.default('0'), netAmount: positive, ...treatmentFields, evidenceRequired: z.boolean().default(true) }).strict().refine(admission, { message: 'El tratamiento requiere fundamento legal y razón.' }).refine(v => { try {
    validateComponents(v);
    return true;
}
catch {
    return false;
} }, { message: 'Bruto distinto de neto + comisión + retención.' });
export function assetColumns(asset: TaxAsset) { return { assetKind: asset.kind, assetCode: asset.kind === 'FIAT' ? asset.code : asset.symbol, network: asset.kind === 'TOKEN' ? asset.network : '', contract: asset.kind === 'TOKEN' ? asset.contract : '', assetKey: assetKey(asset) }; }
export async function createIncome(tx: Prisma.TransactionClient, userId: string, input: z.infer<typeof incomeSchema>) { await ownedPeriod(tx, userId, input.periodId, input.recognition.recognitionDate); await validateValuationEvidence(tx, userId, input.periodId, input.valuation); const { requestId, expectedRevision, id, recordRevision, asset, valuation, recognition, ...data } = input; void requestId; void expectedRevision; void id; void recordRevision; return tx.taxIncome.create({ data: { ...data, userId, ...assetColumns(asset), recognitionDate: new Date(recognition.recognitionDate), recognitionCriterion: recognition.criterion, recognitionStatus: recognition.status, recognitionLegalBasis: recognition.legalBasis ?? '', amountHnl: valuedHnl(input.grossAmount, asset, valuation), ...(valuation ? { valuation: valuation as Prisma.InputJsonValue } : {}) } }); }
export async function saveIncome(db: PrismaClient, userId: string, raw: z.input<typeof incomeSchema>) { const input = incomeSchema.parse(raw); return withTaxWrite(db, userId, scope(input, 'income.save'), async (tx) => { await ownedPeriod(tx, userId, input.periodId, input.recognition.recognitionDate); await validateValuationEvidence(tx, userId, input.periodId, input.valuation); if (!input.id)
    return createIncome(tx, userId, input); const previous = await tx.taxIncome.findFirst({ where: { id: input.id, userId, periodId: input.periodId }, include: { reconciliations: true } }); checkRevision(previous, input.recordRevision); const linkedFee = await tx.taxDeduction.findFirst({ where: { userId, componentKey: `income:${input.id}:fee` } }); const linkedWithheld = await tx.taxCredit.findFirst({ where: { userId, componentKey: `income:${input.id}:withheld` } }); if (linkedFee || linkedWithheld)
    fail('El ingreso tiene componentes aplicados; corrige esos registros primero.', 'CONFLICT'); if (previous!.reconciliations.length)
    fail('El ingreso conciliado requiere una corrección documentada.', 'CONFLICT'); const { requestId, expectedRevision, id, recordRevision, asset, valuation, recognition, ...data } = input; void requestId; void expectedRevision; void recordRevision; return tx.taxIncome.update({ where: { userId_id: { userId, id: id! } }, data: { ...data, ...assetColumns(asset), recognitionDate: new Date(recognition.recognitionDate), recognitionCriterion: recognition.criterion, recognitionStatus: recognition.status, recognitionLegalBasis: recognition.legalBasis ?? '', amountHnl: valuedHnl(input.grossAmount, asset, valuation), valuation: valuation ? valuation as Prisma.InputJsonValue : Prisma.DbNull, revision: { increment: 1 } } }); }); }
export const deductionSchema = editingSchema.safeExtend({ kind: z.enum(['EXPENSE', 'DEDUCTION']), category: z.string().trim().min(1).max(200), description: z.string().max(5000).default(''), date: z.iso.date(), amount: positive, ...assetFields, admittedHnl: positiveHnl.optional(), componentKey: z.string().trim().min(1).max(500), ...treatmentFields }).strict().refine(admission, { message: 'El tratamiento requiere fundamento legal y razón.' }).refine(v => { const value = valuedHnl(v.amount, v.asset, v.valuation); return !v.admittedHnl || (value !== null && decimal(v.admittedHnl).lte(decimal(value))); }, { message: 'La deducción admitida no puede superar el importe valorado.' });
export const creditSchema = editingSchema.safeExtend({ kind: z.enum(['WITHHOLDING', 'PREPAYMENT', 'OTHER']), payer: z.string().max(500).default(''), date: z.iso.date(), reference: z.string().max(500).default(''), amountHnl: positiveHnl, previouslyAppliedHnl: positiveHnl.default('0'), admittedHnl: positiveHnl.optional(), componentKey: z.string().trim().min(1).max(500), ...treatmentFields }).strict().refine(admission, { message: 'El tratamiento requiere fundamento legal y razón.' }).refine(v => decimal(v.previouslyAppliedHnl).lte(decimal(v.amountHnl)) && (!v.admittedHnl || decimal(v.admittedHnl).lte(decimal(v.amountHnl).minus(decimal(v.previouslyAppliedHnl)))), { message: 'Crédito superior al importe disponible.' });
async function incomeComponent(tx: Prisma.TransactionClient, userId: string, input: {
    periodId: string;
    componentKey: string;
    amount?: string;
    amountHnl?: string;
    asset?: TaxAsset;
    valuation?: TaxValuation;
}, expected: 'fee' | 'withheld') {
    if (!input.componentKey.startsWith('income:'))
        return;
    const match = /^income:([0-9a-f-]{36}):(fee|withheld)$/.exec(input.componentKey);
    if (!match || match[2] !== expected)
        fail('Componente de ingreso no válido.');
    const income = await tx.taxIncome.findFirst({ where: { id: match[1], userId, periodId: input.periodId } });
    if (!income)
        fail('El componente debe pertenecer a un ingreso propio del ejercicio.');
    const quantity = expected === 'fee' ? income.feeAmount : income.withheldAmount;
    if (expected === 'fee' && (!input.asset || assetKey(input.asset) !== income.assetKey || !decimal(input.amount!).eq(decimal(quantity.toFixed()))))
        fail('La comisión debe coincidir con el componente del ingreso.');
    if (expected === 'fee') {
        const feeHnl = valuedHnl(input.amount!, input.asset!, input.valuation);
        if (feeHnl !== null) {
            if (!income.amountHnl)
                fail('La comisión requiere valoración HNL del ingreso.');
            const maximum = decimal(income.amountHnl.toFixed()).times(decimal(quantity.toFixed())).div(decimal(income.grossAmount.toFixed()));
            if (decimal(feeHnl).gt(decimal(money(maximum))))
                fail('La comisión supera la valoración del componente del ingreso.');
        }
    }
    if (expected === 'withheld') {
        if (!income.amountHnl)
            fail('La retención requiere valoración HNL del ingreso.');
        const maximum = decimal(income.amountHnl.toFixed()).times(decimal(quantity.toFixed())).div(decimal(income.grossAmount.toFixed()));
        if (decimal(input.amountHnl!).gt(decimal(money(maximum))))
            fail('La retención supera el componente del ingreso.');
    }
}
async function uniqueComponent(tx: Prisma.TransactionClient, userId: string, componentKey: string, id?: string) { const [d, c] = await Promise.all([tx.taxDeduction.findFirst({ where: { userId, componentKey } }), tx.taxCredit.findFirst({ where: { userId, componentKey } })]); if ((d && d.id !== id) || (c && c.id !== id))
    fail('El componente económico ya está aplicado.', 'CONFLICT'); }
export async function saveDeduction(db: PrismaClient, userId: string, raw: z.input<typeof deductionSchema>) { const input = deductionSchema.parse(raw); return withTaxWrite(db, userId, scope(input, 'deduction.save'), async (tx) => { await ownedPeriod(tx, userId, input.periodId, input.date); await validateValuationEvidence(tx, userId, input.periodId, input.valuation); await uniqueComponent(tx, userId, input.componentKey, input.id); await incomeComponent(tx, userId, input, 'fee'); const { id, recordRevision, requestId, expectedRevision, asset, valuation, ...fields } = input; void requestId; void expectedRevision; const data = { ...fields, date: new Date(input.date), ...assetColumns(asset), amountHnl: valuedHnl(input.amount, asset, valuation), valuation: valuation ? valuation as Prisma.InputJsonValue : Prisma.DbNull, admittedHnl: input.admittedHnl ?? null }; if (id) {
    checkRevision(await tx.taxDeduction.findFirst({ where: { id, userId, periodId: input.periodId } }), recordRevision);
    return tx.taxDeduction.update({ where: { userId_id: { userId, id } }, data: { ...data, revision: { increment: 1 } } });
} return tx.taxDeduction.create({ data: { ...data, userId } }); }); }
export async function saveCredit(db: PrismaClient, userId: string, raw: z.input<typeof creditSchema>) { const input = creditSchema.parse(raw); return withTaxWrite(db, userId, scope(input, 'credit.save'), async (tx) => { await ownedPeriod(tx, userId, input.periodId, input.date); await uniqueComponent(tx, userId, input.componentKey, input.id); await incomeComponent(tx, userId, input, 'withheld'); const { id, recordRevision, requestId, expectedRevision, ...fields } = input; void requestId; void expectedRevision; const data = { ...fields, date: new Date(input.date), admittedHnl: input.admittedHnl ?? null }; if (id) {
    checkRevision(await tx.taxCredit.findFirst({ where: { id, userId, periodId: input.periodId } }), recordRevision);
    return tx.taxCredit.update({ where: { userId_id: { userId, id } }, data: { ...data, revision: { increment: 1 } } });
} return tx.taxCredit.create({ data: { ...data, userId } }); }); }
export async function listIncomes(db: PrismaClient, userId: string, input: z.infer<typeof periodPageSchema>) { await ownedPeriod(db, userId, input.periodId); return pageResult(await db.taxIncome.findMany({ where: { userId, periodId: input.periodId }, ...pageArgs(input) }), input.limit); }
export async function listDeductions(db: PrismaClient, userId: string, input: z.infer<typeof periodPageSchema>) { await ownedPeriod(db, userId, input.periodId); return pageResult(await db.taxDeduction.findMany({ where: { userId, periodId: input.periodId }, ...pageArgs(input) }), input.limit); }
export async function listCredits(db: PrismaClient, userId: string, input: z.infer<typeof periodPageSchema>) { await ownedPeriod(db, userId, input.periodId); return pageResult(await db.taxCredit.findMany({ where: { userId, periodId: input.periodId }, ...pageArgs(input) }), input.limit); }

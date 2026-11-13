import { z } from 'zod';
import type { Prisma, PrismaClient, TaxPeriod, TaxReturn } from '@/lib/generated/prisma/client';
import { informationSchema, loadCalculationData, buildPreparation } from './calculation-service';
import {lockFiscalRulePublication} from './rules/publication-lock';
import { dto, fail, ownedPeriod, pageArgs, pageResult, periodPageSchema, periodWriteSchema, scope, taxWrite } from './profile-service';
import { serializeTax, taxHash } from './serializers';
import { candidateScope } from './withdrawal-reader';
export type FiscalPeriodDto = Omit<TaxPeriod,'profileSnapshot'|'information'|'createdAt'|'updatedAt'> & {profileSnapshot:unknown;information:unknown;createdAt:string;updatedAt:string};
export type FiscalReturnDto = Omit<TaxReturn,'snapshot'|'createdAt'|'updatedAt'|'closedAt'|'reportedFiledAt'> & {snapshot:unknown;createdAt:string;updatedAt:string;closedAt:string|null;reportedFiledAt:string|null};
export const prepareSchema = periodWriteSchema.strict();
export const closeSchema = periodWriteSchema.extend({ returnId: z.string().uuid() }).strict();
export const reopenSchema = periodWriteSchema.extend({ reason: z.string().trim().min(1).max(4000) }).strict();
export const filedSchema = closeSchema.extend({
    rtn: z.string().regex(/^\d{14}$/), filingReference: z.string().trim().min(1).max(200), receiptEvidenceId: z.string().uuid(), reportedFiledAt: z.iso.datetime()
}).strict();
export const informationWriteSchema = periodWriteSchema.extend({ information: informationSchema, roundingConfirmed: z.boolean() }).strict();
export const getPeriodSchema = z.object({ periodId: z.string().uuid() }).strict();
export const profileRefreshSchema = periodWriteSchema.extend({ reason: z.string().trim().min(1).max(4000) }).strict();
/** Explicit correction of this open year's profile; earlier returns stay immutable. */
export async function refreshProfileSnapshot(db: PrismaClient, userId: string, raw: z.input<typeof profileRefreshSchema>): Promise<FiscalPeriodDto> {
    const input = profileRefreshSchema.parse(raw);
    return taxWrite(db, userId, { ...scope(input, 'period.refreshProfile'), reason: input.reason }, async tx => {
        const period = await ownedPeriod(tx, userId, input.periodId);
        if (period.status !== 'OPEN') fail('El ejercicio está cerrado.', 'CONFLICT');
        const profile = await tx.taxProfile.findFirst({ where: { id: period.profileId, userId, country: 'HN' } });
        if (!profile) fail('Perfil fiscal no disponible.', 'NOT_FOUND');
        return tx.taxPeriod.update({ where: { userId_id: { userId, id: period.id } }, data: { profileSnapshot: serializeTax(profile) as Prisma.InputJsonValue } });
    });
}
export async function getPeriod(db: PrismaClient, userId: string, input: z.infer<typeof getPeriodSchema>): Promise<FiscalPeriodDto> {
    return dto(await ownedPeriod(db as unknown as Prisma.TransactionClient, userId, input.periodId));
}
export async function updateInformation(db: PrismaClient, userId: string, raw: z.input<typeof informationWriteSchema>): Promise<FiscalPeriodDto> {
    const input = informationWriteSchema.parse(raw);
    return taxWrite(db, userId, scope(input, 'period.updateInformation'), async (tx) => {
        const ids = [input.information.roundingEvidenceId, input.information.priorFinancialEvidenceId, ...input.information.reviews.map(r => r.evidenceId)].filter((id): id is string => !!id);
        const distinct = [...new Set(ids)];
        const docs = await tx.taxEvidence.findMany({ where: {
                userId, periodId: input.periodId, id: { in: distinct }, status: 'AVAILABLE'
            } });
        if (docs.length !== distinct.length)
            fail('Las revisiones requieren documentos disponibles del mismo ejercicio.');
        if (input.roundingConfirmed && (!input.information.roundingReason || !input.information.roundingEvidenceId))
            fail('El redondeo requiere motivo y evidencia.');
        for (const r of input.information.reviews) {
            // Separate generated delegate unions keep the owner predicate explicit.
            const where = {
                id: r.recordId, userId, periodId: input.periodId
            };
            const found = r.kind === 'source' ? await tx.taxImportCandidate.findFirst({where:{...candidateScope(userId,input.periodId),id:r.recordId}}) : r.kind === 'transaction' ? await tx.taxTransaction.findFirst({where}) : r.kind === 'income' || r.kind === 'reversal' ? await tx.taxIncome.findFirst({ where }) : r.kind === 'deduction' ? await tx.taxDeduction.findFirst({ where }) : await tx.taxCredit.findFirst({ where });
            if (!found)
                fail('La revisión no pertenece al ejercicio.', 'NOT_FOUND');
            for(const id of r.relatedRecordIds) {
                const where={id,userId,periodId:input.periodId};
                const matches=await Promise.all([tx.taxIncome.findFirst({where}),tx.taxDeduction.findFirst({where}),tx.taxCredit.findFirst({where})]);
                if(!matches.some(Boolean)) fail('El registro asociado no pertenece al ejercicio.','NOT_FOUND');
            }
        }
        return tx.taxPeriod.update({ where: { userId_id: { userId, id: input.periodId } }, data: {
                information: serializeTax(input.information) as Prisma.InputJsonValue, roundingConfirmed: input.roundingConfirmed, roundingReason: input.roundingConfirmed ? input.information.roundingReason : ''
            } });
    });
}
export async function listReturns(db: PrismaClient, userId: string, input: z.infer<typeof periodPageSchema>): Promise<{items:FiscalReturnDto[];nextCursor:string|null}> {
    await ownedPeriod(db as unknown as Prisma.TransactionClient, userId, input.periodId);
    return pageResult(await db.taxReturn.findMany({ where: { userId, periodId: input.periodId }, ...pageArgs(input) }), input.limit);
}
export async function prepareReturn(db: PrismaClient, userId: string, raw: z.input<typeof prepareSchema>): Promise<FiscalReturnDto> {
    const input = prepareSchema.parse(raw);
    return taxWrite(db, userId, scope(input, 'return.prepare'), async (tx) => {
        const data = await loadCalculationData(tx, userId, input.periodId);
        const snapshot = buildPreparation(data);
        const period = await ownedPeriod(tx, userId, input.periodId);
        const previous = await tx.taxReturn.findFirst({
            where: { userId, periodId: input.periodId }, orderBy: { version: 'desc' }, select: { version: true }
        });
        const record = await tx.taxReturn.create({ data: {
                userId, periodId: input.periodId, version: (previous?.version ?? 0) + 1, status: snapshot.status, periodRevision: period.revision, snapshot: serializeTax(snapshot) as Prisma.InputJsonValue, snapshotHash: taxHash(snapshot), ruleVersion: snapshot.ruleVersion, mappingVersion: snapshot.mappingVersion
            } });
        if (snapshot.manifest.length)
            await tx.taxReturnEvidence.createMany({ data: snapshot.manifest.map(e => ({
                    userId, returnId: record.id, evidenceId: e.id
                })) });
        return record;
    });
}
export async function closeReturn(db: PrismaClient, userId: string, raw: z.input<typeof closeSchema>): Promise<FiscalReturnDto> {
    const input = closeSchema.parse(raw);
    return taxWrite(db, userId, { ...scope(input, 'return.close'), invalidatePreparation: false }, async (tx) => {
        const record = await tx.taxReturn.findFirst({ where: {
                id: input.returnId, userId, periodId: input.periodId
            } });
        if (!record)
            fail('Borrador no disponible.', 'NOT_FOUND');
        if (record.status !== 'READY' || record.closedAt || record.periodRevision !== input.expectedRevision)
            fail('El borrador no está listo o está desactualizado.', 'CONFLICT');
        await lockFiscalRulePublication(tx);
        const current = buildPreparation(await loadCalculationData(tx, userId, input.periodId));
        const saved = record.snapshot as {
            inputHash?: string;
        };
        if (current.status !== 'READY' || current.inputHash !== saved.inputHash || taxHash(record.snapshot) !== record.snapshotHash)
            fail('Las entradas cambiaron; prepara una versión nueva.', 'CONFLICT');
        await tx.taxPeriod.update({ where: { userId_id: { userId, id: input.periodId } }, data: { status: 'CLOSED' } });
        return tx.taxReturn.update({ where: { userId_id: { userId, id: record.id } }, data: { closedAt: new Date(), revision: { increment: 1 } } });
    });
}
export async function reopenPeriod(db: PrismaClient, userId: string, raw: z.input<typeof reopenSchema>): Promise<FiscalPeriodDto> {
    const input = reopenSchema.parse(raw);
    return taxWrite(db, userId, {
        ...scope(input, 'return.reopen'), allowClosed: true, reason: input.reason
    }, async (tx) => {
        const period = await ownedPeriod(tx, userId, input.periodId);
        if (period.status !== 'CLOSED')
            fail('El ejercicio ya está abierto.', 'CONFLICT');
        // Closed return snapshots and hashes remain untouched.
        return tx.taxPeriod.update({ where: { userId_id: { userId, id: input.periodId } }, data: { status: 'OPEN' } });
    });
}
export async function reportFiled(db: PrismaClient, userId: string, raw: z.input<typeof filedSchema>): Promise<FiscalReturnDto> {
    const input = filedSchema.parse(raw);
    return taxWrite(db, userId, {
        ...scope(input, 'return.reportFiled'), allowClosed: true, invalidatePreparation: false
    }, async (tx) => {
        const record = await tx.taxReturn.findFirst({ where: {
                id: input.returnId, userId, periodId: input.periodId
            } });
        if (!record?.closedAt)
            fail('Archiva primero una versión cerrada.', 'CONFLICT');
        const profile = (record.snapshot as {
            inputs?: {
                profile?: {
                    rtn?: string;
                };
            };
        }).inputs?.profile;
        if (!profile?.rtn || profile.rtn !== input.rtn)
            fail('El RTN debe coincidir con el perfil congelado.');
        const receipt = await tx.taxEvidence.findFirst({ where: {
                id: input.receiptEvidenceId, userId, periodId: input.periodId, status: 'AVAILABLE'
            } });
        if (!receipt)
            fail('Adjunta un acuse disponible propio del ejercicio.');
        if (record.reportedFiledAt)
            fail('Esta versión ya tiene presentación declarada.', 'CONFLICT');
        await tx.taxReturnEvidence.createMany({ data: [{
                    userId, returnId: record.id, evidenceId: receipt.id
                }], skipDuplicates: true });
        // This records the user's declaration; it never contacts SAR.
        return tx.taxReturn.update({ where: { userId_id: { userId, id: record.id } }, data: {
                reportedFiledAt: new Date(input.reportedFiledAt), filingReference: input.filingReference, revision: { increment: 1 }
            } });
    });
}

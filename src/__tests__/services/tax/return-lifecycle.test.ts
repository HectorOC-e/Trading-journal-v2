import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
    profileSnapshot:{rtn:''}, revision: 2, status: 'OPEN', returns: [] as any[], preparation: {
        inputs: { profile: { rtn: '12345678901234' } }, status: 'READY', inputHash: 'stable', manifest: [{ id: '11111111-1111-4111-8111-111111111111' }], ruleVersion: 'HN-ISR-2026-v1', mappingVersion: 'labels', pending: []
    }
}));
vi.mock('@/server/services/tax/calculation-service', async (original) => ({
    ...await original<any>(), loadCalculationData: vi.fn(async () => ({})), buildPreparation: vi.fn(() => state.preparation)
}));
vi.mock('@/server/services/tax/context', () => ({ withTaxWrite: async (_db: any, _user: string, input: any, callback: any) => { if (Object.values(input.expectedRevisions)[0] !== state.revision)
        throw Error('revision'); if (state.status === 'CLOSED' && !input.allowClosed)
        throw Error('closed'); state.revision++; if (input.invalidatePreparation !== false)
        for (const r of state.returns)
            if (r.status === 'READY' && !r.closedAt)
                r.status = 'IN_REVIEW'; return callback(db); } }));
import { prepareReturn, closeReturn, reopenPeriod, reportFiled, updateInformation, refreshProfileSnapshot } from '@/server/services/tax/return-service';
const db: any = {
    taxPeriod: { findFirst: async () => ({
            id: 'p', revision: state.revision, status: state.status
        }), update: async ({ data }: any) => { if(data.status) state.status = data.status; if(data.profileSnapshot) state.profileSnapshot=data.profileSnapshot; return { status: state.status }; } }, taxReturn: {
        findFirst: async ({ where, orderBy }: any) => orderBy ? state.returns.at(-1) ?? null : state.returns.find(r => r.id === where.id && r.userId === where.userId) ?? null, create: async ({ data }: any) => { const row = { id: '22222222-2222-4222-8222-222222222222', ...data }; state.returns.push(row); return row; }, update: async ({ where, data }: any) => Object.assign(state.returns.find(r => r.id === where.userId_id.id), data), updateMany: async () => ({ count: 0 })
    }, taxReturnEvidence: { createMany: vi.fn(async () => ({ count: 1 })) }, taxProfile:{findFirst:async()=>({id:'profile',userId:'u',rtn:'12345678901234',country:'HN',domiciled:true,individualMerchant:false})}, taxEvidence: { findFirst: async () => null, findMany: async () => [] }
};
const base = {
    periodId: '33333333-3333-4333-8333-333333333333', requestId: '44444444-4444-4444-8444-444444444444', expectedRevision: 2
};
beforeEach(() => { state.profileSnapshot={rtn:''}; state.revision = 2; state.status = 'OPEN'; state.returns = []; state.preparation.status = 'READY'; state.preparation.inputHash = 'stable'; });
// The fake guard models revision-before-callback; ownership/lifecycle behavior remains real.
describe('immutable fiscal lifecycle', () => {
    it('prepares with the incremented period revision and evidence links', async () => { const r = await prepareReturn(db, 'u', base); expect(r.periodRevision).toBe(3); expect(r.version).toBe(1); expect(db.taxReturnEvidence.createMany).toHaveBeenCalled(); });
    it('closes only the exact ready revision and preserves snapshot on reopen', async () => { const r = await prepareReturn(db, 'u', base); const hash = r.snapshotHash; await closeReturn(db, 'u', {
        ...base, expectedRevision: 3, returnId: r.id
    }); expect(state.status).toBe('CLOSED'); await reopenPeriod(db, 'u', {
        ...base, expectedRevision: 4, reason: 'Corregir documento'
    }); expect(state.status).toBe('OPEN'); expect(state.returns[0].snapshotHash).toBe(hash); });
    it('saving manual information invalidates an existing ready preparation',async()=>{await prepareReturn(db,'u',base);await updateInformation(db,'u',{...base,expectedRevision:3,roundingConfirmed:false,information:{sectionB:{complete:true,nonTaxable:'0.00',nonDeductible:'0.00',relatedParties:'Ninguna'}}});expect(state.returns[0].status).toBe('IN_REVIEW');});
    it('rejects a foreign or unavailable rounding evidence reference',async()=>{await expect(updateInformation(db,'u',{...base,roundingConfirmed:true,information:{sectionB:{complete:true,nonTaxable:'0.00',nonDeductible:'0.00',relatedParties:'Ninguna'},roundingReason:'Revisado',roundingEvidenceId:'11111111-1111-4111-8111-111111111111'}})).rejects.toThrow('documentos disponibles');});
    it('refreshes a missing RTN only by explicit period write and preserves stored drafts',async()=>{const record=await prepareReturn(db,'u',base);const snapshot=JSON.stringify(record.snapshot);expect(state.profileSnapshot.rtn).toBe('');await refreshProfileSnapshot(db,'u',{...base,expectedRevision:3,reason:'RTN completado por contribuyente'});expect(state.profileSnapshot.rtn).toBe('12345678901234');expect(JSON.stringify(record.snapshot)).toBe(snapshot);expect(record.status).toBe('IN_REVIEW');});
    it('rejects profile refresh on a closed period',async()=>{state.status='CLOSED';await expect(refreshProfileSnapshot(db,'u',{...base,reason:'Actualizar RTN'})).rejects.toThrow('closed');expect(state.profileSnapshot.rtn).toBe('');});
    it('prepares a later immutable version after inputs change',async()=>{const first=await prepareReturn(db,'u',base);const hash=first.snapshotHash;state.preparation.inputHash='second-inputs';const second=await prepareReturn(db,'u',{...base,expectedRevision:3,requestId:'55555555-5555-4555-8555-555555555555'});expect(second.version).toBe(2);expect(second.snapshotHash).not.toBe(hash);expect(first.snapshotHash).toBe(hash);});
    it('rejects input drift at close', async () => { const r = await prepareReturn(db, 'u', base); state.preparation.inputHash = 'changed'; await expect(closeReturn(db, 'u', {
        ...base, expectedRevision: 3, returnId: r.id
    })).rejects.toThrow(); });
    it('rejects a foreign return', async () => { await expect(closeReturn(db, 'foreign', { ...base, returnId: '22222222-2222-4222-8222-222222222222' })).rejects.toThrow(); });
    it('requires an owned available receipt for user declared filing', async () => { const r = await prepareReturn(db, 'u', base); await closeReturn(db, 'u', {
        ...base, expectedRevision: 3, returnId: r.id
    }); await expect(reportFiled(db, 'u', {
        ...base, expectedRevision: 4, returnId: r.id, filingReference: 'RTN manual ref', rtn: '12345678901234', receiptEvidenceId: '11111111-1111-4111-8111-111111111111', reportedFiledAt: '2026-11-08T12:00:00.000Z'
    })).rejects.toThrow(); });
});

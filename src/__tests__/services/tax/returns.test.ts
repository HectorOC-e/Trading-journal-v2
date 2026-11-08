import { describe, expect, it } from 'vitest';
import { buildPreparation, informationSchema, previewCalculation } from '@/server/services/tax/calculation-service';
import { HN_ISR_2026 } from '@/domains/tax/rules/hn/2026';
const { checksum: packageChecksum, ...packagePayload } = HN_ISR_2026;
const doc = {
    id: '11111111-1111-4111-8111-111111111111', userId: 'u', periodId: 'p', status: 'AVAILABLE', name: 'proof', sha256: 'a'.repeat(64), size: 1, mime: 'application/pdf'
};
function fixture() { return {
    period: {
        id: 'p', userId: 'u', year: 2026, regime: 'NATURAL_ORDINARY', profileSnapshot: {
            rtn: '12345678901234', domiciled: true, individualMerchant: false
        }, roundingConfirmed: true, roundingReason: 'Revisión documentada', information: {
            sectionB: {
                complete: true, nonTaxable: '0', nonDeductible: '0', relatedParties: 'No existen'
            }, roundingEvidenceId: doc.id, roundingReason: 'Revisión documentada', reviews: []
        }
    }, incomes: [{
            id: 'i', userId: 'u', periodId: 'p', category: 'SALARY', payer: 'Employer', assetCode: 'HNL', amountHnl: '300000.00', grossAmount: '300000', treatment: 'ADMITTED', treatmentReason: 'Salario', legalReference: 'Ley ISR', recognitionStatus: 'REVIEWED', recognitionLegalBasis: 'Art ISR', recognitionCriterion: 'Devengo', recognitionDate: new Date('2026-01-01'), evidenceLinks: [{ evidence: doc }]
        }], deductions: [], credits: [], evidences: [doc], reversalReviewIncomeIds: [], rule: {
        published: true, version: HN_ISR_2026.version, checksum: HN_ISR_2026.checksum, payload: packagePayload
    }
}; }
describe('fiscal preparation coverage', () => {
    it('admits a supported documented salary without inventing deductions', () => { const r = buildPreparation(fixture() as never); expect(r.status).toBe('READY'); expect(r.calculation?.admittedIncome).toBe('300000.00'); expect(r.calculation?.deductions).toBe('0.00'); });
    it.each([
        'rtn', 'B', 'rounding', 'recognition', 'valuation', 'evidence', 'merchant', 'FTMO', 'reversal', 'rules'
    ])('keeps %s incomplete', key => { const f = fixture(); if (key === 'rtn')
        f.period.profileSnapshot.rtn = ''; if (key === 'B')
        f.period.information.sectionB.complete = false; if (key === 'rounding')
        f.period.roundingConfirmed = false; if (key === 'recognition')
        f.incomes[0].recognitionStatus = 'PENDING'; if (key === 'valuation')
        f.incomes[0].amountHnl = null as never; if (key === 'evidence')
        f.incomes[0].evidenceLinks = []; if (key === 'merchant')
        f.period.profileSnapshot.individualMerchant = true; if (key === 'FTMO')
        f.incomes[0].category = 'FTMO'; if (key === 'reversal')
        f.reversalReviewIncomeIds = ['i'] as never; if (key === 'rules')
        f.rule.published = false; expect(buildPreparation(f as never).status).not.toBe('READY'); });
    it('does not compute an unsupported year as zero tax', () => { const f = fixture(); f.period.year = 2027; const r = buildPreparation(f as never); expect(r.calculation).toBeNull(); expect(r.pending).toContain('RULES_UNAVAILABLE'); });
    it('accepts the published SQL package payload without an embedded checksum', () => { const f = fixture(); const { checksum, ...payload } = HN_ISR_2026; f.rule.payload = payload as never; expect(buildPreparation(f as never).status).toBe('READY'); });
    it('rejects valuation evidence that became unavailable', () => { const f = fixture(); (f.incomes[0] as any).valuation = { evidenceId: '99999999-9999-4999-8999-999999999999' }; expect(buildPreparation(f as never).status).not.toBe('READY'); });
    it('never exports private evidence storage paths', () => { const f = fixture(); (doc as any).path = 'private/user/document'; expect(JSON.stringify(buildPreparation(f as never).sources)).not.toContain('private/user/document'); });
    it('blocks a saved unreconciled source proposal', () => { const f = fixture(); (f as any).candidates = [{ id: 'candidate', status: 'PROPOSED' }]; expect(buildPreparation(f as never).pending).toContain('candidate:SOURCE_RECONCILIATION_PENDING'); });
    it('uses a verified manual deduction only after eligibility and cap review', () => { const f = fixture(); (f as any).deductions = [{
            ...f.incomes[0], id: 'd', kind: 'DEDUCTION', category: 'MEDICAL', date: new Date('2026-01-01'), amountHnl: '1000.00', admittedHnl: '1000.00', componentKey: 'medical'
        }]; const r = buildPreparation(f as never); expect(r.status).not.toBe('READY'); expect(r.calculation?.deductions).toBe('0.00'); });
    it('does not permit an unknown category merely because treatment is admitted', () => { const f = fixture(); f.incomes[0].category = 'CRYPTO_DISPOSAL'; expect(buildPreparation(f as never).pending).toContain('i:TREATMENT_AND_MAPPING_REVIEW_REQUIRED'); });
    it('admits a documentary deduction review without granting a universal allowance', () => { const f = fixture(); const id = '55555555-5555-4555-8555-555555555555'; (f as any).deductions = [{
            ...f.incomes[0], id, date: new Date('2026-01-01'), admittedHnl: '1000.00', amountHnl: '1000.00', componentKey: 'medical'
        }]; (f.period.information.reviews as any).push({
        recordId: id, kind: 'deduction', legalBasis: 'Norma documentada', reason: 'Elegibilidad individual revisada', evidenceId: doc.id, mappingLabel: 'Deducciones', eligibilityConfirmed: true, capReviewed: true
    }); const r = buildPreparation(f as never); expect(r.status).toBe('READY'); expect(r.calculation?.deductions).toBe('1000.00'); });
    it('blocks a duplicated economic credit component', () => { const f = fixture(); (f as any).credits = [{
            ...f.incomes[0], id: 'c1', componentKey: 'withheld', date: new Date('2026-01-01'), admittedHnl: '10.00', previouslyAppliedHnl: '0'
        }, {
            ...f.incomes[0], id: 'c2', componentKey: 'withheld', date: new Date('2026-01-01'), admittedHnl: '10.00', previouslyAppliedHnl: '0'
        }]; const r = buildPreparation(f as never); expect(r.pending).toContain('DUPLICATE_ECONOMIC_COMPONENT'); expect(r.status).not.toBe('READY'); });
    it('keeps scenarios read only and preserves the recorded gross amount', async () => { const f = fixture(); const db = {
        taxPeriod: { findFirst: async () => f.period }, taxIncome: { findMany: async () => f.incomes }, taxDeduction: { findMany: async () => [] }, taxCredit: { findMany: async () => [] }, taxEvidence: { findMany: async () => f.evidences }, taxReconciliation: { findMany: async () => [] }, taxImportCandidate: { findMany: async () => [] }, taxRuleSet: { findFirst: async () => f.rule }
    }; const r = await previewCalculation(db as never, 'u', { periodId: '33333333-3333-4333-8333-333333333333', simulation: { additionalIncomeHnl: '1000.00' } }); expect('simulation' in r && r.simulation?.calculation?.admittedIncome).toBe('301000.00'); expect(f.incomes[0].amountHnl).toBe('300000.00'); expect(r.status).toBe('IN_REVIEW'); });
    it('requires a documentary nature review for salary paid in tokens', () => {const f=fixture();(f.incomes[0] as any).assetKind='TOKEN';expect(buildPreparation(f as never).status).not.toBe('READY');});
    it('reports whole-preparation coverage incomplete when identification is missing',()=>{const f=fixture();f.period.profileSnapshot.rtn='';expect((buildPreparation(f as never) as any).coverage.complete).toBe(false);});
    it('requires typed manual B information', () => { expect(informationSchema.safeParse({ sectionB: { complete: true } }).success).toBe(false); });
    it('freezes actual inputs and identifies changed inputs', () => { const f = fixture(); const a = buildPreparation(f as never); f.incomes[0].amountHnl = '400000.00'; const b = buildPreparation(f as never); expect(a.inputHash).not.toBe(b.inputHash); expect(a.sources.incomes[0].amountHnl).toBe('300000.00'); });
});

import { describe, expect, it } from 'vitest';
import { buildPreparation, informationSchema, previewCalculation } from '@/server/services/tax/calculation-service';
import { HN_ISR_2026 } from '@/domains/tax/rules/hn/2026';
import { fixture, doc, ledgerTransaction } from './return-fixtures';
import { Prisma } from '@/lib/generated/prisma/client';
describe('fiscal preparation coverage', () => {
    it.each(['income', 'deduction', 'credit'])('keeps a new %s without legal basis pending instead of rejecting preparation', kind => {
        const f = fixture();
        const row = { ...f.incomes[0], id: 'unclassified', treatment: 'PENDING', legalReference: '', treatmentReason: '', date: new Date('2026-01-01'), componentKey: 'qa:unclassified', admittedHnl: null, previouslyAppliedHnl: '0', kind: kind === 'deduction' ? 'EXPENSE' : 'WITHHOLDING' };
        if (kind === 'income') f.incomes = [row] as never;
        else if (kind === 'deduction') f.deductions = [row] as never;
        else f.credits = [row] as never;
        const result = buildPreparation(f as never);
        expect(result.status).not.toBe('READY');
        expect(result.pending).toContain('unclassified:TREATMENT_PENDING');
    });

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
        taxPeriod: { findFirst: async () => f.period }, taxIncome: { findMany: async () => f.incomes }, taxDeduction: { findMany: async () => [] }, taxCredit: { findMany: async () => [] }, taxEvidence: { findMany: async () => f.evidences }, taxReconciliation: { findMany: async () => [] }, taxImportCandidate: { findMany: async () => [] }, taxTransaction:{findMany:async()=>[]},taxRuleSet: { findFirst: async () => f.rule }
    }; const r = await previewCalculation(db as never, 'u', { periodId: '33333333-3333-4333-8333-333333333333', simulation: { additionalIncomeHnl: '1000.00' } }); expect('simulation' in r && r.simulation?.calculation?.admittedIncome).toBe('301000.00'); expect(f.incomes[0].amountHnl).toBe('300000.00'); expect(r.status).toBe('IN_REVIEW'); });
    it('requires a documentary nature review for salary paid in tokens', () => {const f=fixture();(f.incomes[0] as any).assetKind='TOKEN';expect(buildPreparation(f as never).status).not.toBe('READY');});
    it('reports whole-preparation coverage incomplete when identification is missing',()=>{const f=fixture();f.period.profileSnapshot.rtn='';expect((buildPreparation(f as never) as any).coverage.complete).toBe(false);});
    it('requires typed manual B information', () => { expect(informationSchema.safeParse({ sectionB: { complete: true } }).success).toBe(false); });
    it('freezes actual inputs and identifies changed inputs', () => { const f = fixture(); const a = buildPreparation(f as never); f.incomes[0].amountHnl = '400000.00'; const b = buildPreparation(f as never); expect(a.inputHash).not.toBe(b.inputHash); expect(a.sources.incomes[0].amountHnl).toBe('300000.00'); });
});

describe('ledger preparation coverage and partial fields',()=>{
    it('blocks an independent crypto conversion without inventing income',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('CONVERSION',{postings:[{userId:'u',assetKind:'TOKEN',assetKey:'TOKEN:ETH:USDC',accountId:'a',quantity:'-10',amountHnl:'-260',account:{owned:true,userId:'u'}},{userId:'u',assetKind:'FIAT',assetKey:'FIAT:HNL',accountId:'a',quantity:'260',amountHnl:'260',account:{owned:true,userId:'u'}}]})];const r=buildPreparation(f as never);expect(r.status).not.toBe('READY');expect(r.pending).toContain('66666666-6666-4666-8666-666666666666:TRANSACTION_TREATMENT_PENDING');expect(r.calculation?.admittedIncome).toBe('300000.00');});
    it('allows a structurally valid transfer between own accounts without tax guessing',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('OWN_TRANSFER')];expect(buildPreparation(f as never).status).toBe('READY');});
    it.each(['DRAFT','OPENING_BALANCE','TOKEN_PAYMENT'])('blocks unresolved ledger event %s',kind=>{const f=fixture();(f as any).transactions=[ledgerTransaction(kind==='DRAFT'?'OWN_TRANSFER':kind==='TOKEN_PAYMENT'?'PAYMENT':kind,kind==='DRAFT'?{status:'DRAFT'}:kind==='TOKEN_PAYMENT'?{postings:[{assetKind:'TOKEN',assetKey:'TOKEN:ETH:USDC',accountId:'a',userId:'u',quantity:'-10',amountHnl:'-260',account:{owned:true,userId:'u'}}]}:{})];expect(buildPreparation(f as never).status).not.toBe('READY');});
    it('freezes independent postings in the input hash',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('OWN_TRANSFER')];const first=buildPreparation(f as never);(f as any).transactions[0].postings[0].accountId='changed';expect(buildPreparation(f as never).inputHash).not.toBe(first.inputHash);});
    it('marks derived amounts partial when FTMO is excluded and preserves the unmapped amount',()=>{const f=fixture();f.incomes.push({...f.incomes[0],id:'unknown',category:'FTMO',amountHnl:'50000.00',grossAmount:'50000'});const r=buildPreparation(f as never);for(const key of ['netTaxableIncome','isr','credits','balanceDue'])expect(r.form.fields.find(field=>field.key===key)?.partial).toBe(true);expect(r.form.fields.find(field=>field.key==='unmapped:unknown')).toMatchObject({amountHnl:'50000.00',sourceIds:['unknown'],partial:true});});
    it('does not mark an empty income group complete when mapping is unknown',()=>{const f=fixture();f.incomes[0].category='FTMO';const r=buildPreparation(f as never);expect(r.form.fields.find(field=>field.key==='salary')).toMatchObject({amountHnl:null,partial:true});});
    it('marks section B fields according to their own declared completeness',()=>{const f=fixture();f.period.information.sectionB.complete=false;const r=buildPreparation(f as never);expect(r.form.fields.find(field=>field.key==='nonTaxable')?.partial).toBe(true);});
    it('accepts an explicit documented transaction decision without deriving cost basis or income',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('CONVERSION')];(f.period.information.reviews as any).push({recordId:'66666666-6666-4666-8666-666666666666',kind:'transaction',method:'Método y trazabilidad revisados por el contribuyente',mappingLabel:'No gravables',legalBasis:'Fundamento legal documentado',reason:'Tratamiento revisado expresamente',evidenceId:doc.id});const r=buildPreparation(f as never);expect(r.status).toBe('READY');expect(r.calculation?.admittedIncome).toBe('300000.00');expect(r.manifest.map(e=>e.id)).toContain(doc.id);});
    it('does not allow a treatment review to bypass missing token valuation',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('CONVERSION',{postings:[{userId:'u',assetKind:'TOKEN',assetKey:'TOKEN:ETH:USDC',accountId:'a',quantity:'-10',amountHnl:null,valuation:null,account:{owned:true,userId:'u'}}]})];(f.period.information.reviews as any).push({recordId:'66666666-6666-4666-8666-666666666666',kind:'transaction',method:'Método revisado',mappingLabel:'No gravables',legalBasis:'Fundamento legal',reason:'Revisión humana',evidenceId:doc.id});expect(buildPreparation(f as never).pending).toContain('66666666-6666-4666-8666-666666666666:TRANSACTION_VALUATION_MISSING');});
    it('requires an existing recognized record for a taxable transaction mapping',()=>{const f=fixture();(f as any).transactions=[ledgerTransaction('CONVERSION')];(f.period.information.reviews as any).push({recordId:'66666666-6666-4666-8666-666666666666',kind:'transaction',method:'Método revisado',mappingLabel:'Otros ingresos gravables',legalBasis:'Fundamento legal',reason:'Revisión humana',evidenceId:doc.id});expect(buildPreparation(f as never).pending).toContain('66666666-6666-4666-8666-666666666666:TRANSACTION_RECOGNIZED_RECORD_REQUIRED');});
});

describe('ledger coverage precision and structure',()=>{
 it('accepts a three leg transfer conserved across own accounts',()=>{const f=fixture(); const tx=ledgerTransaction('OWN_TRANSFER'); const first=tx.postings[0]; (f as any).transactions=[{...tx,postings:[first,{...first,id:'b',accountId:'b',quantity:'4',amountHnl:'4'},{...first,id:'c',accountId:'c',quantity:'6',amountHnl:'6'}]}];expect(buildPreparation(f as never).status).toBe('READY');});
 it('accepts the minimum token quantity in a real Decimal own transfer',()=>{const f=fixture();const tx=ledgerTransaction('OWN_TRANSFER');(f as any).transactions=[{...tx,postings:tx.postings.map((p,index)=>({...p,assetKind:'TOKEN',assetKey:'token',quantity:new Prisma.Decimal(index?'0.000000000000000001':'-0.000000000000000001')}))}];expect(buildPreparation(f as never).status).toBe('READY');});
});

describe('new year preparation',()=>{
 it('returns incomplete coverage for untouched database defaults instead of throwing',()=>{const f=fixture(); f.period.roundingConfirmed=false; f.period.roundingReason=''; f.period.information={} as never; f.incomes=[]; f.evidences=[]; const result=buildPreparation(f as never); expect(result.status).toBe('IN_REVIEW'); expect(result.coverage.complete).toBe(false); expect(result.pending).toContain('ROUNDING_REVIEW_REQUIRED'); expect(result.pending).toContain('SECTION_B_INCOMPLETE'); expect(result.form.fields.find(field=>field.key==='isr')?.partial).toBe(true);});
});

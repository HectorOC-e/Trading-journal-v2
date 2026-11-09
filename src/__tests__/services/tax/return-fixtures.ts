import { HN_ISR_2026 } from '@/domains/tax/rules/hn/2026';
const { checksum: packageChecksum, ...packagePayload } = HN_ISR_2026;
export const doc = {
    id: '11111111-1111-4111-8111-111111111111', userId: 'u', periodId: 'p', status: 'AVAILABLE', name: 'proof', sha256: 'a'.repeat(64), size: 1, mime: 'application/pdf'
};
export function fixture() { return {
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
export function ledgerTransaction(kind:string, overrides:Record<string,unknown>={}) {
    const posting=(quantity:string,assetKey='FIAT:HNL',accountId='a')=>({id:quantity,userId:'u',accountId,assetKey,assetKind:assetKey.startsWith('TOKEN')?'TOKEN':'FIAT',assetCode:assetKey.startsWith('TOKEN')?'USDC':'HNL',quantity,amountHnl:quantity,valuation:null,account:{userId:'u',owned:true}});
    return {id:'66666666-6666-4666-8666-666666666666',userId:'u',periodId:'p',kind,status:'POSTED',date:new Date('2026-01-01'),postings:[posting('-10'),posting('10','FIAT:HNL','b')],evidenceLinks:[],...overrides};
}

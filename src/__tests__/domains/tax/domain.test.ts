import { describe, it, expect } from 'vitest';
import { calculateHnIsr2026, calculateTax } from '../../../domains/tax/calculation';
import { decimal, hnl } from '../../../domains/tax/decimal';
import { validatePostings, calculateBalances } from '../../../domains/tax/ledger';
import { assetSchema, valuationSchema } from '../../../domains/tax/validation';
const usdc = { kind: 'TOKEN' as const, symbol: 'USDC', network: 'ethereum', contract: '0xa0b8' };
const fiat = { kind: 'FIAT' as const, code: 'HNL' };
describe('ISR continuous marginal widths', () => {
 it.each([['0','0.00'],['228324.32','0.00'],['228324.33','0.00'],['348154.10','17974.47'],['348154.11','17974.47'],['809660.75','110275.80'],['809660.76','110275.80'],['1000000','157860.61']])('%s -> %s', (base,tax)=>expect(calculateHnIsr2026(base).tax).toBe(tax));
 it('preserves centavos and monotonic tax',()=>{expect(calculateHnIsr2026('228324.36').tax).toBe('0.01');let previous=decimal('0');for(const b of ['228324.32','348154.10','500000','809660.75','1000000']){const next=decimal(calculateHnIsr2026(b).tax);expect(next.gte(previous)).toBe(true);previous=next;}});
 it('rejects negative bases',()=>expect(()=>calculateHnIsr2026('-1')).toThrow());
});
describe('persistence boundaries',()=>{
 it.each(['1e3','NaN','Infinity','1.0000000000000000001','100000000000000000000',' 1','+1'])('rejects %s',value=>expect(()=>decimal(value)).toThrow());
 it('keeps 38/18 precision and enforces HNL 20/2',()=>{expect(decimal('99999999999999999999.999999999999999999').toString()).toBe('99999999999999999999.999999999999999999');expect(()=>hnl('1.001')).toThrow();expect(()=>hnl('1000000000000000000')).toThrow();});
 it('requires token identity and explicit rate',()=>{expect(assetSchema.safeParse({kind:'TOKEN',symbol:'USDC'}).success).toBe(false);expect(valuationSchema.safeParse({quantity:'1',base:usdc,quote:fiat}).success).toBe(false);});
});
const p=(accountId:string,quantity:string)=>({accountId,asset:usdc,quantity});
describe('signed ledger',()=>{
 it('keeps receipt 2000, own transfer 1000, payment 300 separate',()=>{const events=[{type:'EXTERNAL_RECEIPT' as const,postings:[p('binance','2000')]},{type:'OWN_TRANSFER' as const,postings:[p('binance','-1000'),p('wallet','1000')]},{type:'PAYMENT' as const,postings:[p('binance','-300')]}];events.forEach(e=>expect(()=>validatePostings(e)).not.toThrow());expect(calculateBalances(events).map(b=>b.quantity)).toEqual(['700','1000']);});
 it('rejects a transfer that creates tokens or substitutes USD',()=>{expect(()=>validatePostings({type:'OWN_TRANSFER',postings:[p('a','-1'),p('b','2')]})).toThrow();expect(()=>validatePostings({type:'OWN_TRANSFER',postings:[p('a','-1'),{accountId:'b',asset:{kind:'FIAT',code:'USD'},quantity:'1'}]})).toThrow();});
});
const input={year:2026,country:'HN' as const,regime:'NATURAL_ORDINARY' as const,ruleSetVersion:'HN-ISR-2026-v1',incomes:[{id:'i',componentId:'i',amountHnl:'1000000',treatment:'ADMITTED' as const}],deductions:[],credits:[]};
describe('coverage and credits',()=>{
 it('keeps excess credit separate from tax and refund',()=>{const r=calculateTax({...input,credits:[{id:'c',componentId:'c',amountHnl:'200000',treatment:'ADMITTED'}]});expect(r.tax).toBe('157860.61');expect(r.balanceDue).toBe('0.00');expect(r.excessCredit).toBe('42139.39');expect(r.pending).toContain('ROUNDING_REVIEW_REQUIRED');});
 it('keeps absent valuation and unknown treatment pending',()=>{const r=calculateTax({...input,incomes:[{id:'i',componentId:'i',treatment:'PENDING'}]});expect(r.coverage.complete).toBe(false);expect(r.coverage.excludedIds).toEqual(['i']);expect(r.pending).toContain('i:TREATMENT_PENDING');});
 it('never duplicates a fee or withholding component',()=>expect(()=>calculateTax({...input,deductions:[{id:'d1',componentId:'fee',amountHnl:'100',treatment:'ADMITTED'},{id:'d2',componentId:'fee',amountHnl:'100',treatment:'ADMITTED'}]})).toThrow());
 it('does not reuse 2026 rules for 2027',()=>expect(()=>calculateTax({...input,year:2027})).toThrow());
});

it('requires documented rounding confirmation to clear the blocker',()=>{expect(calculateTax({...input,roundingConfirmed:true,roundingReason:'Evidence reviewed by service'}).pending).toEqual([]);expect(()=>calculateTax({...input,roundingConfirmed:true})).toThrow();});

it('keeps valuation pending after documented rounding confirmation',()=>{const r=calculateTax({...input,roundingConfirmed:true,roundingReason:'Reviewed source',incomes:[{id:'missing',componentId:'missing',treatment:'ADMITTED'}]});expect(r.pending).toEqual(['missing:VALUATION_MISSING']);expect(r.coverage.complete).toBe(false);expect(r.coverage.excludedIds).toEqual(['missing']);});
it('rejects spending above recorded funds',()=>expect(()=>calculateBalances([{type:'PAYMENT',postings:[p('a','-1')]}])).toThrow());
it('does not mix token networks in transfers',()=>expect(()=>validatePostings({type:'OWN_TRANSFER',postings:[p('a','-1'),{...p('b','1'),asset:{...usdc,network:'polygon'}}]})).toThrow());
it('does not apply credit as deduction twice',()=>expect(()=>calculateTax({...input,deductions:[{id:'d',componentId:'retention',amountHnl:'100',treatment:'ADMITTED'}],credits:[{id:'c',componentId:'retention',amountHnl:'100',treatment:'ADMITTED'}]})).toThrow());
it('requires explicit conversion rate to reconcile legs',()=>{expect(()=>validatePostings({type:'CONVERSION',postings:[p('a','-1'),{accountId:'a',asset:fiat,quantity:'25'}]})).toThrow();expect(()=>validatePostings({type:'CONVERSION',postings:[p('a','-1'),{accountId:'a',asset:fiat,quantity:'25'}],conversionRate:'25'})).not.toThrow();});

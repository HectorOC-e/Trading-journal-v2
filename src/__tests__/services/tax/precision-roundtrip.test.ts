import {describe,it,expect} from 'vitest';
import {Prisma} from '@/lib/generated/prisma/client';
import {calculateBalances,validatePostings} from '@/domains/tax/ledger';
import {domainEvent} from '@/server/services/tax/ledger-service';
const token={kind:'TOKEN' as const,symbol:'BTC',network:'Bitcoin',contract:'native:BTC'};
describe('canonical fiscal decimal round trips',()=>{
 it('returns the smallest supported token quantity as a plain decimal string',()=>{
  expect(calculateBalances([{type:'EXTERNAL_RECEIPT',postings:[{accountId:'wallet',asset:token,quantity:'0.000000000000000001'}]}])[0].quantity).toBe('0.000000000000000001');
 });
 it('reconstructs small conversion rates using the same accepted input syntax',()=>{
  const event=domainEvent({kind:'CONVERSION',description:'QA',reversalOfId:null,postings:[{accountId:'wallet',assetKind:'FIAT',assetCode:'HNL',network:'',contract:'',quantity:new Prisma.Decimal('-1')},{accountId:'wallet',assetKind:'TOKEN',assetCode:'BTC',network:'Bitcoin',contract:'native:BTC',quantity:new Prisma.Decimal('0.000000001')}]} as any);
  expect(event.conversionRate).toBe('0.000000001');expect(()=>validatePostings(event)).not.toThrow();
 });
});

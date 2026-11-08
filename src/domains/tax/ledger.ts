import { decimal, TaxDecimal } from './decimal';
import { transactionSchema } from './validation';
import type { TaxAsset, TaxTransaction } from './types';
export function assetKey(asset:TaxAsset):string { return asset.kind==='FIAT' ? `FIAT:${asset.code}` : JSON.stringify(['TOKEN',asset.symbol,asset.network,asset.contract]); }
export function validatePostings(input:unknown):TaxTransaction {
 const event=transactionSchema.parse(input);const q=event.postings.map(p=>decimal(p.quantity));
 const positive=q.some(v=>v.gt(0));const negative=q.some(v=>v.lt(0));
 if(['EXTERNAL_RECEIPT','OPENING_BALANCE'].includes(event.type)&&negative)throw new Error('Receipt/opening must be positive');
 if(['PAYMENT','FEE'].includes(event.type)&&positive)throw new Error('Payment/fee must be negative');
 if(event.type==='OWN_TRANSFER'){
  if(event.postings.length<2||new Set(event.postings.map(p=>p.accountId)).size<2||new Set(event.postings.map(p=>assetKey(p.asset))).size!==1||!q.reduce((a,b)=>a.plus(b),new TaxDecimal(0)).isZero())throw new Error('Own transfer must conserve one asset across accounts; fees are separate events');
 }
 if(event.type==='CONVERSION'){
  if(event.postings.length!==2||!positive||!negative||new Set(event.postings.map(p=>assetKey(p.asset))).size!==2||!event.conversionRate||!decimal(event.conversionRate).gt(0))throw new Error('Conversion needs two assets and explicit positive rate');
  const out=q.find(v=>v.lt(0))!;const incoming=q.find(v=>v.gt(0))!;
  if(!out.abs().times(decimal(event.conversionRate)).eq(incoming))throw new Error('Conversion rate does not reconcile');
 }
 if(event.type==='ADJUSTMENT'&&!event.reason)throw new Error('Adjustment reason required');
 if(event.type==='REVERSAL'&&!event.reversalOf)throw new Error('Reversal source required');
 return event;
}
export function calculateBalances(events:TaxTransaction[]):{accountId:string;asset:TaxAsset;quantity:string}[]{
 const balances=new Map<string,{accountId:string;asset:TaxAsset;quantity:InstanceType<typeof TaxDecimal>}>();
 for(const event of events)for(const p of validatePostings(event).postings){const key=JSON.stringify([p.accountId,assetKey(p.asset)]);const old=balances.get(key);const quantity=(old?.quantity??new TaxDecimal(0)).plus(decimal(p.quantity));if(quantity.lt(0))throw new Error('Insufficient recorded balance');balances.set(key,{accountId:p.accountId,asset:p.asset,quantity});}
 return [...balances.values()].map(b=>({...b,quantity:b.quantity.toString()}));
}

import { decimal, hnl, money, TaxDecimal } from './decimal';
import { HN_ISR_2026 } from './rules/hn/2026';
import { calculationInputSchema } from './validation';
import type { IsrResult, TaxCalculationResult, TaxItem } from './types';
export function calculateHnIsr2026(base:string):IsrResult {
 const b=hnl(base);if(b.lt(0))throw new Error('Tax base must be nonnegative');
 let lower=new TaxDecimal(0);let total=new TaxDecimal(0);let displayed=new TaxDecimal(0);
 const brackets=HN_ISR_2026.brackets.map(({upper,rate})=>{const cap=upper===null?b:TaxDecimal.min(b,decimal(upper));const portion=TaxDecimal.max(0,cap.minus(lower));const tax=portion.times(decimal(rate));total=total.plus(tax);const result={lower:lower.toString(),upper,rate,portion:portion.toString(),tax:money(tax)};displayed=displayed.plus(result.tax);if(upper!==null)lower=decimal(upper);return result;});
 return {base:money(b),tax:money(total),brackets,roundingAdjustment:money(new TaxDecimal(money(total)).minus(displayed)),ruleVersion:HN_ISR_2026.version};
}
export function calculateTax(input:unknown):TaxCalculationResult {
 const parsed=calculationInputSchema.parse(input);if(parsed.ruleSetVersion!==HN_ISR_2026.version)throw new Error('Rules unavailable');
 const seen=new Set<string>();const pending:string[]=parsed.roundingConfirmed?[]:['ROUNDING_REVIEW_REQUIRED'];const includedIds:string[]=[];const excludedIds:string[]=[];
 const sum=(items:TaxItem[])=>items.reduce((total,item)=>{
  if(seen.has(item.componentId))throw new Error('Economic component already applied');seen.add(item.componentId);
  if(item.treatment==='PENDING'){pending.push(`${item.id}:TREATMENT_PENDING`);excludedIds.push(item.id);return total;}
  if(item.treatment!=='ADMITTED'){includedIds.push(item.id);return total;}
  if(item.amountHnl===undefined){pending.push(`${item.id}:VALUATION_MISSING`);excludedIds.push(item.id);return total;}
  includedIds.push(item.id);return total.plus(hnl(item.amountHnl));
 },new TaxDecimal(0));
 const income=sum(parsed.incomes);const deductions=sum(parsed.deductions);const credits=sum(parsed.credits);const base=TaxDecimal.max(0,income.minus(deductions));const result=calculateHnIsr2026(money(base));const difference=decimal(result.tax).minus(credits);
 return {...result,admittedIncome:money(income),deductions:money(deductions),credits:money(credits),balanceDue:money(TaxDecimal.max(0,difference)),excessCredit:money(TaxDecimal.max(0,difference.negated())),pending,coverage:{complete:pending.length===0,includedIds,excludedIds},sourceIds:[...parsed.incomes,...parsed.deductions,...parsed.credits].map(i=>i.id)};
}

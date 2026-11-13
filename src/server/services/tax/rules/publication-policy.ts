import {decimal} from '@/domains/tax/decimal';
import type {HnRuleSet} from '@/domains/tax/rules/rule-set';

export interface RuleChange {label:string;before:string|null;after:string|null;rate:string;}
function agreementNumber(rule:HnRuleSet):number|null {
 for(const ref of rule.references){const m=(ref.id+' '+ref.url).match(/sar[-\s](\d{1,4})[-\s](20\d{2})/i);if(m&&Number(m[2])===rule.year)return Number(m[1]);}
 return null;
}
export function summarizeRuleChanges(before:HnRuleSet|null,after:HnRuleSet):RuleChange[]{
 const names=['Mínimo exento','Límite del tramo 15 %','Límite del tramo 20 %'];
 return after.brackets.slice(0,3).flatMap((b,i)=>before?.brackets[i].upper===b.upper?[]:[{label:names[i],before:before?.brackets[i].upper??null,after:b.upper,rate:b.rate}]);
}
export function decideRulePublication(candidate:HnRuleSet,current:HnRuleSet|null):{status:'publish'|'unchanged'|'review_required';reasonCode?:string}{
 if(!current)return {status:'review_required',reasonCode:'BASELINE_REQUIRED'};
 if(candidate.country!==current.country||candidate.regime!==current.regime||candidate.year<current.year)return {status:'review_required',reasonCode:'RULE_SCOPE_MISMATCH'};
 const same=candidate.brackets.every((b,i)=>b.upper===current.brackets[i].upper&&b.rate===current.brackets[i].rate);
 if(candidate.year===current.year&&same)return {status:'unchanged'};
 if(candidate.year===current.year){
  const next=agreementNumber(candidate),prior=agreementNumber(current);
  if(next===null||prior===null||next<=prior)return {status:'review_required',reasonCode:'PUBLISHED_AGREEMENT_CHANGED'};
 }
 if(candidate.brackets.slice(0,3).some((b,i)=>decimal(b.upper!).lt(current.brackets[i].upper!)))return {status:'review_required',reasonCode:'THRESHOLD_REDUCTION_REQUIRES_REVIEW'};
 return {status:'publish'};
}

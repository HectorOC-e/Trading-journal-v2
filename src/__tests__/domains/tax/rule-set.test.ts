import { describe, expect, it } from 'vitest';
import { HN_ISR_2026 } from '@/domains/tax/rules/hn/2026';
import { createHnRuleSet, validateRuleSet, ruleFingerprint } from '@/domains/tax/rules/rule-set';

describe('versioned Honduras rule packages',()=>{
 it('keeps the existing 2026 payload and checksum valid',()=>{
  const {checksum,...payload}=HN_ISR_2026;
  expect(validateRuleSet(JSON.parse(JSON.stringify(payload)),checksum)).toEqual(HN_ISR_2026);
 });
 it('validates a package independently of JSONB key order',()=>{
  const {checksum,...payload}=HN_ISR_2026;
  const reversed=Object.fromEntries(Object.entries(payload).reverse());
  expect(validateRuleSet(reversed,checksum).version).toBe(HN_ISR_2026.version);
 });
 it('rejects tampered brackets and an unsupported ladder',()=>{
  const {checksum,...payload}=HN_ISR_2026;
  expect(()=>validateRuleSet({...payload,brackets:[{upper:'1.00',rate:'0'}]},checksum)).toThrow();
  expect(()=>createHnRuleSet({...payload,brackets:payload.brackets.map((b,i)=>({...b,rate:i===1?'0.16':b.rate}))})).toThrow();
 });
 it('does not make a new semantic release for a different consultation date',()=>{
  const {checksum:_,...payload}=HN_ISR_2026;
  expect(ruleFingerprint(payload)).toBe(ruleFingerprint({...payload,consultedOn:'2026-11-14'}));
 });
 it('rejects a version for another year',()=>{
  const {checksum:_,...payload}=HN_ISR_2026;
  expect(()=>createHnRuleSet({...payload,year:2027})).toThrow();
 });
});

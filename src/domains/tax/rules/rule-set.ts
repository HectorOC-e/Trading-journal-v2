import {createHash} from 'node:crypto';
import {z} from 'zod';
import {decimal,hnl} from '../decimal';

export interface HnRulePayload {
 country:'HN';year:number;regime:'NATURAL_ORDINARY';version:string;
 brackets:readonly {upper:string|null;rate:string}[];
 rounding:{mode:'HALF_UP';scale:2;reviewStatus:'PENDING'};
 references:readonly {id:string;url:string}[];
 consultedOn:string;
}
export type HnRuleSet=HnRulePayload&{checksum:string};
const officialUrl=z.url().refine(value=>{
 const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['www.sar.gob.hn','sar.gob.hn','www.tsc.gob.hn','tsc.gob.hn'].includes(u.hostname);
});
const payloadSchema=z.object({
 country:z.literal('HN'),year:z.number().int().min(2026).max(2100),regime:z.literal('NATURAL_ORDINARY'),version:z.string().min(1).max(140),
 brackets:z.array(z.object({upper:z.string().regex(/^\d+\.\d{2}$/).nullable(),rate:z.string()}).strict()).length(4),
 rounding:z.object({mode:z.literal('HALF_UP'),scale:z.literal(2),reviewStatus:z.literal('PENDING')}).strict(),
 references:z.array(z.object({id:z.string().min(1).max(160),url:officialUrl}).strict()).min(1).max(8),consultedOn:z.iso.date(),
}).strict();

function normalize(payload:unknown):HnRulePayload {
 const p=payloadSchema.parse(payload);
 if(!new RegExp(`^HN-ISR-${p.year}-(?:v\\d+|SAR-\\d+-[a-f0-9]{12})$`).test(p.version))throw Error('Rule version/year mismatch');
 const rates=['0','0.15','0.20','0.25'];let previous=decimal('0');
 for(const [i,b] of p.brackets.entries()){
  if(b.rate!==rates[i]||(i===3)!==(b.upper===null))throw Error('Unsupported progressive ladder');
  if(b.upper!==null){const upper=hnl(b.upper);if(!upper.gt(previous))throw Error('Nonincreasing brackets');previous=upper;}
 }
 return p;
}
export function createHnRuleSet(payload:unknown):HnRuleSet {
 const p=normalize(payload);
 return {...p,checksum:createHash('sha256').update(JSON.stringify(p)).digest('hex')};
}
export function validateRuleSet(payload:unknown,checksum:string):HnRuleSet {
 const p=createHnRuleSet(payload);
 if(p.checksum!==checksum)throw Error('Rule checksum mismatch');
 return p;
}
/** Consultation dates and package labels never create an economic change. */
export function ruleFingerprint(payload:HnRulePayload):string {
 const {country,year,regime,brackets,rounding,references}=normalize(payload);
 return createHash('sha256').update(JSON.stringify({country,year,regime,brackets,rounding,references})).digest('hex');
}

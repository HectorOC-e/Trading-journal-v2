import { createHash } from 'node:crypto';
import { Prisma } from '@/lib/generated/prisma/client';
export type FiscalJson=null|boolean|number|string|FiscalJson[]|{[key:string]:FiscalJson};
const calendarFields=new Set(['date','recognitionDate','documentDate','receivedDate']);
/** Serialize exact values once at the API/audit boundary, never through Number. */
export function serializeTax(value:unknown,key=''):FiscalJson{
 if(value==null)return null;
 if(Prisma.Decimal.isDecimal(value))return value.toFixed();
 if(value instanceof Date)return calendarFields.has(key)?value.toISOString().slice(0,10):value.toISOString();
 if(typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite fiscal JSON');return value;}
 if(typeof value==='bigint')return value.toString();
 if(Array.isArray(value))return value.map(v=>serializeTax(v));
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,serializeTax(v,k)]));
 throw Error('Unsupported fiscal JSON');
}
function ordered(value:FiscalJson):FiscalJson{
 if(Array.isArray(value))return value.map(ordered);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])]));
 return value;
}
export function taxHash(value:unknown):string{return createHash('sha256').update(JSON.stringify(ordered(serializeTax(value)))).digest('hex');}

import {createHash} from 'node:crypto';
import {decimal} from '@/domains/tax/decimal';
import {createHnRuleSet,type HnRulePayload,type HnRuleSet,ruleFingerprint} from '@/domains/tax/rules/rule-set';

export const SAR_INDEX='https://www.sar.gob.hn/impuesto-sobre-renta-isr/';
const MAX_BYTES=1_048_576;
export class SarSourceError extends Error {constructor(public readonly code:string){super(code);this.name='SarSourceError';}}
function fail(code:string):never {throw new SarSourceError(code);}
export function sarUrl(value:string):URL {
 let u:URL;try{u=new URL(value);}catch{return fail('SOURCE_URL_INVALID');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.search||!['www.sar.gob.hn','sar.gob.hn'].includes(u.hostname))fail('SOURCE_URL_NOT_ALLOWED');
 return u;
}
function text(value:string):string {
 return value.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')
 .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}
function norm(s:string){return text(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
function amount(value:string):string {
 const s=text(value).replace(/^L\s*/i,'').replace(/\s/g,'');
 if(!/^(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$/.test(s))return fail('TABLE_AMOUNT_AMBIGUOUS');
 return decimal(s.replace(/,/g,'')).toFixed(2);
}
export interface SarRuleCandidate {rule:HnRuleSet;agreement:string;sourceUrl:string;sourceDigest:string;semanticKey:string;}

export function parseSarRulePage(html:string,url:string,consultedOn:string):SarRuleCandidate {
 const u=sarUrl(url);
 if(Buffer.byteLength(html)>MAX_BYTES||!u.pathname.startsWith('/download/'))fail('SOURCE_PAGE_UNSUPPORTED');
 const slug=u.pathname.match(/sar-(\d{1,4})-(20\d{2})(?:-|\/|$)/i);if(!slug)fail('AGREEMENT_MISSING');
 const number=String(Number(slug[1])).padStart(2,'0'),year=Number(slug[2]),agreement=`SAR-${number}-${year}`;
 const headings=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].filter(m=>{
  const a=norm(m[1]).match(/SAR\s*[-–]\s*(\d{1,4})\s*[-–]\s*(20\d{2})/);return a&&Number(a[1])===Number(number)&&Number(a[2])===year;
 });
 if(headings.length!==1)fail('AGREEMENT_AMBIGUOUS');
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].filter(m=>/TABLA\s+PROGRESIVA\s+20\d{2}/.test(norm(m[0])));
 if(tables.length!==1)fail('TABLE_AMBIGUOUS');
 const table=tables[0];if((table.index??0)<(headings[0].index??0))fail('TABLE_OUTSIDE_AGREEMENT');
 const context=norm(html.slice(headings[0].index,(table.index??0)+table[0].length));
 const fiscalYears=[...context.matchAll(/EJERCICIO\s+FISCAL\s+(20\d{2})/g)].map(m=>Number(m[1]));
 if(!fiscalYears.length||fiscalYears.some(y=>y!==year)||!context.includes('AJUSTAR LA ESCALA DE TASAS PROGRESIVAS')||!context.includes('PERSONAS NATURALES')||!context.includes('(IPC)'))fail('ADJUSTMENT_SCOPE_REQUIRES_REVIEW');
 const tableYear=norm(table[0]).match(/TABLA\s+PROGRESIVA\s+(20\d{2})/);if(Number(tableYear?.[1])!==year)fail('TABLE_YEAR_MISMATCH');
 const rows=[...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>text(c[1])));
 const header=rows.findIndex(r=>r.length===3&&norm(r.join(' '))==='TASA DESDE HASTA');
 if(header<0||rows.length-header-1!==4)fail('TABLE_ROWS_INCOMPLETE');
 const rates=['0','0.15','0.20','0.25'];let previous=decimal('0');
 const brackets=rows.slice(header+1).map((r,i)=>{
  if(r.length!==3||(i===0?!/^EXENTOS?$/.test(norm(r[0])):norm(r[0])!==[15,20,25][i-1]+'%'))return fail('TABLE_RATE_REQUIRES_REVIEW');
  const lower=decimal(amount(r[1]));
  if(i===0?!lower.eq('0.01')&&!lower.isZero():!lower.eq(previous.plus('0.01')))fail('TABLE_GAP_OR_OVERLAP');
  const upper=i===3?(norm(r[2])==='EN ADELANTE'?null:fail('TABLE_LAST_BRACKET_INVALID')):amount(r[2]);
  if(upper!==null){if(!decimal(upper).gt(previous))fail('TABLE_LIMIT_INVALID');previous=decimal(upper);}
  return {upper,rate:rates[i]};
 });
 const payload:HnRulePayload={country:'HN',year,regime:'NATURAL_ORDINARY',version:`HN-ISR-${year}-v1`,brackets,rounding:{mode:'HALF_UP',scale:2,reviewStatus:'PENDING'},references:[{id:agreement,url:u.href}],consultedOn};
 const semanticKey=ruleFingerprint(payload);
 const rule=createHnRuleSet({...payload,version:`HN-ISR-${year}-SAR-${number}-${semanticKey.slice(0,12)}`});
 return {rule,agreement,sourceUrl:u.href,sourceDigest:createHash('sha256').update(context).digest('hex'),semanticKey};
}

export function discoverSarRulePages(html:string,now:Date):string[] {
 if(Buffer.byteLength(html)>MAX_BYTES)fail('SOURCE_TOO_LARGE');
 const result=new Set<string>(),maxYear=Number(new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:'America/Tegucigalpa'}).format(now))+1;
 for(const m of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)){
  try{const u=sarUrl(new URL(m[1].replace(/&amp;/g,'&'),SAR_INDEX).href);const a=u.pathname.match(/sar-(\d{1,4})-(20\d{2})(?:-|\/|$)/i);if(u.pathname.startsWith('/download/')&&a&&Number(a[2])>=2026&&Number(a[2])<=Math.min(2100,maxYear))result.add(u.href);}catch{/* Ignore unrelated navigation links. */}
 }
 return [...result].sort().slice(0,8);
}

/** No remote HTML execution, arbitrary redirects, unbounded streams or credentials. */
export async function fetchSarPage(url:string,fetcher:typeof fetch=fetch,deadline=Date.now()+12_000):Promise<{html:string;url:string}> {
 let current=sarUrl(url).href;
 for(let redirects=0;redirects<=3;redirects++){
  const remaining=deadline-Date.now();if(remaining<=0)fail('SOURCE_TIMEOUT');
  const response=await fetcher(current,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(Math.min(7_000,remaining)),headers:{accept:'text/html'}});
  if([301,302,303,307,308].includes(response.status)){
   const next=response.headers.get('location');await response.body?.cancel();if(!next)fail('SOURCE_REDIRECT_INVALID');current=sarUrl(new URL(next,current).href).href;continue;
  }
  if(!response.ok)fail('SOURCE_HTTP_ERROR');
  if(Number(response.headers.get('content-length')??0)>MAX_BYTES||!/^text\/html\b/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();fail('SOURCE_CONTENT_UNSUPPORTED');}
  if(!response.body)fail('SOURCE_EMPTY');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();fail('SOURCE_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
  return {html:Buffer.concat(chunks).toString('utf8'),url:current};
 }
 return fail('SOURCE_TOO_MANY_REDIRECTS');
}

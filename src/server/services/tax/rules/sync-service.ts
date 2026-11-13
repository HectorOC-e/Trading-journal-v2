import {createHash,randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@/lib/generated/prisma/client';
import {validateRuleSet,type HnRuleSet} from '@/domains/tax/rules/rule-set';
import {decideRulePublication,summarizeRuleChanges} from './publication-policy';
import {discoverSarRulePages,fetchSarPage,parseSarRulePage,SAR_INDEX,SarSourceError,type SarRuleCandidate} from './sar-source';

const STATE_ID='HN-ISR';
export interface SyncOptions {now?:Date;fetchSource?:(url:string,deadline:number)=>Promise<{html:string;url:string}>;}
export interface SyncResult {status:'checked'|'not_due'|'busy'|'error';published:number;reviewRequired:number;}
function day(now:Date){return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Tegucigalpa'}).format(now);}
function digest(value:string){return createHash('sha256').update(value).digest('hex');}

export async function publishSarCandidate(db:PrismaClient,candidate:SarRuleCandidate,now:Date){
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('HN-ISR-RULE-PUBLICATION'))`;
  const existing=await tx.taxRuleUpdate.findUnique({where:{semanticKey:candidate.semanticKey}});
  if(existing?.status==='PUBLISHED')return {published:0,reviewRequired:0};
  const prior=await tx.taxRuleSet.findFirst({where:{country:'HN',regime:'NATURAL_ORDINARY',year:{lte:candidate.rule.year},published:true},orderBy:[{year:'desc'},{createdAt:'desc'},{id:'desc'}]});
  let baseline:HnRuleSet|null=null;
  try{if(prior)baseline=validateRuleSet(prior.payload,prior.checksum);}catch{/* Invalid installed rules never authorize an update. */}
  const decision=decideRulePublication(candidate.rule,baseline);
  const common={country:'HN',regime:'NATURAL_ORDINARY',year:candidate.rule.year,sourceUrl:candidate.sourceUrl,agreement:candidate.agreement,sourceDigest:candidate.sourceDigest,changes:summarizeRuleChanges(baseline,candidate.rule) as unknown as Prisma.InputJsonValue};
  if(decision.status!=='publish'){
   const status=decision.status==='unchanged'?'UNCHANGED':'REVIEW_REQUIRED';
   await tx.taxRuleUpdate.upsert({where:{semanticKey:candidate.semanticKey},create:{...common,semanticKey:candidate.semanticKey,status,reasonCode:decision.reasonCode,ruleSetId:decision.status==='unchanged'?prior?.id:null,fanoutComplete:true},update:{status,reasonCode:decision.reasonCode}});
   return {published:0,reviewRequired:status==='REVIEW_REQUIRED'?1:0};
  }
  const {checksum,...payload}=candidate.rule;
  // Stable version identity: a repeated source check never overwrites a package.
  const already=await tx.taxRuleSet.findUnique({where:{id:candidate.rule.version}});
  if(already)throw new SarSourceError('PACKAGE_ID_CONFLICT');
  await tx.taxRuleSet.create({data:{id:candidate.rule.version,country:'HN',regime:'NATURAL_ORDINARY',year:candidate.rule.year,version:candidate.rule.version,published:true,payload:payload as unknown as Prisma.InputJsonValue,checksum,createdAt:now}});
  await tx.taxRuleUpdate.updateMany({where:{sourceUrl:candidate.sourceUrl,year:candidate.rule.year,status:'REVIEW_REQUIRED'},data:{status:'UNCHANGED',reasonCode:'SUPERSEDED_BY_VERIFIED_RELEASE'}});
  await tx.taxRuleUpdate.upsert({where:{semanticKey:candidate.semanticKey},create:{...common,semanticKey:candidate.semanticKey,status:'PUBLISHED',ruleSetId:candidate.rule.version,publishedAt:now},update:{...common,status:'PUBLISHED',ruleSetId:candidate.rule.version,publishedAt:now,fanoutComplete:false,reasonCode:null}});
  return {published:1,reviewRequired:0};
 },{timeout:12_000});
}

async function saveReview(db:PrismaClient,url:string,html:string,code:string){
 const year=Number(url.match(/sar-\d{1,4}-(20\d{2})/i)?.[1]);
 if(!year)return;
 const semanticKey='review-'+digest(url);
 await db.taxRuleUpdate.upsert({where:{semanticKey},create:{semanticKey,country:'HN',regime:'NATURAL_ORDINARY',year,status:'REVIEW_REQUIRED',sourceUrl:url,sourceDigest:digest(html),reasonCode:code,fanoutComplete:true},update:{status:'REVIEW_REQUIRED',sourceDigest:digest(html),reasonCode:code}});
}

/** Daily detection/publication. No user data is sent to or read from SAR. */
export async function syncTaxRules(db:PrismaClient,options:SyncOptions={}):Promise<SyncResult>{
 const now=options.now??new Date(),token=randomUUID();
 const state=await db.taxRuleSyncState.upsert({where:{id:STATE_ID},create:{id:STATE_ID,nextCheckAt:new Date(0)},update:{}});
 if(state.nextCheckAt>now)return {status:'not_due',published:0,reviewRequired:0};
 const claimed=await db.taxRuleSyncState.updateMany({where:{id:STATE_ID,nextCheckAt:{lte:now},OR:[{leaseUntil:null},{leaseUntil:{lte:now}}]},data:{leaseToken:token,leaseUntil:new Date(now.getTime()+120_000),lastAttemptAt:now,status:'CHECKING',reasonCode:null}});
 if(!claimed.count)return {status:'busy',published:0,reviewRequired:0};
 const fetchSource=options.fetchSource??((url,deadline)=>fetchSarPage(url,fetch,deadline));
 const deadline=Date.now()+35_000;let published=0,reviewRequired=0;
 try{
  const index=await fetchSource(SAR_INDEX,deadline),urls=discoverSarRulePages(index.html,now);
  if(!urls.length)throw new SarSourceError('DISCOVERY_EMPTY');
  for(const url of urls){
   if(Date.now()>=deadline)throw new SarSourceError('SOURCE_TIMEOUT');
   const source=await fetchSource(url,deadline);
   let candidate:SarRuleCandidate;
   try{candidate=parseSarRulePage(source.html,source.url,day(now));}
   catch(error){const code=error instanceof SarSourceError?error.code:'DOCUMENT_REQUIRES_REVIEW';await saveReview(db,url,source.html,code);reviewRequired++;continue;}
   const result=await publishSarCandidate(db,candidate,now);published+=result.published;reviewRequired+=result.reviewRequired;
  }
  await db.taxRuleSyncState.updateMany({where:{id:STATE_ID,leaseToken:token},data:{lastSuccessAt:now,nextCheckAt:new Date(now.getTime()+86_400_000),status:reviewRequired?'REVIEW_REQUIRED':'CHECKED',reasonCode:reviewRequired?'DOCUMENT_REQUIRES_REVIEW':null,leaseToken:null,leaseUntil:null}});
  return {status:'checked',published,reviewRequired};
 }catch(error){
  await db.taxRuleSyncState.updateMany({where:{id:STATE_ID,leaseToken:token},data:{nextCheckAt:new Date(now.getTime()+3_600_000),status:'SOURCE_UNAVAILABLE',reasonCode:error instanceof SarSourceError?error.code:'SOURCE_CHECK_FAILED',leaseToken:null,leaseUntil:null}});
  return {status:'error',published,reviewRequired};
 }
}

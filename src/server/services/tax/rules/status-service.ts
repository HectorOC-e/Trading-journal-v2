import {Prisma,type PrismaClient} from '@/lib/generated/prisma/client';
import {validateRuleSet} from '@/domains/tax/rules/rule-set';
import {dto} from '../profile-service';

export async function getTaxRulesStatus(db:PrismaClient,year:number){
 const rows=await db.taxRuleSet.findMany({where:{country:'HN',regime:'NATURAL_ORDINARY',published:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:300});
 const row=rows.find(r=>r.year===year);
 let active=null;
 try{if(row){const rule=validateRuleSet(row.payload,row.checksum);if(rule.year===year&&rule.version===row.version)active={version:rule.version,brackets:rule.brackets,references:rule.references,createdAt:row.createdAt};}}catch{/* Explicit unavailable state for invalid packages. */}
 try{
  const [sync,updates,pending]=await Promise.all([
   db.taxRuleSyncState.findUnique({where:{id:'HN-ISR'},select:{status:true,lastAttemptAt:true,lastSuccessAt:true,reasonCode:true}}),
   db.taxRuleUpdate.findMany({where:{country:'HN',regime:'NATURAL_ORDINARY',year,status:'PUBLISHED'},orderBy:[{publishedAt:'desc'},{id:'desc'}],take:20,select:{id:true,year:true,agreement:true,sourceUrl:true,changes:true,publishedAt:true,ruleSetId:true}}),
   db.taxRuleUpdate.count({where:{country:'HN',regime:'NATURAL_ORDINARY',year,status:'REVIEW_REQUIRED'}}),
  ]);
  return dto({year,available:active!==null,active,availableYears:[...new Set(rows.map(r=>r.year))].sort(),sync,updates,reviewRequired:pending>0});
 }catch(error){
  if(!(error instanceof Prisma.PrismaClientKnownRequestError)||!['P2021','P2022'].includes(error.code))throw error;
  return dto({year,available:active!==null,active,availableYears:[...new Set(rows.map(r=>r.year))].sort(),sync:{status:'SETUP_PENDING',lastAttemptAt:null,lastSuccessAt:null,reasonCode:null},updates:[],reviewRequired:false});
 }
}

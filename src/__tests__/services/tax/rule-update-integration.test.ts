import {afterAll,beforeEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {PrismaClient} from '@/lib/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {syncTaxRules,publishSarCandidate} from '@/server/services/tax/rules/sync-service';
import {parseSarRulePage} from '@/server/services/tax/rules/sar-source';
import {HN_ISR_2026} from '@/domains/tax/rules/hn/2026';

const url=process.env.FISCAL_TEST_DATABASE_URL;
if(url){const u=new URL(url);if(!['localhost','127.0.0.1'].includes(u.hostname)||!(u.pathname.startsWith('/fiscal_')||(process.env.FISCAL_TEST_SUPABASE_LOCAL==='1'&&u.port==='54322'&&u.pathname==='/postgres')))throw Error('Fiscal rule integration requires an explicitly isolated local database');}
const db=url?new PrismaClient({adapter:new PrismaPg({connectionString:url,max:8})}):null;
const original=readFileSync(new URL('../../fixtures/tax/sar-2026.html',import.meta.url),'utf8');
// 2097 is intentionally fictional, isolated from existing 2027-unavailable tests.
const future=original.replaceAll('2026','2097').replaceAll('228,324.32','240,000.00').replaceAll('228,324.33','240,000.01').replaceAll('348,154.10','360,000.00').replaceAll('348,154.11','360,000.01').replaceAll('809,660.75','840,000.00').replaceAll('809,660.76','840,000.01');
const page='https://www.sar.gob.hn/download/acuerdo-sar-01-2097/';
const now=new Date('2096-11-13T15:00:00Z');
const source=async(u:string)=>({url:u,html:u===page?future:`<a href="${page}">Acuerdo SAR-01-2097</a>`});
describe.skipIf(!db)('automatic rule publication on isolated PostgreSQL',()=>{
 beforeEach(async()=>{
  await db!.taxRuleDelivery.deleteMany();await db!.taxRuleUpdate.deleteMany();await db!.taxRuleSyncState.deleteMany();
  await db!.taxRuleSet.deleteMany({where:{year:2097}});
 });
 afterAll(async()=>{if(db){await db.taxRuleDelivery.deleteMany();await db.taxRuleUpdate.deleteMany();await db.taxRuleSyncState.deleteMany();await db.taxRuleSet.deleteMany({where:{year:2097}});await db.$disconnect();}});
 it('commits the verified package and publication event together',async()=>{
  const candidate=parseSarRulePage(future,page,'2096-11-13');
  expect(await publishSarCandidate(db!,candidate,now)).toEqual({published:1,reviewRequired:0});
  expect(await db!.taxRuleUpdate.count({where:{year:2097,status:'PUBLISHED'}})).toBe(1);
 });
 it('publishes a single immutable package even when runners overlap',async()=>{
  await Promise.all([syncTaxRules(db!,{now,fetchSource:source}),syncTaxRules(db!,{now,fetchSource:source})]);
  expect(await db!.taxRuleSet.count({where:{year:2097,published:true}})).toBe(1);
  expect(await db!.taxRuleUpdate.count({where:{year:2097,status:'PUBLISHED'}})).toBe(1);
  expect((await db!.taxRuleSet.findUnique({where:{id:HN_ISR_2026.version}}))?.checksum).toBe(HN_ISR_2026.checksum);
 });
 it('does not generate a release when checking the already-installed 2026 baseline',async()=>{
  const source=async(u:string)=>({url:u,html:u===HN_ISR_2026.references[0].url?original:`<a href="${HN_ISR_2026.references[0].url}">SAR-01-2026</a>`});
  const result=await syncTaxRules(db!,{now:new Date('2026-11-13T15:00:00Z'),fetchSource:source});
  expect(result.published).toBe(0);expect(await db!.taxRuleUpdate.count({where:{status:'PUBLISHED'}})).toBe(0);
 });
 it('keeps the installed package when official sources fail',async()=>{
  const result=await syncTaxRules(db!,{now,fetchSource:async()=>{throw Error('simulated source unavailable')}});
  expect(result.status).toBe('error');expect(await db!.taxRuleSet.count({where:{year:2097}})).toBe(0);
  expect((await db!.taxRuleSet.findUnique({where:{id:HN_ISR_2026.version}}))?.published).toBe(true);
 });
 it('does not republish an identical new-year table on a later daily check',async()=>{
  await syncTaxRules(db!,{now,fetchSource:source});
  await syncTaxRules(db!,{now:new Date(now.getTime()+86_400_000),fetchSource:source});
  expect(await db!.taxRuleUpdate.count({where:{year:2097,status:'PUBLISHED'}})).toBe(1);
 });
});

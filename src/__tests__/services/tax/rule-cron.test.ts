import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
vi.mock('@/lib/prisma',()=>({prisma:{}}));
vi.mock('@/server/services/tax/rules/sync-service',()=>({syncTaxRules:vi.fn()}));
vi.mock('@/server/services/tax/rules/delivery-service',()=>({deliverTaxRuleUpdates:vi.fn()}));
import {POST} from '@/app/api/cron/tax-rules/route';
import {syncTaxRules} from '@/server/services/tax/rules/sync-service';
import {deliverTaxRuleUpdates} from '@/server/services/tax/rules/delivery-service';
const request=(token?:string)=>new NextRequest('http://localhost/api/cron/tax-rules',{method:'POST',headers:token?{authorization:token}:{}});
describe('protected fiscal rule runner',()=>{
 beforeEach(()=>{vi.stubEnv('CRON_SECRET','qa-secret');vi.clearAllMocks();});
 afterEach(()=>vi.unstubAllEnvs());
 it('requires a configured secret',async()=>{vi.stubEnv('CRON_SECRET','');expect((await POST(request('Bearer qa-secret'))).status).toBe(412);expect(syncTaxRules).not.toHaveBeenCalled();});
 it.each([undefined,'Bearer wrong','qa-secret'])('rejects unauthorized invocation %s',async token=>{expect((await POST(request(token))).status).toBe(401);expect(deliverTaxRuleUpdates).not.toHaveBeenCalled();});
 it('delivers queued notices even when sources are temporarily unavailable',async()=>{
  vi.mocked(syncTaxRules).mockResolvedValue({status:'error',published:0,reviewRequired:0});vi.mocked(deliverTaxRuleUpdates).mockResolvedValue({created:1,inAppDelivered:1,emailDelivered:1});
  const response=await POST(request('Bearer qa-secret'));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({sync:{status:'error'},delivery:{emailDelivered:1}});expect(deliverTaxRuleUpdates).toHaveBeenCalledOnce();
 });
 it('returns an error when persistence is unavailable rather than claiming success',async()=>{vi.mocked(syncTaxRules).mockRejectedValue(new Error('private connection details'));const response=await POST(request('Bearer qa-secret'));expect(response.status).toBe(503);expect(await response.text()).not.toContain('private connection');});
});

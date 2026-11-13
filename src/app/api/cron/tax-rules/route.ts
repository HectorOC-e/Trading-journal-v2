import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {checkCronAuth} from '../learning-digest/route';
import {syncTaxRules} from '@/server/services/tax/rules/sync-service';
import {deliverTaxRuleUpdates} from '@/server/services/tax/rules/delivery-service';

export const dynamic='force-dynamic';
export const maxDuration=60;

/** pg_cron checks every 15 minutes; the persistent state limits SAR scans to daily. */
export async function POST(request:NextRequest){
 const auth=checkCronAuth(request.headers.get('authorization'),process.env.CRON_SECRET);
 if(auth==='unconfigured')return new NextResponse('CRON_SECRET not configured',{status:412});
 if(auth!=='ok')return new NextResponse('Unauthorized',{status:401});
 const deadline=Date.now()+50_000;
 try{
  const now=new Date();
  const sync=await syncTaxRules(prisma,{now});
  const delivery=await deliverTaxRuleUpdates(prisma,{now,deadline});
  return NextResponse.json({ok:true,sync,delivery});
 }catch{
  return NextResponse.json({ok:false,error:'Fiscal rule runner temporarily unavailable'},{status:503});
 }
}

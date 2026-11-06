import { describe, it, expect, vi } from 'vitest'
import { marketsRouter } from '@/server/trpc/routers/markets'
vi.mock('@/lib/prisma',()=>({prisma:{}}))
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}))
describe('market PATCH contracts',()=>{
 it('preserves watchlist and instrument specification when omitted',async()=>{
  const update=vi.fn(async({data})=>data)
  const caller=marketsRouter.createCaller({prisma:{market:{update}} as any,supabase:{} as any,userId:'user'})
  await caller.update({id:'550e8400-e29b-41d4-a716-446655440001',name:'Renamed'})
  expect(update.mock.calls[0][0].data).toEqual({name:'Renamed'})
 })
 it('allows explicit empty values and false',async()=>{
  const update=vi.fn(async({data})=>data)
  const caller=marketsRouter.createCaller({prisma:{market:{update}} as any,supabase:{} as any,userId:'user'})
  await caller.update({id:'550e8400-e29b-41d4-a716-446655440001',description:'',isWatchlisted:false})
  expect(update.mock.calls[0][0].data).toEqual({description:'',isWatchlisted:false})
 })
})

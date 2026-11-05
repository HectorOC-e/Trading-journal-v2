import { describe, it, expect, vi } from 'vitest'
import { notificationsRouter } from '@/server/trpc/routers/notifications'
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/server/services/email/resend-client', () => ({ sendEmail: vi.fn(), emailFailureMessage: vi.fn() }))
const timestamp = new Date('2026-11-05T00:00:00.000Z')
const row = (n: number, createdAt = timestamp) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`, createdAt, userId: 'u' })
function fixture(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({...row(count-i), preciseCreatedAt:'2026-11-05T00:00:00.123456Z'}))
  const raw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql=strings.join('?')
    expect(sql).toContain('user_id = ?::uuid')
    expect(values[0]).toBe('u')
    if(sql.includes('AND id = ?::uuid')) return rows.filter(r=>r.userId===values[0] && r.id===values[1]).map(r=>({id:r.id,createdAt:r.preciseCreatedAt}))
    expect(sql).toContain('(created_at, id) < (?::timestamptz, ?::uuid)')
    expect(sql).toContain('ORDER BY created_at DESC, id DESC')
    expect(sql).toContain('archived_at IS NULL')
    expect(sql).toContain('read_at IS NULL')
    expect(sql).toContain('category = ?::text')
    expect(sql).toContain('priority = ?::text')
    expect(sql).toContain('SS.US')
    const boundary=values[8] as string|null,id=values[9] as string|null,limit=values[10] as number
    return rows.filter(r=>r.userId===values[0] && (!boundary || r.preciseCreatedAt<boundary || (r.preciseCreatedAt===boundary && r.id<id!))).slice(0,limit).map(r=>({id:r.id,createdAt:r.preciseCreatedAt}))
  })
  const findMany=vi.fn(async ({where}:{where:{userId:string;id:{in:string[]}}})=>rows.filter(r=>r.userId===where.userId && where.id.in.includes(r.id)))
  const caller = notificationsRouter.createCaller({ prisma: { $queryRaw: raw, notification: {findMany} } as never, supabase: {} as never, userId: 'u' })
  return { rows, findMany, raw, caller }
}
describe('notification cursor pagination', () => {
  it('walks more than100 equal-timestamp notifications in deterministic unique order', async () => {
    const {rows, caller, raw}=fixture(115), ids: string[]=[]
    let cursor: string | null = null
    do {const page=await caller.list({limit:30,cursor});ids.push(...page.items.map(r=>r.id));cursor=page.nextCursor} while(cursor)
    expect(ids).toEqual(rows.map(r=>r.id));expect(new Set(ids).size).toBe(115);expect(raw).toHaveBeenCalledTimes(4)
    for(const args of raw.mock.calls) expect(args.at(-1)).toBe(31)
  })
  it('binds owner and every optional filter as SQL parameters', async () => {
    const {caller,raw}=fixture(2)
    await caller.list({limit:30,includeArchived:true,unreadOnly:true,category:'Sistema',priority:'P2'})
    expect(raw.mock.calls[0].slice(1,8)).toEqual(['u',true,false,'Sistema','Sistema','P2','P2'])
  })
  it('retains all six timestamp fractional digits in cursor and subsequent SQL boundary', async () => {
    const {caller,raw}=fixture(5)
    const page=await caller.list({limit:2})
    expect(page.nextCursor).toBe('2026-11-05T00:00:00.123456Z|'+row(4).id)
    const second=await caller.list({limit:2,cursor:page.nextCursor})
    expect(second.items.map(r=>r.id)).toEqual([row(3).id,row(2).id])
    expect(raw.mock.calls[1][9]).toBe('2026-11-05T00:00:00.123456Z')
  })
  it('continues after the last displayed row is deleted, including older timestamp rows', async () => {
    const {rows,caller,findMany}=fixture(5)
    rows[4].createdAt=new Date('2026-11-04T23:59:59.000Z');rows[4].preciseCreatedAt='2026-11-04T23:59:59.000001Z'
    const first=await caller.list({limit:2})
    rows.splice(1,1)
    const second=await caller.list({limit:2,cursor:first.nextCursor})
    expect(second.items.map(r=>r.id)).toEqual([row(3).id,row(2).id])
    const third=await caller.list({limit:2,cursor:second.nextCursor})
    expect(third.items.map(r=>r.id)).toEqual([row(1).id])
    expect(findMany.mock.calls[1][0]).not.toHaveProperty('cursor')
  })
  it('resolves legacy UUID anchors only inside the current user scope', async () => {
    const {caller,raw}=fixture(5)
    const page=await caller.list({limit:2,cursor:row(4).id})
    expect(page.items.map(r=>r.id)).toEqual([row(3).id,row(2).id])
    expect(raw.mock.calls[0].slice(1)).toEqual(['u',row(4).id])
  })
  it('reports a missing legacy anchor explicitly instead of returning a false empty page', async () => {
    await expect(fixture(2).caller.list({cursor:row(99).id})).rejects.toMatchObject({code:'BAD_REQUEST'})
  })
  it('does not resolve another user legacy boundary', async () => {
    const {rows,caller,findMany}=fixture(2)
    rows[0].userId='other-user'
    await expect(caller.list({cursor:rows[0].id})).rejects.toMatchObject({code:'BAD_REQUEST'})
    expect(findMany).not.toHaveBeenCalled()
  })
  it.each(['bad','2026-11-05|'+row(1).id,'2026-11-05T00:00:00.000Z|oops','2026-11-05T00:00:00.000Z|'+row(1).id+'|extra'])('rejects malformed cursor %s', async cursor => {
    const {caller,findMany}=fixture(2)
    await expect(caller.list({cursor})).rejects.toMatchObject({code:'BAD_REQUEST'})
    expect(findMany).not.toHaveBeenCalled()
  })
})

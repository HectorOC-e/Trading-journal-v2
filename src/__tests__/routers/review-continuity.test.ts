import { expect, it, vi } from 'vitest'
import { createReviewCommitment, planReviewPractice, loadReviewFollowUp } from '@/server/services/reviews/continuity'
const source = { kind: 'weekly' as const, weekStart: '2026-01-05', conclusion: 'Evitar revancha' }
const id = '11111111-1111-4111-8111-111111111111'
function setup(owned = true) {
 const rows: Record<string, unknown>[] = []
 const model = () => ({findFirst:vi.fn(async()=>rows[0]??null),create:vi.fn(async({data})=>{rows.push(data);return data}),findMany:vi.fn().mockResolvedValue([])})
 const p={ $queryRaw:vi.fn(), weeklyReview:{findFirst:vi.fn().mockResolvedValue(owned?{id}:null)}, learningResource:{findFirst:vi.fn().mockResolvedValue(owned?{id}:null)},commitment:model(),studySession:model(),learningPractice:model(),domainEvent:{create:vi.fn()},$transaction:vi.fn() }
 p.$transaction.mockImplementation(fn=>fn(p));return {p,rows}
}
it('creates supported verified commitment once and retains source',async()=>{const {p,rows}=setup();const input={id,source,insightType:'revenge-trading'};await createReviewCommitment(p as never,'u',input);await createReviewCommitment(p as never,'u',input);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({createdVia:'review',metricKey:'revengeTradesAfterLoss',reviewSource:source,text:'Cero trades de revancha tras una pérdida esta semana'})})
it('rejects unowned reviews and unsupported automatic verification',async()=>{await expect(createReviewCommitment(setup(false).p as never,'u',{id,source,insightType:'revenge-trading'})).rejects.toMatchObject({code:'NOT_FOUND'});await expect(createReviewCommitment(setup().p as never,'u',{id,source,insightType:'arbitrary'})).rejects.toMatchObject({code:'BAD_REQUEST'})})
it('plans once without claiming completed minutes',async()=>{const {p,rows}=setup();const input={id,source,resourceId:id,date:'2099-01-01',plannedMin:30};await planReviewPractice(p as never,'u',input);await planReviewPractice(p as never,'u',input);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({status:'planned',plannedMin:30,reviewSource:source});expect(rows[0].durationMin).toBeUndefined()})
it('loads historical source and previous week independently of today',async()=>{const {p}=setup();expect(await loadReviewFollowUp(p as never,'u','2026-01-12')).toEqual({commitments:[],plans:[],practices:[],originActions:{commitments:[],plans:[],practices:[]}});expect(p.commitment.findMany.mock.calls[0][0].where.userId).toBe('u');expect(p.commitment.findMany.mock.calls[0][0].include.checks.where.evaluatedAt.lt).toEqual(new Date('2026-01-19T00:00:00Z'))})
it('rejects idempotency UUID reuse with different conclusion',async()=>{const {p}=setup();await createReviewCommitment(p as never,'u',{id,source,insightType:'revenge-trading'});await expect(createReviewCommitment(p as never,'u',{id,source:{...source,conclusion:'Otro'},insightType:'revenge-trading'})).rejects.toMatchObject({code:'CONFLICT'})})
it('does not leak a future fulfillment into a historical review',async()=>{const {p}=setup();p.commitment.findMany.mockResolvedValue([{id,text:'Medible',status:'kept',reviewSource:source,target:0,comparator:'<=',endAt:new Date('2026-02-01'),updatedAt:new Date('2026-02-01'),checks:[]}] as never);const r=await loadReviewFollowUp(p as never,'u','2026-01-12');expect(r.commitments[0]).toMatchObject({status:'active',observedValue:null})})
it('shows a new action created after its source week in current origin actions',async()=>{const {p}=setup();p.commitment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{id,text:'Medible',status:'kept',reviewSource:source,target:0,comparator:'<=',checks:[{result:'kept',observedValue:0}],updatedAt:new Date('2026-02-01')}] as never);const r=await loadReviewFollowUp(p as never,'u','2026-01-05');expect(r.originActions.commitments[0]).toMatchObject({id,status:'kept',observedValue:0});expect(p.commitment.findMany.mock.calls[1][0].where).toEqual({userId:'u',archivedAt:null,reviewSource:{path:['weekStart'],equals:'2026-01-05'}})})
it('retains a historical completion after a later reflection-only edit',async()=>{
 const {p}=setup()
 p.studySession.findMany.mockResolvedValueOnce([{id,resourceId:id,resource:{title:'Libro'},status:'completed',source:'practice',reviewSource:source,startedAt:new Date('2026-01-13T12:00:00Z'),endedAt:new Date('2026-01-13T12:00:00Z'),updatedAt:new Date('2026-02-02'),plannedMin:30}] as never)
 const result=await loadReviewFollowUp(p as never,'u','2026-01-12')
 expect(result.plans[0].status).toBe('completed')
})

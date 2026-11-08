import { describe, it, expect } from 'vitest'
import { revisionProgressDelta } from '@/server/services/learning/session-revisions'
describe('session contribution ledger', () => {
 it('uses the actual recorded contribution after a partial adjustment', () => {
 expect(revisionProgressDelta({durationMin:30,progressTypeAtFinish:'minutes',progressUnitsApplied:10}, 'minutes', 20, false)).toBe(-10)
 })
 it('keeps sessions contribution stable when duration changes', () => {
 expect(revisionProgressDelta({durationMin:30,progressTypeAtFinish:'sessions',progressUnitsApplied:1}, 'sessions', 60, false)).toBe(0)
 })
 it('allows explicit legacy adjustment but rejects changed units', () => {
 expect(revisionProgressDelta({durationMin:30,progressTypeAtFinish:null,progressUnitsApplied:null}, 'minutes', 20, false)).toBe(-10)
 expect(() => revisionProgressDelta({durationMin:30,progressTypeAtFinish:'sessions',progressUnitsApplied:1}, 'minutes', 20, false)).toThrow()
 })
})

it('does not reinterpret a known zero contribution after an untracked unit changes', () => {
 expect(() => revisionProgressDelta({durationMin:30,progressTypeAtFinish:null,progressUnitsApplied:0}, 'minutes', 20, false)).toThrow()
})

import { vi } from 'vitest'
import { reviseSession } from '@/server/services/learning/session-revisions'
it.each([false,true])('does not independently revise or void a practice completion marker (void=%s)',async voided=>{
 const updatedAt=new Date('2026-11-02T15:00:00Z')
 const tx={ $queryRaw:vi.fn(),studySession:{findFirst:vi.fn().mockResolvedValue({id:'s',userId:'u',source:'practice',status:'completed',updatedAt,durationMin:0,note:'',revisionLog:[]}),updateMany:vi.fn().mockResolvedValue({count:1})},learningResource:{update:vi.fn()} }
 await expect(reviseSession(tx as never,'u',{id:'s',expectedUpdatedAt:updatedAt.toISOString(),adjustProgress:false,durationMin:30},voided)).rejects.toMatchObject({code:'BAD_REQUEST'})
 expect(tx.studySession.updateMany).not.toHaveBeenCalled()
 expect(tx.learningResource.update).not.toHaveBeenCalled()
})

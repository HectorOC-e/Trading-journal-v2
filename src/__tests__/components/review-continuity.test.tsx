// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ReviewContinuity} from '@/app/reviews/components/report/review-continuity'
vi.mock('@/lib/trpc/client',()=>({trpc:{weeklyReviews:{followUp:{useQuery:()=>({data:{commitments:[{id:'c',text:'Evitar revancha',status:'expired',observedValue:null,target:0,comparator:'<=',reviewSource:{kind:'weekly',weekStart:'2026-01-05',conclusion:'Evitar revancha'}}],plans:[],practices:[],originActions:{commitments:[],plans:[{id:"plan",title:"Recurso compartido",status:"planned",date:"2026-01-15",plannedMin:30,reviewSource:null}],practices:[{id:"concept",title:"Conceptual",kind:"CONCEPT",operationalMode:null,assessment:null,reviewSource:null}]}}})},createCommitment:{useMutation:()=>({})},planPractice:{useMutation:()=>({})}},learningResources:{list:{useQuery:()=>({data:[]})}},useUtils:()=>({weeklyReviews:{followUp:{invalidate:vi.fn()}}})}}))
afterEach(cleanup)
it('shows no evidence rather than success and links exact originating review',()=>{render(<ReviewContinuity weekStart="2026-01-12" initialConclusion=""/>);expect(screen.getByText('Acciones de esta review · estado actual')).toBeTruthy();expect(screen.getByText('Sin evidencia suficiente')).toBeTruthy();expect(screen.getByRole('link',{name:'Review de origen'}).getAttribute('href')).toBe('/reviews/semanal/2026-01-05?mode=REAL')})

it("identifies shared study plans and conceptual practices without attributing them to a mode",()=>{render(<ReviewContinuity weekStart="2026-01-12" initialConclusion=""/>);expect(screen.getByText("Plan de estudio compartido")).toBeTruthy();expect(screen.getByText("Práctica conceptual compartida")).toBeTruthy()})

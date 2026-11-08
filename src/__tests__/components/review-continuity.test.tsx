// @vitest-environment jsdom
import {render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {ReviewContinuity} from '@/app/reviews/components/report/review-continuity'
vi.mock('@/lib/trpc/client',()=>({trpc:{weeklyReviews:{followUp:{useQuery:()=>({data:{commitments:[{id:'c',text:'Evitar revancha',status:'expired',observedValue:null,target:0,comparator:'<=',reviewSource:{kind:'weekly',weekStart:'2026-01-05',conclusion:'Evitar revancha'}}],plans:[],practices:[],originActions:{commitments:[],plans:[],practices:[]}}})},createCommitment:{useMutation:()=>({})},planPractice:{useMutation:()=>({})}},learningResources:{list:{useQuery:()=>({data:[]})}},useUtils:()=>({weeklyReviews:{followUp:{invalidate:vi.fn()}}})}}))
it('shows no evidence rather than success and links exact originating review',()=>{render(<ReviewContinuity weekStart="2026-01-12" initialConclusion=""/>);expect(screen.getByText('Acciones de esta review · estado actual')).toBeTruthy();expect(screen.getByText('Sin evidencia suficiente')).toBeTruthy();expect(screen.getByRole('link',{name:'Review de origen'}).getAttribute('href')).toBe('/reviews/semanal/2026-01-05')})

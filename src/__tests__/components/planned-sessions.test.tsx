// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ query: { data: undefined as unknown, isLoading: false, error: null as Error | null, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetch: vi.fn() }, input: vi.fn() }))
vi.mock('@/lib/trpc/client',()=>({trpc:{studySessions:{plans:{useInfiniteQuery:(...args:unknown[])=>{state.input(...args);return state.query}}}}}))
vi.mock('@/app/aprendizaje/hooks/use-learning-calendar',()=>({useLearningCalendar:()=>({today:'2026-11-02',timezone:'America/Los_Angeles'})}))
vi.mock('@/app/aprendizaje/components/planned-session-actions',()=>({PlannedSessionActions:({plan}:{plan:{title:string,date:string}})=><button>{plan.title}: {plan.date} actions</button>}))
import { PlannedSessions } from '@/app/aprendizaje/components/planned-sessions'
const plan=(id:string,date:string)=>({id,resourceId:id,resourceTitle:`Resource ${id}`,resourceType:'LIBRO',date,plannedMin:25})
afterEach(()=>{cleanup();state.query.data=undefined;state.query.error=null;state.query.hasNextPage=false;vi.clearAllMocks()})
it('shows overdue and distant future plans with their unchanged calendar date and actions',()=>{
 state.query.data={pages:[{items:[plan('old','2026-10-01'),plan('future','2027-03-20')]}]}
 render(<PlannedSessions />)
 expect(screen.getByText('Atrasado')).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Resource old: 2026-10-01 actions'})).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Resource future: 2027-03-20 actions'})).toBeInTheDocument()
 expect(screen.getByText('20 mar 2027')).toBeInTheDocument()
})
it('loads more plans and supplies the next cursor',()=>{
 state.query.data={pages:[{items:[plan('one','2026-11-02')],nextCursor:'cursor'},{items:[plan('two','2026-11-03')]}]};state.query.hasNextPage=true
 render(<PlannedSessions />)
 expect(screen.getByText('Resource two')).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Cargar más planes'}))
 expect(state.query.fetchNextPage).toHaveBeenCalledOnce()
 expect(state.input.mock.calls[0][1].getNextPageParam({nextCursor:'cursor'})).toBe('cursor')
})
it('retries initial failures without reporting an empty agenda',()=>{
 state.query.error=new Error('offline')
 render(<PlannedSessions />)
 expect(screen.queryByText('No tienes sesiones planificadas.')).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Reintentar planes'}))
 expect(state.query.refetch).toHaveBeenCalledOnce()
})
it('keeps cached plans visible when refresh fails',()=>{
 state.query.data={pages:[{items:[plan('cached','2026-11-02')]}]};state.query.error=new Error('offline')
 render(<PlannedSessions />)
 expect(screen.getByText('Resource cached')).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Reintentar planes'})).toBeInTheDocument()
})
it('renders every returned plan beyond the old twelve row limit',()=>{
 state.query.data={pages:[{items:Array.from({length:20},(_,i)=>plan(String(i),'2026-11-02'))}]}
 render(<PlannedSessions />)
 expect(screen.getByText('Resource 19')).toBeInTheDocument()
 expect(screen.getAllByRole('button')).toHaveLength(20)
 expect(screen.queryByText('Atrasado')).not.toBeInTheDocument()
})
it('shows a clear empty state after a successful first load',()=>{
 state.query.data={pages:[{items:[],nextCursor:null}]}
 render(<PlannedSessions />)
 expect(screen.getByText('No tienes sesiones planificadas.')).toBeInTheDocument()
 expect(screen.queryByRole('button',{name:'Cargar más planes'})).not.toBeInTheDocument()
})

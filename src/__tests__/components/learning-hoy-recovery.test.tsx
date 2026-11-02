// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HoyTab } from '@/app/aprendizaje/components/hoy-tab'
const m=vi.hoisted(()=>({result:{data:undefined as unknown,isLoading:false,isError:true,isFetching:false,refetch:vi.fn()}}))
vi.mock('@/lib/trpc/client',()=>({trpc:{studySessions:{home:{useQuery:()=>m.result},completePlanned:{useMutation:()=>({mutate:vi.fn()})}},useUtils:()=>({studySessions:{invalidate:vi.fn()},learningResources:{invalidate:vi.fn()}})}}))
vi.mock('@/lib/study-session-store',()=>({useStudySessionStore:()=>({openPicker:vi.fn()})}))
vi.mock('@/app/aprendizaje/components/plan-session-modal',()=>({PlanSessionModal:()=>null}))
vi.mock('@/app/aprendizaje/components/planned-sessions',()=>({PlannedSessions:()=>null}))
vi.mock('@/app/aprendizaje/components/session-history',()=>({SessionHistory:()=>null}))
vi.mock('@/components/onboarding/spotlight-tour',()=>({SpotlightTour:()=>null}))
vi.mock('@/components/ui/motion',()=>({Stagger:({children}:{children:React.ReactNode})=><>{children}</>,StaggerItem:({children}:{children:React.ReactNode})=><>{children}</>}))
afterEach(()=>{cleanup();vi.clearAllMocks();m.result.data=undefined})
it('shows a retry action instead of an endless skeleton after home fails',()=>{render(<HoyTab onGoRepaso={vi.fn()}/>);expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo cargar/);fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));expect(m.result.refetch).toHaveBeenCalledOnce()})
it('retains cached home data and offers a retry when refresh fails',()=>{m.result.data={weekDays:[],due:[],inProgress:[],week:{goalMin:300,hoursMin:60,streak:2},agenda:[],suggestion:null,todayKey:'2026-11-01'};render(<HoyTab onGoRepaso={vi.fn()}/>);expect(screen.getByRole('alert')).toBeInTheDocument();expect(screen.getByText(/h esta semana/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));expect(m.result.refetch).toHaveBeenCalledOnce()})
it('keeps a single pending review summary instead of repeating it in the coach card',()=>{m.result.data={weekDays:[],due:[{id:'r',title:'Book',status:'MASTERED',markedForReview:true,nextReviewAt:'2026-11-10'}],inProgress:[],week:{goalMin:300,hoursMin:60,streak:2},agenda:[],suggestion:{kind:'overdue_review',title:'Repeated review summary',reason:'Repeated reason',coachPrompt:'Help'},todayKey:'2026-11-01',resourceCount:1};render(<HoyTab onGoRepaso={vi.fn()}/>);expect(screen.getByText('1 repaso pendiente')).toBeInTheDocument();expect(screen.queryByText('Repeated review summary')).not.toBeInTheDocument()})

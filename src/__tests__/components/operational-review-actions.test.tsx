// @vitest-environment jsdom
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { ReviewActions } from '@/app/reviews/components/report/review-lifecycle';
import { ReviewContinuity } from '@/app/reviews/components/report/review-continuity';
const m=vi.hoisted(()=>({save:vi.fn(),email:vi.fn(),commitment:vi.fn(),plan:vi.fn(),follow:vi.fn(),invalidate:vi.fn()}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:'BACKTEST'})}));
vi.mock('@/lib/use-toast',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/lib/trpc/client',()=>({trpc:{weeklyReviews:{saveReview:{useMutation:()=>({mutateAsync:m.save})},sendEmail:{useMutation:()=>({mutate:m.email})},followUp:{useQuery:(args:unknown)=>{m.follow(args);return {data:{commitments:[],plans:[],practices:[],originActions:{commitments:[],plans:[],practices:[]}}}}},createCommitment:{useMutation:()=>({mutateAsync:m.commitment})},planPractice:{useMutation:()=>({mutateAsync:m.plan})}},monthlyReviews:{saveReview:{useMutation:()=>({mutateAsync:m.save})},sendEmail:{useMutation:()=>({mutate:m.email})}},learningResources:{list:{useQuery:()=>({data:[{id:'resource',title:'Recurso'}]})}},useUtils:()=>({weeklyReviews:{followUp:{invalidate:m.invalidate}}})}}));
beforeEach(()=>{vi.clearAllMocks();m.save.mockResolvedValue({status:'submitted',notes:''});m.commitment.mockResolvedValue({});m.plan.mockResolvedValue({});});afterEach(cleanup);
it('finalizes and emails the selected monthly mode',async()=>{
 render(<ReviewActions period={{kind:'monthly',year:2026,month:11}} initialStatus="draft"/>);
 fireEvent.click(screen.getByRole('button',{name:'Finalizar'}));await waitFor(()=>expect(m.save).toHaveBeenCalledWith({year:2026,month:11,status:'submitted',mode:'BACKTEST'}));
 fireEvent.click(screen.getByRole('button',{name:'Enviar por correo'}));expect(m.email).toHaveBeenCalledWith({year:2026,month:11,mode:'BACKTEST'});
});
it('creates a commitment and filters its follow-up by the selected mode',async()=>{
 render(<ReviewContinuity weekStart="2026-11-09" initialConclusion="Esperar confirmación"/>);
 expect(m.follow).toHaveBeenCalledWith({weekStart:'2026-11-09',mode:'BACKTEST'});
 fireEvent.click(screen.getByRole('button',{name:'Convertir conclusión en acción'}));fireEvent.click(screen.getByRole('button',{name:'Crear acción'}));
 await waitFor(()=>expect(m.commitment).toHaveBeenCalledWith(expect.objectContaining({mode:'BACKTEST',source:{kind:'weekly',weekStart:'2026-11-09',conclusion:'Esperar confirmación'}})));
});
it('plans one shared study session with scoped operational provenance',async()=>{
 render(<ReviewContinuity weekStart="2026-11-09" initialConclusion="Esperar confirmación"/>);
 fireEvent.click(screen.getByRole('button',{name:'Convertir conclusión en acción'}));fireEvent.change(screen.getByRole('combobox',{name:'Acción'}),{target:{value:'practice'}});fireEvent.change(screen.getByRole('combobox',{name:'Recurso'}),{target:{value:'resource'}});fireEvent.click(screen.getByRole('button',{name:'Crear acción'}));
 await waitFor(()=>expect(m.plan).toHaveBeenCalledWith(expect.objectContaining({resourceId:'resource',plannedMin:30,mode:'BACKTEST'})));
});

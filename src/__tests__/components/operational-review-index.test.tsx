// @vitest-environment jsdom
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import ReviewsPage from '@/app/reviews/page';
const m=vi.hoisted(()=>({mode:'REAL',calls:{} as Record<string,unknown[]>,push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:m.push})}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:m.mode})}));
vi.mock('@/components/ui/operational-mode-selector',()=>({OperationalModeSelector:()=> <div>Modalidad seleccionada</div>}));
vi.mock('@/components/layout/top-bar',()=>({TopBar:(p:{actions:{label:string;onClick:()=>void}[]})=><div>{p.actions.map(a=><button key={a.label} onClick={a.onClick}>{a.label}</button>)}</div>}));
vi.mock('@/components/ui/confirm-dialog',()=>({ConfirmDialog:()=>null}));
vi.mock('@/app/reviews/components/trajectory-panel',()=>({TrajectoryPanel:()=>null}));
vi.mock('@/app/reviews/components/week-hero',()=>({WeekHero:()=>null}));
vi.mock('@/app/reviews/components/reviews-timeline',()=>({ReviewsTimeline:(p:{chapters:{year:number;month:number;weeks:unknown[]}[];onOpenWeek:(r:unknown)=>void;onOpenEdition:(ch:unknown)=>void})=><><button onClick={()=>p.onOpenWeek(p.chapters[0].weeks[0])}>Abrir semana</button><button onClick={()=>p.onOpenEdition(p.chapters[0])}>Abrir mes</button></>}));
vi.mock('@/app/reviews/components/reviews-rail',()=>({ReviewsRail:(p:{onFilterChange:(value:{year:number;month:number})=>void})=><button onClick={()=>p.onFilterChange({year:2026,month:10})}>Octubre</button>}));
vi.mock('@/lib/trpc/client',()=>{
 const query=(name:string,data:unknown)=>({useQuery:(args:unknown)=>{(m.calls[name]??=[]).push(args);return {data,isLoading:false}}});
 return {trpc:{weeklyReviews:{list:query('weeklyList',[{id:'w',weekStart:'2026-10-05',weekLabel:'Octubre',netPnl:100,tradeCount:1,winRate:50}]),overview:query('overview',undefined),report:query('weeklyReport',undefined),delete:{useMutation:()=>({})}},monthlyReviews:{list:query('monthlyList',[])},accounts:{list:query('accounts',[])},useUtils:()=>({})}};
});
beforeEach(()=>{m.mode='REAL';m.calls={};m.push.mockReset();});afterEach(cleanup);
it('isolates index query keys and preserves period filters and links across mode switches',()=>{
 const view=render(<ReviewsPage/>);
 expect(m.calls.weeklyList.at(-1)).toEqual({mode:'REAL'});expect(m.calls.monthlyList.at(-1)).toEqual({mode:'REAL'});
 fireEvent.click(screen.getByText('Octubre'));expect(m.calls.overview.at(-1)).toEqual({year:2026,month:10,mode:'REAL'});
 m.mode='DEMO';view.rerender(<ReviewsPage/>);expect(m.calls.overview.at(-1)).toEqual({year:2026,month:10,mode:'DEMO'});
 fireEvent.click(screen.getByText('Abrir semana'));expect(m.push).toHaveBeenLastCalledWith('/reviews/semanal/2026-10-05?mode=DEMO');
 fireEvent.click(screen.getByText('Abrir mes'));expect(m.push).toHaveBeenLastCalledWith('/reviews/mensual/2026-10?mode=DEMO');
});

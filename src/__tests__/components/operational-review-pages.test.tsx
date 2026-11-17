// @vitest-environment jsdom
import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import WeeklyPage from '@/app/reviews/semanal/[weekStart]/page';
import MonthlyPage from '@/app/reviews/mensual/[yearMonth]/page';
const m=vi.hoisted(()=>({mode:'REAL',weeklyArgs:null as unknown,monthlyArgs:null as unknown,data:{scope:{mode:'REAL',dateBasis:'TRADE_DATE'},kpis:{netPnl:100},userId:'u'}}));
vi.mock('next/navigation',()=>({useParams:()=>({weekStart:'2026-11-09',yearMonth:'2026-11'})}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:m.mode})}));
vi.mock('@/components/ui/operational-mode-selector',()=>({OperationalModeSelector:()=> <div aria-label="Modalidad">Selector</div>}));
vi.mock('@/lib/trpc/client',()=>({trpc:{weeklyReviews:{report:{useQuery:(args:unknown)=>{m.weeklyArgs=args;return {data:m.data,isLoading:false}}}},monthlyReviews:{report:{useQuery:(args:unknown)=>{m.monthlyArgs=args;return {data:m.data,isLoading:false}}}}}}));
vi.mock('@/app/reviews/components/report/view-model',()=>({weeklyToVM:(r:unknown)=>({...r as object,ai:{analysis:null,at:null},notes:'Notas compartidas',status:'draft'}),monthlyToVM:(r:unknown)=>({...r as object,ai:{analysis:null,at:null},notes:'Notas compartidas',status:'draft'})}));
vi.mock('@/app/reviews/components/report/review-report-shell',()=>({ReviewReportShell:(p:{vm:{kpis:{netPnl:number}};notesSlot:unknown})=><div>Resultado {p.vm.kpis.netPnl}</div>}));
vi.mock('@/app/reviews/components/report/ai-analysis-card',()=>({AiAnalysisCard:()=>null}));
vi.mock('@/app/reviews/components/report/review-lifecycle',()=>({ReviewActions:()=>null,ReviewNotes:()=>null}));
vi.mock('@/app/reviews/components/report/review-continuity',()=>({ReviewContinuity:()=>null}));
vi.mock('@/app/reviews/components/report/learning-summary',()=>({LearningSummary:()=>null}));
vi.mock('@/app/reviews/components/report/monthly-letter',()=>({MonthlyLetter:()=>null}));
beforeEach(()=>{m.mode='REAL';m.data.scope.mode='REAL';});afterEach(cleanup);
it('scopes weekly report and hides a previous-mode response during switching',()=>{
 const view=render(<WeeklyPage/>);expect(m.weeklyArgs).toEqual({weekStart:'2026-11-09',mode:'REAL'});expect(screen.getByText('Resultado 100')).toBeTruthy();
 m.mode='BACKTEST';view.rerender(<WeeklyPage/>);expect(m.weeklyArgs).toEqual({weekStart:'2026-11-09',mode:'BACKTEST'});expect(screen.queryByText('Resultado 100')).toBeNull();expect(screen.getByLabelText('Modalidad')).toBeTruthy();
});
it('scopes monthly report and keeps its selector available while another mode loads',()=>{
 const view=render(<MonthlyPage/>);expect(m.monthlyArgs).toEqual({year:2026,month:11,mode:'REAL'});
 m.mode='DEMO';view.rerender(<MonthlyPage/>);expect(m.monthlyArgs).toEqual({year:2026,month:11,mode:'DEMO'});expect(screen.queryByText('Resultado 100')).toBeNull();expect(screen.getByLabelText('Modalidad')).toBeTruthy();
});

// @vitest-environment jsdom
import { cleanup,fireEvent,render,screen,act,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { AiAnalysisCard } from '@/app/reviews/components/report/ai-analysis-card';
import { DownloadPdfButton } from '@/app/reviews/components/report/download-pdf-button';
import { MonthlyLetter } from '@/app/reviews/components/report/monthly-letter';
const m=vi.hoisted(()=>({mode:'REAL',weekly:[] as {args:unknown;success:(res:unknown)=>void}[],insights:[] as unknown[],assigned:vi.fn(),removed:vi.fn(),status:vi.fn(),added:vi.fn(),carry:vi.fn(),invalidate:vi.fn()}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:m.mode})}));
vi.mock('@/lib/use-toast',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/lib/trpc/client',()=>({trpc:{
 weeklyReviews:{generateAnalysis:{useMutation:(options:{onSuccess:(res:unknown)=>void})=>({mutate:(args:unknown)=>m.weekly.push({args,success:options.onSuccess})})},insights:{useQuery:(args:unknown)=>{m.insights.push(args);return {data:[]}}}},
 monthlyReviews:{generateAnalysis:{useMutation:()=>({})},insights:{useQuery:()=>({data:[]})}},
 monthlyGoals:{carryForward:{useMutation:()=>({mutate:m.carry})},add:{useMutation:()=>({mutate:m.added})},setStatus:{useMutation:()=>({mutate:m.status})},remove:{useMutation:()=>({mutate:m.removed})},unclassified:{useQuery:()=>({data:[{id:'legacy',text:'Objetivo histórico',status:'done'}]})},assignMode:{useMutation:()=>({mutate:m.assigned})}},
 useUtils:()=>({weeklyReviews:{report:{invalidate:m.invalidate}},monthlyReviews:{report:{invalidate:m.invalidate},list:{invalidate:m.invalidate}},monthlyGoals:{unclassified:{invalidate:m.invalidate}}})
}}));
beforeEach(()=>{m.mode='REAL';m.weekly=[];m.insights=[];vi.clearAllMocks();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('keeps a slow previous-mode analysis out of the selected mode and scopes insights/generation',async()=>{
 const props={period:{kind:'weekly' as const,weekStart:'2026-11-09'},initial:{analysis:null,at:null}};
 const view=render(<AiAnalysisCard {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Generar análisis'}));
 expect(m.weekly[0].args).toEqual({weekStart:'2026-11-09',mode:'REAL'});
 m.mode='BACKTEST';view.rerender(<AiAnalysisCard {...props} initial={{analysis:'Evidencia Backtesting',at:null}}/>);
 await act(async()=>m.weekly[0].success({analysis:'Respuesta tardía Real',at:'2026-11-16T00:00:00Z'}));
 expect(screen.getByText('Evidencia Backtesting')).toBeTruthy();expect(screen.queryByText('Respuesta tardía Real')).toBeNull();
 expect(m.insights.at(-1)).toEqual({weekStart:'2026-11-09',mode:'BACKTEST'});
});
it('includes the selected mode in PDF downloads',async()=>{
 m.mode='DEMO';vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:500})));
 render(<DownloadPdfButton kind="monthly" period="2026-11"/>);fireEvent.click(screen.getByRole('button',{name:'Descargar PDF'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/reviews/pdf?type=monthly&period=2026-11&mode=DEMO'));
});
it('scopes monthly goals and explicitly assigns legacy goals without counting them as current progress',()=>{
 m.mode='BACKTEST';
 const data={baseCurrency:'USD',letterTitle:'Carta',verdict:'Sin mezclar muestras',pillars:{overall:60,performance:60,discipline:60,psychology:60},kpis:{disciplineScore:60,winRate:50,netPnl:0,profitFactor:1,trades:0},weekTrend:[],themes:[],goals:[{id:'current',text:'Esperar confirmación',status:'pending',note:'',userConfirmed:true}]} as never;
 render(<MonthlyLetter data={data} year={2026} month={11} monthLabel="Noviembre 2026"/>);
 expect(screen.getByText('0%')).toBeTruthy();expect(screen.getByText('Objetivo histórico')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Asignar.*Backtesting/}));expect(m.assigned).toHaveBeenCalledWith({id:'legacy',mode:'BACKTEST'});
 fireEvent.click(screen.getByRole('button',{name:'Cambiar estado'}));expect(m.status).toHaveBeenCalledWith({id:'current',status:'done',mode:'BACKTEST'});
 fireEvent.click(screen.getByRole('button',{name:'Quitar'}));expect(m.removed).toHaveBeenCalledWith({id:'current',mode:'BACKTEST'});
});

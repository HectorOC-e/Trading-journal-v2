// @vitest-environment jsdom
import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { ReviewCard } from '@/app/reviews/components/review-card';
import { EditionHeader } from '@/app/reviews/components/edition-header';
import { TrajectoryPanel } from '@/app/reviews/components/trajectory-panel';
import { PeriodSummary } from '@/app/reviews/components/period-summary';
import { WeekHero } from '@/app/reviews/components/week-hero';
const m=vi.hoisted(()=>({currency:'EUR',amounts:[] as number[]}));
vi.mock('@/hooks/useCurrency',()=>({useCurrency:()=>({baseCurrency:m.currency,symbol:m.currency==='EUR'?'€':'L',formatAmount:(amount:number,opts?:{showSign?:boolean;decimals?:number})=>{m.amounts.push(amount);return `${amount<0?'-':opts?.showSign?'+':''}${m.currency==='EUR'?'€':'L'}${Math.abs(amount).toFixed(opts?.decimals??2)}`;}})}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:'REAL'})}));
vi.mock('@/app/reviews/components/card-equity-chart',()=>({CardEquityChart:(p:{money:(n:number)=>string})=><span>Gráfico {p.money(100)}</span>}));
afterEach(cleanup);beforeEach(()=>{m.currency='EUR';m.amounts=[];});
const review={id:'r',status:'draft',weekLabel:'Semana',weekRange:'1–7',tradeCount:1,netPnl:100,winRate:50,disciplineScore:null,profitFactor:1,avgR:1,aiAnalysis:null,whatWorked:'',toImprove:'',spark:[50,100],accountId:null} as never;
it.each(['EUR','HNL'])('formats card and chart already-normalized values in %s without converting again',currency=>{
 m.currency=currency;render(<ReviewCard review={review} onOpen={vi.fn()} onDelete={vi.fn()} accountName={()=>'Cuenta'}/>);
 expect(screen.getByText(`P&L · ${currency}`)).toBeTruthy();expect(screen.getAllByText(new RegExp(`${currency==='EUR'?'€':'L'}100`)).length).toBeGreaterThan(0);expect(document.body.textContent).not.toContain('$100');expect(m.amounts).toContain(100);expect(m.amounts).not.toContain(108);
});
it('labels manual chips as shared notes even when the selected mode has no trades',()=>{
 render(<ReviewCard review={{...review as object,tradeCount:0,whatWorked:'Esperar confirmación',toImprove:'Evitar impulso'} as never} onOpen={vi.fn()} onDelete={vi.fn()} accountName={()=>'Cuenta'}/>);
 expect(screen.getByText('Notas compartidas')).toBeTruthy();expect(screen.getByText('Esperar confirmación')).toBeTruthy();
});
it.each(['EUR','HNL'])('formats edition, period summary and trajectory P&L in %s',currency=>{
 m.currency=currency;
 const edition={monthShort:'Octubre',year:2026,gradeLetter:'B',gradeTone:'mid',current:false,net:100,deltaPnl:20,weekPnls:[100],goalsPct:0,verdict:''} as const;
 const view=render(<EditionHeader data={{...edition,weekPnls:[100]}} onOpen={vi.fn()}/>);expect(screen.getByText(`P&L · ${currency}`)).toBeTruthy();expect(document.body.textContent).not.toContain('$');view.unmount();
 const summary={weeks:1,greenStreak:1,best:{label:'S1',net:100},worst:{label:'S1',net:100}};
 const next=render(<PeriodSummary summary={summary}/>);expect(screen.getByText(`Importes en ${currency}`)).toBeTruthy();expect(document.body.textContent).not.toContain('$');next.unmount();
 const overview={weeksCount:2,headline:'Trayectoria',trendDeltaText:null,trendPositive:true,sub:'Dos meses',scores:[60,65],months:['Oct','Nov'],beads:[{weekStart:'2026-10-05',label:'S1',grade:'B',tone:'mid',score:60,net:100,winRate:50},{weekStart:'2026-11-02',label:'S2',grade:'B',tone:'mid',score:65,net:120,winRate:50}],stats:[{label:'P&L mensual',from:'+$100',to:'+$120',deltaText:'▲ +$20',positive:true}],patterns:[],summary} as never;
 render(<TrajectoryPanel data={overview} isLoading={false}/>);expect(screen.getByText(`Importes en ${currency}`)).toBeTruthy();expect(document.body.textContent).not.toContain('$');expect(m.amounts).toContain(120);
});
it('uses the same base currency label and amount formatter in the live hero',()=>{
 m.currency='HNL';const report={scope:{mode:'REAL'},baseCurrency:'HNL',kpis:{netPnl:100,trades:1,winRate:50,disciplineScore:null},analytics:{avgR:1},dayTrend:[{pnl:100}],ai:{analysis:null},weekLabel:'Semana'} as never;
 render(<WeekHero data={report} weekStart="2026-11-09" isLoading={false}/>);expect(screen.getByText('P&L · HNL')).toBeTruthy();expect(screen.getByText('+L100')).toBeTruthy();
});

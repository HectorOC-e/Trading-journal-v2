// @vitest-environment jsdom
import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { ReviewReportShell } from '@/app/reviews/components/report/review-report-shell';
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:(s:{mode:string})=>unknown)=>selector({mode:'DEMO'})}));
vi.mock('@/app/reviews/components/report/download-pdf-button',()=>({DownloadPdfButton:()=>null}));
vi.mock('@/app/reviews/components/report/charts',()=>({PnlTrendChart:()=>null,EquityCurveChart:()=>null}));
vi.mock('@/app/reviews/components/report/sections',()=>({KpiGrid:()=>null,ExtraKpis:()=>null,DayExtremes:()=>null,DisciplinePanel:()=>null,SetupBreakdown:()=>null,SessionBreakdown:()=>null,MarketsBreakdown:()=>null,PsychologyPanel:()=>null,AccountBreakdown:()=>null,NarrativeCard:()=>null}));
afterEach(cleanup);
const vm={baseCurrency:'EUR',backHref:'/reviews',kind:'weekly',printPeriod:'2026-11-09',title:'Reporte',subtitle:'Una muestra',kpis:{trades:0},trend:{eyebrow:'Tendencia',points:[]},analytics:{},narrative:null} as never;
it('identifies a partial monetary report and names currencies excluded for missing exchange rates',()=>{
 render(<ReviewReportShell vm={vm} excludedCurrencies={['HNL','JPY']}/>);
 expect(screen.getByRole('alert').textContent).toMatch(/incompletos/i);expect(screen.getByRole('alert').textContent).toContain('HNL, JPY');expect(screen.getByRole('alert').textContent).toContain('tipo de cambio');
});

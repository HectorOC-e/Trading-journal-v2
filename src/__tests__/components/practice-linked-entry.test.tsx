// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import { PracticeModal } from '@/app/aprendizaje/modals/practice-modal';
const m=vi.hoisted(()=>({mode:'BACKTEST',create:vi.fn(),picker:null as any}));
vi.mock('@/lib/operational-mode-store',()=>({useOperationalMode:(selector:any)=>selector({mode:m.mode})}));
vi.mock('@/app/aprendizaje/components/practice-trade-picker',()=>({PracticeTradePicker:(props:any)=>{m.picker=props;return <div>Operaciones seleccionadas: {props.links.length}</div>}}));
vi.mock('@/lib/trpc/client',()=>({trpc:{learningResources:{list:{useQuery:()=>({data:[]})}},learningPractices:{create:{useMutation:()=>({mutateAsync:m.create})},update:{useMutation:()=>({})},delete:{useMutation:()=>({})},feedback:{useMutation:()=>({})},suggestExercise:{useMutation:()=>({})}},useUtils:()=>({})}}));
const tradeId='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{m.mode='BACKTEST';m.create.mockReset();m.create.mockImplementation(async(input:any)=>({...input,version:2,date:input.date,attachments:[],feedback:[],tradeLinks:[]}));});
afterEach(cleanup);
it('starts linked backtests on the real effort day with no automatic minutes and saves one declared duration',async()=>{
 render(<PracticeModal record={null} today="2026-11-16" initialTradeIds={[tradeId]} onClose={vi.fn()} onChanged={vi.fn()}/>);
 expect(screen.getByLabelText(/Fecha efectiva/)).toHaveValue('2026-11-16');expect(screen.getByRole('spinbutton')).toHaveValue(null);
 expect(m.picker.links).toEqual([{tradeId,role:'EXECUTED'}]);
 fireEvent.change(screen.getByRole('textbox',{name:'Qué practicaste'}),{target:{value:'Replay'}});fireEvent.change(screen.getByRole('textbox',{name:'Qué hiciste'}),{target:{value:'Tres confirmaciones'}});fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'45'}});
 fireEvent.click(screen.getByRole('button',{name:'Guardar práctica'}));
 await waitFor(()=>expect(m.create).toHaveBeenCalledWith(expect.objectContaining({kind:'EXECUTION',operationalMode:'BACKTEST',durationMin:45,links:[{tradeId,role:'EXECUTED'}]})));
});
it('uses real operations as reviewed evidence and conceptual selection removes links',()=>{
 m.mode='REAL';render(<PracticeModal record={null} today="2026-11-16" initialTradeIds={[tradeId]} onClose={vi.fn()} onChanged={vi.fn()}/>);
 expect(screen.getByLabelText('Tipo de práctica')).toHaveValue('REVIEW');expect(m.picker.links).toEqual([{tradeId,role:'REVIEWED'}]);
 expect(screen.getByRole('option',{name:'Ejecución Demo / Backtesting'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Tipo de práctica'),{target:{value:'CONCEPT'}});expect(screen.queryByText('Operaciones seleccionadas: 1')).toBeNull();
});

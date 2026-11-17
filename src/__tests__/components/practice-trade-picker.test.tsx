// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { PracticeTradePicker } from '@/app/aprendizaje/components/practice-trade-picker';
const m=vi.hoisted(()=>({args:null as any}));
vi.mock('@/lib/trpc/client', () => ({
  trpc: { learningPractices: { tradeCandidates: {
    useInfiniteQuery: (args: unknown) => {
      m.args = args;
      return { data: { pages: [{ items: [{ id: 'a', symbol: 'EURUSD', date: '2024-01-01', status: 'CLOSED', operationalMode: 'BACKTEST', practiceLinks: [] }] }] }, hasNextPage: false };
    },
  } } },
}));
afterEach(cleanup);
it('searches only the practice mode, labels market dates and adds evidence without assigning minutes',()=>{
 const changed=vi.fn();render(<PracticeTradePicker mode="BACKTEST" kind="EXECUTION" links={[]} onChange={changed}/>);
 expect(m.args).toMatchObject({mode:'BACKTEST'});
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'EUR'}});expect(m.args.search).toBe('EUR');
 fireEvent.click(screen.getByRole('checkbox',{name:/EURUSD/}));
 expect(changed).toHaveBeenCalledWith([{tradeId:'a',role:'EXECUTED'}]);
 expect(screen.getByText(/2024-01-01/)).toBeTruthy();
});

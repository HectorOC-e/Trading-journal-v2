import { describe,expect,it,vi } from 'vitest';
import { getResourceTransfer,getErrorCards } from '@/server/services/learning/learning-insights-service';
function db() { return { learningResource:{findFirst:vi.fn(async()=>({date:new Date('2024-01-01'),linkedSetups:[{id:'s'}],studySessions:[],reviews:[]}))}, trade:{findMany:vi.fn(async()=>[])}, account:{findFirst:vi.fn()} } as any; }
describe('educational chronology',()=>{
  it('does not infer real study from resource creation/date',async()=>{
    const p=db();const result=await getResourceTransfer(p,'u','r','REAL');
    expect(result?.transfer.label).toBe('insufficient');expect(p.trade.findMany).not.toHaveBeenCalled();
  });
  it('isolates error costs before reading trades',async()=>{
    const p=db(); await getErrorCards(p,'u','BACKTEST');
    expect(p.trade.findMany.mock.calls[0][0].where).toMatchObject({userId:'u',operationalMode:'BACKTEST'});
  });
  it('orders simulated transfer by the unique EXECUTED practice date and omits undated or reviewed evidence',async()=>{
    const p=db();p.learningResource.findFirst.mockResolvedValue({date:new Date('2024-01-01'),linkedSetups:[{id:'s'}],studySessions:[{endedAt:new Date('2026-11-10')}],reviews:[]});
    p.trade.findMany.mockResolvedValue([
      {date:new Date('2024-01-01'),rMultiple:-1,practiceLinks:[{role:'EXECUTED',practice:{date:new Date('2026-11-09')}}]},
      {date:new Date('2024-01-01'),rMultiple:2,practiceLinks:[{role:'EXECUTED',practice:{date:new Date('2026-11-11')}}]},
      {date:new Date('2024-01-01'),rMultiple:50,practiceLinks:[]},
    ]);
    const result=await getResourceTransfer(p,'u','r','BACKTEST');
    expect(result?.transfer).toMatchObject({nBefore:1,nAfter:1,beforeAvgR:-1,afterAvgR:2});
    expect(p.trade.findMany.mock.calls[0][0].where).toMatchObject({operationalMode:'BACKTEST'});
  });
});
